import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const targetUrl = req.nextUrl.searchParams.get('url');
    const fileName = req.nextUrl.searchParams.get('name') || 'video.mp4';

    if (!targetUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://ar.vidssave.com/',
        Origin: 'https://ar.vidssave.com',
      },
    });

    if (!upstream.ok || !upstream.body) {
      return new NextResponse(`Failed to stream media: HTTP ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const encodedName = encodeURIComponent(fileName);
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    if (upstream.headers.has('content-length')) {
      headers.set('Content-Length', upstream.headers.get('content-length')!);
    }
    headers.set(
      'Content-Disposition',
      `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`
    );
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(upstream.body as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return new NextResponse('Streaming error: ' + error.message, { status: 500 });
  }
}
