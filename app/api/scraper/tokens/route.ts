import { NextRequest, NextResponse } from 'next/server';
import {
  getYoutubeApiKeys,
  addYoutubeApiKey,
  removeYoutubeApiKey,
  DEFAULT_YOUTUBE_API_KEY,
} from '@/lib/token-pool';

export const dynamic = 'force-dynamic';

function maskKey(key: string): string {
  if (key.length <= 10) return '****';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export async function GET() {
  try {
    const keys = await getYoutubeApiKeys();
    const formatted = keys.map((k, index) => ({
      index: index + 1,
      key: k,
      masked: maskKey(k),
      isDefault: k === DEFAULT_YOUTUBE_API_KEY,
    }));

    return NextResponse.json({
      success: true,
      keys: formatted,
      totalKeys: keys.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, key } = body;

    if (!action || !key) {
      return NextResponse.json({ success: false, error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    let updatedKeys: string[] = [];
    if (action === 'add') {
      updatedKeys = await addYoutubeApiKey(key);
    } else if (action === 'delete') {
      updatedKeys = await removeYoutubeApiKey(key);
    } else {
      return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
    }

    const formatted = updatedKeys.map((k, index) => ({
      index: index + 1,
      key: k,
      masked: maskKey(k),
      isDefault: k === DEFAULT_YOUTUBE_API_KEY,
    }));

    return NextResponse.json({
      success: true,
      keys: formatted,
      totalKeys: updatedKeys.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
