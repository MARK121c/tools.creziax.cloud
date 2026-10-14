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

    // 1. If resourceContent is already provided from cloud parse
    if (resourceContent) {
      const directUrl = await getCloudDirectDownloadLink(resourceContent);
      if (directUrl) {
        return NextResponse.json({
          success: true,
          downloadUrl: makeProxyUrl(directUrl),
          direct: true,
        });
      }
    }

    // 2. If no resourceContent, try parsing with Cloud Resolver first
    if (url) {
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
              return NextResponse.json({
                success: true,
                downloadUrl: makeProxyUrl(directUrl, cloud.title),
                direct: true,
                title: cloud.title,
              });
            }
          }
        }
      } catch (e) {
        console.warn('Cloud direct link parse failed:', e);
      }

      // 3. Fallback: extract direct media stream URL via yt-dlp -g (instant for TikTok, Twitter, etc.)
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
 */
function getDirectStreamUrl(url: string, quality?: string, audioOnly?: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytDlp = getYtDlpPath();
    const args = ['-g', ...getCommonArgs(url)];

    if (audioOnly) {
      args.push('-f', 'bestaudio');
    } else if (quality && quality !== 'best') {
      const heightNum = parseInt(quality, 10);
      if (!isNaN(heightNum)) {
        args.push('-f', `bestvideo[height<=${heightNum}]+bestaudio/best[height<=${heightNum}]/best`);
      } else {
        args.push('-f', 'bestvideo+bestaudio/best');
      }
    } else {
      args.push('-f', 'bestvideo+bestaudio/best');
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
        if (lines.length > 0) {
          return resolve(lines[0].trim());
        }
      }
      reject(new Error(stderr || 'لم يتم العثور على رابط مباشر'));
    });

    proc.on('error', reject);
  });
}
