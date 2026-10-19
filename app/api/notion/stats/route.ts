import { NextResponse } from 'next/server';
import { getExistingNotionLeadNames } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const existing = await getExistingNotionLeadNames();
    return NextResponse.json({
      success: true,
      totalNotionLeads: existing.size,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      totalNotionLeads: 0,
      error: err.message,
    });
  }
}
