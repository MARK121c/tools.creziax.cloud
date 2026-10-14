import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get('url');
  const fileName = req.nextUrl.searchParams.get('name') || 'video.mp4';

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const isVidssave = targetUrl.includes('vidssave.com');
    const reqHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    if (isVidssave) {
      reqHeaders['Referer'] = 'https://ar.vidssave.com/';
      reqHeaders['Origin'] = 'https://ar.vidssave.com';
    }

    const upstream = await fetch(targetUrl, {
      headers: reqHeaders,
    });

    if (!upstream.ok) {
      console.error('[proxy] Upstream returned error:', upstream.status, targetUrl);
      return new Response(
        `Failed to fetch media: HTTP ${upstream.status}`,
        { status: upstream.status }
      );
    }

    if (!upstream.body) {
      return new Response('Empty response from media server', { status: 502 });
    }

    const encodedName = encodeURIComponent(fileName);
    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const contentLength = upstream.headers.get('content-length');

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    // Stream the media directly to the user's browser
    return new Response(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[proxy] Error streaming media:', error);
    return new Response('Streaming error: ' + error.message, { status: 500 });
  }
}
