import { NextRequest, NextResponse } from 'next/server';
import { generateAIPitch } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadIds, customInstructions } = body;

    let targetLeads = [];

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targetLeads = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
      });
    } else {
      // Find leads with status lead_captured (not yet having pitches)
      targetLeads = await prisma.lead.findMany({
        where: { status: 'lead_captured' },
        take: 20,
      });
    }

    if (targetLeads.length === 0) {
      return NextResponse.json({ message: 'No qualifying leads found for generation', generatedCount: 0 });
    }

    const results = [];

    for (const lead of targetLeads) {
      let recentVideos: string[] = [];
      if (lead.recentVideos) {
        try {
          recentVideos = JSON.parse(lead.recentVideos);
        } catch (e) {
          recentVideos = [];
        }
      }

      try {
        const pitchResult = await generateAIPitch({
          channelName: lead.channelName,
          description: lead.description,
          recentVideos,
          subscriberCount: lead.subscriberCount,
          niche: lead.niche,
          customInstructions,
        });

        const savedPitch = await prisma.pitch.create({
          data: {
            leadId: lead.id,
            subject: pitchResult.subject,
            body: pitchResult.body,
            personalizedStrategy: pitchResult.personalizedStrategy,
            status: 'approved',
          },
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'pitch_ready' },
        });

        results.push({
          leadId: lead.id,
          channelName: lead.channelName,
          pitchId: savedPitch.id,
          success: true,
        });
      } catch (err: any) {
        console.error(`Failed generating pitch for lead ${lead.id}:`, err);
        results.push({
          leadId: lead.id,
          channelName: lead.channelName,
          success: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      generatedCount: results.filter((r) => r.success).length,
      results,
    });
  } catch (error: any) {
    console.error('Error in batch AI pitch generation:', error);
    return NextResponse.json({ error: error.message || 'Batch generation failed' }, { status: 500 });
  }
}
