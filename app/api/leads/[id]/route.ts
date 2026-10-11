import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        pitches: {
          orderBy: { generatedAt: 'desc' },
        },
        outreachLogs: {
          orderBy: { sentAt: 'desc' },
        },
        meetingBriefs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error: any) {
    console.error('Error fetching lead details:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const { status, notes, email, niche, score, customPitch } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (email !== undefined) updateData.email = email;
    if (niche !== undefined) updateData.niche = niche;
    if (score !== undefined) updateData.score = parseInt(score, 10);

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    // If custom pitch update is provided
    if (customPitch && customPitch.subject && customPitch.body) {
      await prisma.pitch.create({
        data: {
          leadId: id,
          subject: customPitch.subject,
          body: customPitch.body,
          personalizedStrategy: customPitch.personalizedStrategy || null,
          status: 'approved',
        },
      });

      if (lead.status === 'lead_captured') {
        await prisma.lead.update({
          where: { id },
          data: { status: 'pitch_ready' },
        });
      }
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete lead' }, { status: 500 });
  }
}
