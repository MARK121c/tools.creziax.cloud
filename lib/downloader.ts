import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { parseCloudMedia, getCloudDirectDownloadLink } from '@/lib/cloudDownloader';

export interface FormatOption {
  id: string;
  label: string;
  ext: string;
  height: number;
  qualityBadge: string;
  hasAudio: boolean;
  formatNote: string;
  resourceContent?: string;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  channel: string;
  description: string;
  platform: string;
  maxQuality: string;
  formats: FormatOption[];
  images?: string[];
}

export interface TaskState {
  status: 'processing' | 'done' | 'error';
  progress: number;
  message: string;
  filePath: string | null;
  fileName: string | null;
  error: string | null;
}

export const downloadTasks = new Map<string, TaskState>();

export const TEMP_DIR = path.join(os.tmpdir(), 'video-downloader-temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export function getYtDlpPath(): string {
  const localExe = path.join(process.cwd(), 'tools', 'video-downloader', 'yt-dlp.exe');
  if (fs.existsSync(localExe)) {
    return localExe;
  }
  return 'yt-dlp';
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) return 'facebook';
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'pinterest';
  return 'auto';
}

function getQualityBadge(height: number): string {
  if (height >= 4320) return '8K Ultra HD';
  if (height >= 2160) return '4K Ultra HD';
  if (height >= 1440) return '2K QHD';
  if (height >= 1080) return '1080p FHD';
  if (height >= 720) return '720p HD';
  if (height >= 480) return '480p SD';
  return `${height}p`;
}

/**
 * Returns common arguments to bypass bot blocks and handle multi-platform downloads.
 * Uses tv_embedded + ios YouTube clients which reliably bypass bot checks on VPS IPs.
 */
export function getCommonArgs(url?: string): string[] {
  const isYouTube = url
    ? url.toLowerCase().includes('youtube.com') || url.toLowerCase().includes('youtu.be')
    : false;

  const args: string[] = [
    '--no-warnings',
    '--no-check-certificates',
    '--socket-timeout', '30',
    '--retries', '5',
    '--fragment-retries', '10',
    '--retry-sleep', '3',
  ];

  if (isYouTube) {
    // YouTube-specific: use tv_embedded + ios clients — these bypass "Sign in to confirm" on VPS
    args.push(
      '--extractor-args', 'youtube:player_client=tv_embedded,ios;player_skip=webpage,configs,js',
      '--user-agent', 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iPhone OS 17_5_1 like Mac OS X;)',
      '--add-header', 'Accept-Language:en-US,en;q=0.9',
    );
  } else {
    // For TikTok, Instagram, Facebook, Pinterest — standard Chrome UA
    args.push(
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      '--add-header', 'Accept-Language:en-US,en;q=0.9',
    );
  }

  // If user placed a cookies.txt file, use it automatically (helpful for YouTube)
  const possibleCookiePaths = [
    path.join(process.cwd(), 'cookies.txt'),
    path.join(process.cwd(), 'tools', 'video-downloader', 'cookies.txt'),
    '/app/cookies.txt',
  ];

  for (const cp of possibleCookiePaths) {
    if (fs.existsSync(cp)) {
      args.push('--cookies', cp);
      break;
    }
  }

  return args;
}

