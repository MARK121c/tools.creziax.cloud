import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recordings = await (prisma as any).recording.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, recordings });
  } catch (error: any) {
    console.error('Failed to fetch recordings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recordings', recordings: [] },
      { status: 500 }
    );
  }
}
