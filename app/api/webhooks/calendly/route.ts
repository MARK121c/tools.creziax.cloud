import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMeetingBriefing } from '@/lib/gemini';
import { sendTelegramNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Calendly payload structure or Cal.com payload
    const event = payload.event || payload.triggerEvent || 'invitee.created';
    const inviteeEmail = 
      payload.payload?.email || 
      payload.payload?.invitee?.email || 
      payload.data?.payload?.attendees?.[0]?.email ||
      payload.email;
    const inviteeName = 
      payload.payload?.name || 
      payload.payload?.invitee?.name || 
      payload.data?.payload?.attendees?.[0]?.name ||
      payload.name ||
      'عميل جديد';
    const eventStartTime = 
      payload.payload?.event?.start_time || 
      payload.payload?.scheduled_event?.start_time || 
      payload.data?.payload?.startTime;

    if (!inviteeEmail) {
      return NextResponse.json({ message: 'No email found in webhook payload' }, { status: 200 });
    }

    // Match lead by email in our database
    let lead = await prisma.lead.findFirst({
      where: {
        email: {
          contains: inviteeEmail.trim(),
        },
      },
      include: {
        pitches: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
        },
      },
    });

    // If no lead found, create a new captured lead
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          channelId: `cal_guest_${Date.now()}`,
          channelName: inviteeName,
          channelUrl: 'https://youtube.com',
          email: inviteeEmail,
          status: 'meeting_booked',
          score: 100,
          notes: 'تم حجز الموعد تلقائياً عبر رابط Calendly / Cal.com',
        },
        include: {
          pitches: true,
        },
      });
    } else {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'meeting_booked',
          score: 95,
        },
      });
    }

    // Generate AI intelligence brief
    const briefingResult = await generateMeetingBriefing({
      channelName: lead.channelName,
      niche: lead.niche,
      subscriberCount: lead.subscriberCount,
      description: lead.description,
      pitchSent: lead.pitches[0]?.body || null,
      guestName: inviteeName,
      guestEmail: inviteeEmail,
    });

    // Save briefing dossier to SQLite
    const brief = await prisma.meetingBrief.create({
      data: {
        leadId: lead.id,
        guestName: inviteeName,
        guestEmail: inviteeEmail,
        channelNiche: lead.niche || 'صناعة محتوى',
        meetingDate: eventStartTime ? new Date(eventStartTime) : new Date(),
        briefingText: briefingResult.briefingText,
        recommendedPrice: briefingResult.recommendedPrice,
        strategyNotes: briefingResult.strategyNotes,
      },
    });

    // Dispatch real-time Telegram notification to the agency owner
    const tgResult = await sendTelegramNotification({
      title: '🎉 موعد مكالمة استكشافية جديد محجوز!',
      leadName: `${inviteeName} (${lead.channelName})`,
      channelUrl: lead.channelUrl,
      niche: lead.niche || 'عام',
      subscriberCount: lead.subscriberCount,
      meetingDate: eventStartTime ? new Date(eventStartTime).toLocaleString('ar-EG') : 'قريباً',
      briefingText: briefingResult.briefingText,
      recommendedPrice: briefingResult.recommendedPrice,
      strategyNotes: briefingResult.strategyNotes,
    });

    if (tgResult.success) {
      await prisma.meetingBrief.update({
        where: { id: brief.id },
        data: { sentToTelegram: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting processed, brief created and notification dispatched',
      briefId: brief.id,
    });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
