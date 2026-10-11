import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const niche = searchParams.get('niche');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (niche && niche !== 'all') {
      where.niche = niche;
    }

    if (search) {
      where.OR = [
        { channelName: { contains: search } },
        { email: { contains: search } },
        { description: { contains: search } },
        { niche: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          pitches: {
            orderBy: { generatedAt: 'desc' },
            take: 1,
          },
          outreachLogs: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelName, channelUrl, email, subscriberCount, niche, description, notes } = body;

    if (!channelName) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const channelId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const lead = await prisma.lead.create({
      data: {
        channelId,
        channelName,
        channelUrl: channelUrl || `https://youtube.com`,
        email: email || null,
        subscriberCount: subscriberCount ? parseInt(subscriberCount, 10) : 0,
        niche: niche || 'عام',
        description: description || null,
        notes: notes || null,
        status: 'lead_captured',
        score: email ? 75 : 50,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to create lead' }, { status: 500 });
  }
}
