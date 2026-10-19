import { NextRequest, NextResponse } from 'next/server';
import { pushLeadToNotion, getExistingNotionLeadNames } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { leads, niche } = await req.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ success: false, error: 'لا يوجد عملاء للمزامنة' }, { status: 400 });
    }

    const existingInNotion = await getExistingNotionLeadNames();
    let syncedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      const chName = (lead.channelName || '').trim().toLowerCase();
      if (chName && existingInNotion.has(chName)) {
        skippedCount++;
        continue;
      }

      try {
        await pushLeadToNotion(lead, niche || lead.niche || 'عام');
        if (chName) existingInNotion.add(chName);
        syncedCount++;
      } catch (err: any) {
        console.error('Failed to sync lead to Notion:', lead.channelName, err.message);
        errors.push(`${lead.channelName}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      skippedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Notion Sync API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
