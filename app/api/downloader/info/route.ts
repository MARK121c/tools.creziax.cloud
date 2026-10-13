import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoInfo } from '@/lib/downloader';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { url, platform } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'الرجاء إدخال رابط الفيديو' }, { status: 400 });
    }

    const data = await fetchVideoInfo(url, platform);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Downloader info error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'فشل في جلب معلومات الفيديو' },
      { status: 500 }
    );
  }
}
