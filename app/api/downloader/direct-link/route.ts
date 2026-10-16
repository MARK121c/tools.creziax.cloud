import { NextRequest, NextResponse } from 'next/server';
import { getCloudDirectDownloadLink, parseCloudMedia } from '@/lib/cloudDownloader';
import { getYtDlpPath, getCommonArgs, detectPlatform } from '@/lib/downloader';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { url, resourceContent, quality, audioOnly, title } = await req.json();

    if (!url && !resourceContent) {
      return NextResponse.json({ success: false, error: 'الرابط مطلوب' }, { status: 400 });
    }

    const ext = audioOnly ? 'mp3' : 'mp4';
    const makeProxyUrl = (targetUrl: string, name?: string) => {
      const safe = (name || title || 'video').replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 80);
      const fName = `${safe || 'video'}.${ext}`;
      return `/api/downloader/proxy?url=${encodeURIComponent(targetUrl)}&name=${encodeURIComponent(fName)}`;
    };

    // 1. If resourceContent is already provided from cloud parse — ONLY for VIDEO downloads
    //    For audio-only, cloud resourceContent is a VIDEO file — skip it and use yt-dlp instead
    if (resourceContent && !audioOnly) {
      const directUrl = await getCloudDirectDownloadLink(resourceContent);
      if (directUrl) {
        const safe = (title || 'video').replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 80);
        const fName = `${safe || 'video'}.${ext}`;
        const proxy = makeProxyUrl(directUrl, safe);
        return NextResponse.json({
          success: true,
          downloadUrl: proxy, // Always stream through server proxy to prevent 403 IP-lock
          proxyUrl: proxy,
          cdnUrl: directUrl,
          fileName: fName,
          direct: true,
          title: safe,
        });
      }
    }

    // 2. If no resourceContent, try parsing with Cloud Resolver — ONLY for VIDEO downloads
    //    For audio-only, cloud resolver only has video resources, skip to yt-dlp
    if (url && !audioOnly) {
      try {
        const cloud = await parseCloudMedia(url);
        if (cloud && cloud.resources && cloud.resources.length > 0) {
          // Find matching resource by quality
          let target = cloud.resources.find((r) => {
            const h = parseInt(r.quality.replace(/[^\d]/g, ''), 10);
            return h.toString() === quality;
          });

          if (!target) {
            target = cloud.resources[0];
          }

          if (target && target.resource_content) {
            const directUrl = await getCloudDirectDownloadLink(target.resource_content);
            if (directUrl) {
              const safe = (cloud.title || title || 'video').replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 80);
              const fName = `${safe || 'video'}.${ext}`;
              const proxy = makeProxyUrl(directUrl, safe);
              return NextResponse.json({
                success: true,
                downloadUrl: proxy, // Always stream through server proxy to prevent 403 IP-lock
                proxyUrl: proxy,
                cdnUrl: directUrl,
                fileName: fName,
                direct: true,
                title: cloud.title,
              });
            }
          }
        }
      } catch (e) {
        console.warn('Cloud direct link parse failed:', e);
      }
    }

    // 3. Fallback: extract direct media stream URL via yt-dlp -g
    //    This handles: audio extraction for all platforms, TikTok video, etc.
    if (url) {
      try {
        const directStreamUrl = await getDirectStreamUrl(url, quality, audioOnly);
        if (directStreamUrl) {
          return NextResponse.json({
            success: true,
            downloadUrl: makeProxyUrl(directStreamUrl),
            direct: true,
          });
        }
      } catch (err: any) {
        console.warn('yt-dlp -g fallback failed:', err.message);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'تعذر استخراج رابط التحميل المباشر الفوري',
    }, { status: 422 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Extracts the direct video or audio stream URL using yt-dlp -g
 * 
 * Key fixes:
 * - For audio: uses -f bestaudio to get audio-only stream
 * - For video: uses -f best (single merged URL) instead of bestvideo+bestaudio 
 *   which returns 2 separate URLs that our proxy can't handle
 * - When multiple URLs returned, retries with -f best to get merged stream
 */
function getDirectStreamUrl(url: string, quality?: string, audioOnly?: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytDlp = getYtDlpPath();
    const args = ['-g', ...getCommonArgs(url)];

    if (audioOnly) {
      // Audio extraction — bestaudio gives a single audio stream URL
      args.push('-f', 'bestaudio/best');
    } else if (quality && quality !== 'best') {
      const heightNum = parseInt(quality, 10);
      if (!isNaN(heightNum)) {
        // Use 'best' (single merged stream) for direct URL extraction
        // bestvideo+bestaudio returns 2 URLs (video + audio separate) which proxy can't handle
        args.push('-f', `best[height<=${heightNum}]/best`);
      } else {
        args.push('-f', 'best');
      }
    } else {
      // Best merged single-file format
      args.push('-f', 'best');
    }

    args.push(url);

    const proc = spawn(ytDlp, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const lines = stdout.trim().split('\n').filter((l) => l.trim().startsWith('http'));
        if (lines.length === 1) {
          return resolve(lines[0].trim());
        }
        if (lines.length > 1) {
          // Multiple URLs returned (video + audio separate streams)
          // Use the first URL — it's the primary stream
          return resolve(lines[0].trim());
        }
      }
      reject(new Error(stderr || 'لم يتم العثور على رابط مباشر'));
    });

    proc.on('error', reject);
  });
}
