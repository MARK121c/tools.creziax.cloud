import { NextRequest, NextResponse } from 'next/server';
import { sendOutreachEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadIds } = body;

    let targetLeads = [];

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targetLeads = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
        include: {
          pitches: {
            orderBy: { generatedAt: 'desc' },
            take: 1,
          },
        },
      });
    } else {
      // Find all pitch_ready leads with valid emails
      targetLeads = await prisma.lead.findMany({
        where: {
          status: 'pitch_ready',
          email: { not: null },
        },
        take: 15,
        include: {
          pitches: {
            orderBy: { generatedAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    const bookingLink = await getSetting('booking_link', 'https://calendly.com/your-agency/15min');
    const results = [];

    for (const lead of targetLeads) {
      if (!lead.email) {
        results.push({
          leadId: lead.id,
          channelName: lead.channelName,
          success: false,
          error: 'No email address found',
        });
        continue;
      }

      const pitch = lead.pitches[0];
      if (!pitch || !pitch.body) {
        results.push({
          leadId: lead.id,
          channelName: lead.channelName,
          success: false,
          error: 'No pitch available for this lead',
        });
        continue;
      }

      const sendResult = await sendOutreachEmail({
        to: lead.email,
        subject: pitch.subject,
        body: pitch.body,
        bookingLink,
      });

      await prisma.outreachLog.create({
        data: {
          leadId: lead.id,
          pitchId: pitch.id,
          status: sendResult.success ? 'sent' : 'failed',
          errorMessage: sendResult.error || null,
        },
      });

      if (sendResult.success) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'email_sent' },
        });

        await prisma.pitch.update({
          where: { id: pitch.id },
          data: { status: 'sent', sentAt: new Date() },
        });
      }

      results.push({
        leadId: lead.id,
        channelName: lead.channelName,
        email: lead.email,
        success: sendResult.success,
        error: sendResult.error,
      });

      // Small throttling delay to protect SMTP sender reputation
      await delay(500);
    }

    return NextResponse.json({
      success: true,
      totalProcessed: results.length,
      sentCount: results.filter((r) => r.success).length,
      results,
    });
  } catch (error: any) {
    console.error('Error in batch email send:', error);
    return NextResponse.json({ error: error.message || 'Batch email send failed' }, { status: 500 });
  }
}
