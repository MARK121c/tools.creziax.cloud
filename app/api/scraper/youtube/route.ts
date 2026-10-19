import { NextRequest, NextResponse } from 'next/server';
import { searchYouTubeChannels } from '@/lib/youtube';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || 'صناع محتوى';
    const maxResults = parseInt(searchParams.get('maxResults') || '20', 10);
    const minSubscribers = parseInt(searchParams.get('minSubscribers') || '1000', 10);
    const filterFaceless = searchParams.get('filterFaceless') !== 'false';
    const onlyArabic = searchParams.get('onlyArabic') !== 'false';

    const { channels, stats } = await searchYouTubeChannels(query, maxResults, minSubscribers, filterFaceless, onlyArabic);
    return NextResponse.json({ channels, stats, query });
  } catch (error: any) {
    console.error('Scraper API Error:', error);
    return NextResponse.json({ error: error.message || 'Scraping failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leads, niche } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    let savedCount = 0;
    let skippedCount = 0;
    const savedLeads = [];

    for (const item of leads) {
      // Check existing
      const existing = await prisma.lead.findUnique({
        where: { channelId: item.channelId },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Calculate initial quality score (1-100)
      let score = 50;
      if (item.email) score += 25;
      if (item.subscriberCount > 10000 && item.subscriberCount < 500000) score += 15; // sweet spot
      if (item.recentVideos && item.recentVideos.length >= 2) score += 10;

      const created = await prisma.lead.create({
        data: {
          channelId: item.channelId,
          channelName: item.channelName,
          channelUrl: item.channelUrl,
          avatarUrl: item.avatarUrl || null,
          email: item.email || null,
          subscriberCount: item.subscriberCount || 0,
          videoCount: item.videoCount || 0,
          viewCount: item.viewCount || null,
          description: item.description || null,
          recentVideos: JSON.stringify(item.recentVideos || []),
          niche: niche || item.niche || 'عام',
          status: 'lead_captured',
          score,
        },
      });

      savedLeads.push(created);
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      savedCount,
      skippedCount,
      savedLeads,
    });
  } catch (error: any) {
    console.error('Error saving scraped leads:', error);
    return NextResponse.json({ error: error.message || 'Failed to save leads' }, { status: 500 });
  }
}