export async function fetchVideoInfo(url: string, platformHint?: string): Promise<VideoInfo> {
  const detected = detectPlatform(url);

  // 1. Try Cloud Resolver first (bypasses YouTube/Facebook/Instagram bot blocks entirely like vidssave)
  try {
    const cloud = await parseCloudMedia(url);
    if (cloud && cloud.resources && cloud.resources.length > 0) {
      const formats: FormatOption[] = cloud.resources.map((r, idx) => {
        const heightNum = parseInt(r.quality.replace(/[^\d]/g, ''), 10) || 720;
        return {
          id: r.resource_content || `cloud_${idx}`,
          label: `${getQualityBadge(heightNum)} (${r.format.toLowerCase()})`,
          ext: r.format.toLowerCase(),
          height: heightNum,
          qualityBadge: getQualityBadge(heightNum),
          hasAudio: r.has_audio !== false,
          formatNote: `${r.quality} HD`,
          resourceContent: r.resource_content,
        };
      }).sort((a, b) => b.height - a.height);

      // Deduplicate by height — prefer formats WITH audio over video-only
      const seen = new Map<number, number>();
      const deduped: FormatOption[] = [];
      for (const f of formats) {
        const existingIdx = seen.get(f.height);
        if (existingIdx === undefined) {
          seen.set(f.height, deduped.length);
          deduped.push(f);
        } else if (!deduped[existingIdx].hasAudio && f.hasAudio) {
          // Replace video-only with version that has audio
          deduped[existingIdx] = f;
        }
      }

      const maxH = deduped.length > 0 ? deduped[0].height : 720;

      return {
        title: cloud.title || 'فيديو بدون عنوان',
        thumbnail: cloud.thumbnail || '',
        duration: cloud.duration || 0,
        durationString: formatDuration(cloud.duration || 0),
        channel: detected === 'youtube' ? 'YouTube' : detected === 'facebook' ? 'Facebook' : detected === 'instagram' ? 'Instagram' : 'Social Media',
        description: '',
        platform: detected,
        maxQuality: getQualityBadge(maxH),
        formats: deduped,
        images: cloud.images,
      };
    }
  } catch (cloudErr) {
    console.warn('Cloud resolver skipped, using yt-dlp fallback:', cloudErr);
  }

  // 2. Fallback to local yt-dlp (e.g. TikTok or custom URLs)
  return new Promise((resolve, reject) => {
    const ytDlp = getYtDlpPath();

    const args = [
      '--dump-json',
      '--no-download',
      ...getCommonArgs(url),
      url,
    ];

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
      if (code !== 0) {
        let errMsg = stderr || `فشل في معالجة الرابط (كود: ${code})`;
        if (errMsg.includes('Sign in to confirm') || errMsg.includes('not a bot') || errMsg.includes('age-restricted')) {
          errMsg = 'YOUTUBE_BOT_BLOCK: يوتيوب يحجب السيرفر (IP مصنّف كـ Bot). جرب رابط تيك توك/إنستقرام/فيسبوك، أو رفّع ملف cookies.txt على السيرفر.';
        } else if (errMsg.includes('Video unavailable') || errMsg.includes('Private video')) {
          errMsg = 'الفيديو غير متاح أو تم تعيينه كفيديو خاص.';
        } else if (errMsg.includes('is not a valid URL') || errMsg.includes('Unsupported URL')) {
          errMsg = 'الرابط غير صحيح أو غير مدعوم. تأكد من نسخ الرابط الكامل.';
        }
        return reject(new Error(errMsg));
      }

      try {
        const jsonLines = stdout.trim().split('\n').filter((l) => l.trim().length > 0);
        if (jsonLines.length === 0) {
          return reject(new Error('لم يتم العثور على معلومات الفيديو من هذا الرابط'));
        }

        const info = JSON.parse(jsonLines[0]);
        const rawFormats = info.formats || [];

        // Extract formats with video codecs
        const videoFormats = rawFormats
          .filter((f: any) => f.vcodec && f.vcodec !== 'none' && f.height)
          .map((f: any) => ({
            id: f.format_id,
            label: `${getQualityBadge(f.height)} (${f.ext || 'mp4'})`,
            ext: f.ext || 'mp4',
            height: f.height,
            qualityBadge: getQualityBadge(f.height),
            hasAudio: Boolean(f.acodec && f.acodec !== 'none'),
            formatNote: f.format_note || '',
          }))
          .sort((a: any, b: any) => b.height - a.height);

        // Deduplicate by height
        const seenHeights = new Set<number>();
        const deduped: FormatOption[] = [];

        for (const fmt of videoFormats) {
          if (!seenHeights.has(fmt.height)) {
            seenHeights.add(fmt.height);
            deduped.push(fmt);
          }
        }

        const maxH = deduped.length > 0 ? deduped[0].height : 720;
        const maxBadge = getQualityBadge(maxH);

        // Extract images for carousels or image posts
        const extractedImages: string[] = [];
        if (info.entries && Array.isArray(info.entries)) {
          for (const entry of info.entries) {
            if (entry.url && /\.(jpe?g|png|webp)/i.test(entry.url)) {
              extractedImages.push(entry.url);
            } else if (entry.thumbnail) {
              extractedImages.push(entry.thumbnail);
            }
          }
        }
        if (extractedImages.length === 0 && (info.ext === 'jpg' || info.ext === 'jpeg' || info.ext === 'png' || info.ext === 'webp' || detected === 'pinterest')) {
          if (info.url && /\.(jpe?g|png|webp)/i.test(info.url)) {
            extractedImages.push(info.url);
          } else if (info.thumbnail) {
            extractedImages.push(info.thumbnail);
          }
        }

        resolve({
          title: info.title || 'فيديو بدون عنوان',
          thumbnail: info.thumbnail || '',
          duration: info.duration || 0,
          durationString: formatDuration(info.duration || 0),
          channel: info.uploader || info.channel || info.creator || 'غير معروف',
          description: (info.description || '').substring(0, 200),
          platform: detected,
          maxQuality: maxBadge,
          formats: deduped,
          images: extractedImages.length > 0 ? extractedImages : undefined,
        });
      } catch (err: any) {
        reject(new Error(`فشل في استخراج تفاصيل الفيديو: ${err.message}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}
