import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalLeads,
      pitchesReady,
      emailsSent,
      repliesReceived,
      meetingsBooked,
      closedDeals,
      leadsByStatus,
      recentLeads,
      recentOutreach,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'pitch_ready' } }),
      prisma.lead.count({ where: { status: 'email_sent' } }),
      prisma.lead.count({ where: { status: 'replied' } }),
      prisma.lead.count({ where: { status: 'meeting_booked' } }),
      prisma.lead.count({ where: { status: 'closed' } }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.lead.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { pitches: true },
      }),
      prisma.outreachLog.findMany({
        take: 6,
        orderBy: { sentAt: 'desc' },
        include: { lead: true },
      }),
    ]);

    const statusBreakdown: Record<string, number> = {
      lead_captured: 0,
      pitch_ready: 0,
      email_sent: 0,
      replied: 0,
      meeting_booked: 0,
      closed: 0,
    };

    leadsByStatus.forEach((group) => {
      statusBreakdown[group.status] = group._count._all;
    });

    const totalContacted = emailsSent + repliesReceived + meetingsBooked + closedDeals;
    const conversionRate = totalContacted > 0
      ? Number((((meetingsBooked + closedDeals) / totalContacted) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      totalLeads,
      pitchesReady,
      emailsSent,
      repliesReceived,
      meetingsBooked,
      closedDeals,
      conversionRate,
      statusBreakdown,
      recentLeads,
      recentOutreach,
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: error.message || 'Failed to load analytics' }, { status: 500 });
  }
}
