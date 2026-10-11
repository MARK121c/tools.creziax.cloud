import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMeetingBriefing } from '@/lib/gemini';
import { sendTelegramNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const briefs = await prisma.meetingBrief.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          include: {
            pitches: {
              orderBy: { generatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json({ briefs });
  } catch (error: any) {
    console.error('Error fetching briefs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch briefs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, guestName, guestEmail, meetingDate } = body;

    let lead = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          pitches: {
            orderBy: { generatedAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    const channelName = lead?.channelName || guestName || 'عميل جديد';
    const niche = lead?.niche || 'صناعة محتوى';
    const subscriberCount = lead?.subscriberCount || 0;
    const description = lead?.description || '';
    const pitchSent = lead?.pitches?.[0]?.body || null;

    const briefingResult = await generateMeetingBriefing({
      channelName,
      niche,
      subscriberCount,
      description,
      pitchSent,
      guestName: guestName || lead?.channelName,
      guestEmail: guestEmail || lead?.email,
    });

    const brief = await prisma.meetingBrief.create({
      data: {
        leadId: lead?.id || null,
        guestName: guestName || lead?.channelName || 'عميل جديد',
        guestEmail: guestEmail || lead?.email || null,
        channelNiche: niche,
        meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
        briefingText: briefingResult.briefingText,
        recommendedPrice: briefingResult.recommendedPrice,
        strategyNotes: briefingResult.strategyNotes,
      },
    });

    // Try Telegram Notification
    const tgResult = await sendTelegramNotification({
      title: '📋 ملف إحاطة لاجتماع قادم (Meeting Intelligence)',
      leadName: channelName,
      channelUrl: lead?.channelUrl,
      niche,
      subscriberCount,
      meetingDate: meetingDate ? new Date(meetingDate).toLocaleString('ar-EG') : 'قريباً',
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

    if (lead && lead.status !== 'meeting_booked' && lead.status !== 'closed') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'meeting_booked' },
      });
    }

    return NextResponse.json({
      success: true,
      brief,
      telegramSent: tgResult.success,
    });
  } catch (error: any) {
    console.error('Error generating brief manually:', error);
    return NextResponse.json({ error: error.message || 'Brief generation failed' }, { status: 500 });
  }
}
