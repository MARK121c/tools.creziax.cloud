import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recording = await (prisma as any).recording.findUnique({
      where: { id: params.id },
    });

    if (!recording) {
      return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, recording });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recording = await (prisma as any).recording.findUnique({
      where: { id: params.id },
    });

    if (!recording) {
      return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
    }

    // Delete file from disk if it exists
    if (recording.filePath && fs.existsSync(recording.filePath)) {
      try {
        fs.unlinkSync(recording.filePath);
      } catch (err) {
        console.error('Failed to delete file from disk:', err);
      }
    }

    await (prisma as any).recording.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Recording deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
