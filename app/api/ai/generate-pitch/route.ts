import { NextRequest, NextResponse } from 'next/server';
import { generateAIPitch } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, channelName, description, recentVideos, subscriberCount, niche, customInstructions } = body;

    let targetLead = null;
    let name = channelName;
    let desc = description;
    let videos = recentVideos;
    let subs = subscriberCount;
    let channelNiche = niche;

    if (leadId) {
      targetLead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (targetLead) {
        name = targetLead.channelName;
        desc = targetLead.description;
        channelNiche = targetLead.niche;
        subs = targetLead.subscriberCount;
        if (targetLead.recentVideos) {
          try {
            videos = JSON.parse(targetLead.recentVideos);
          } catch (e) {
            videos = [];
          }
        }
      }
    }

    if (!name) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const pitchResult = await generateAIPitch({
      channelName: name,
      description: desc,
      recentVideos: videos,
      subscriberCount: subs,
      niche: channelNiche,
      customInstructions,
    });

    let savedPitch = null;
    if (leadId && targetLead) {
      savedPitch = await prisma.pitch.create({
        data: {
          leadId: targetLead.id,
          subject: pitchResult.subject,
          body: pitchResult.body,
          personalizedStrategy: pitchResult.personalizedStrategy,
          status: 'approved',
        },
      });

      // Update lead status to pitch_ready if currently captured
      if (targetLead.status === 'lead_captured') {
        await prisma.lead.update({
          where: { id: targetLead.id },
          data: { status: 'pitch_ready' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      pitch: pitchResult,
      savedPitch,
    });
  } catch (error: any) {
    console.error('Error generating AI pitch:', error);
    return NextResponse.json({ error: error.message || 'AI pitch generation failed' }, { status: 500 });
  }
}
