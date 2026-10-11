import { NextRequest, NextResponse } from 'next/server';
import { sendOutreachEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, pitchId, customSubject, customBody, targetEmail } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        pitches: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const recipient = targetEmail || lead.email;
    if (!recipient) {
      return NextResponse.json(
        { error: 'لا يوجد بريد إلكتروني مسجل لهذا العميل (يرجى إدخال البريد أولاً)' },
        { status: 400 }
      );
    }

    const pitch = pitchId
      ? await prisma.pitch.findUnique({ where: { id: pitchId } })
      : lead.pitches[0];

    const subject = customSubject || pitch?.subject || `فرصة تعاون وتطوير محتوى لقناة ${lead.channelName}`;
    const mailBody = customBody || pitch?.body;

    if (!mailBody) {
      return NextResponse.json(
        { error: 'نص البريد فارغ. يرجى توليد عرض بالذكاء الاصطناعي أولاً' },
        { status: 400 }
      );
    }

    const bookingLink = await getSetting('booking_link', 'https://calendly.com/your-agency/15min');

    // Send email via Nodemailer
    const sendResult = await sendOutreachEmail({
      to: recipient,
      subject,
      body: mailBody,
      bookingLink,
    });

    // Create outreach log
    const outreachLog = await prisma.outreachLog.create({
      data: {
        leadId: lead.id,
        pitchId: pitch?.id || null,
        status: sendResult.success ? 'sent' : 'failed',
        errorMessage: sendResult.error || null,
      },
    });

    if (sendResult.success) {
      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'email_sent',
          email: recipient, // update if entered on the fly
        },
      });

      if (pitch) {
        await prisma.pitch.update({
          where: { id: pitch.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: sendResult.success,
      messageId: sendResult.messageId,
      error: sendResult.error,
      outreachLog,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send outreach email' }, { status: 500 });
  }
}
