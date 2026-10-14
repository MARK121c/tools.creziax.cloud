import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface FormatOption {
  id: string;
  label: string;
  ext: string;
  height: number;
  qualityBadge: string;
  hasAudio: boolean;
  formatNote: string;
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
 * Returns common arguments to bypass bot blocks and handle multi-platform downloads
 */
export function getCommonArgs(): string[] {
  const args = [
    '--no-warnings',
    '--no-check-certificates',
    '--prefer-free-formats',
    // Bypass YouTube "Sign in to confirm you're not a bot" on VPS servers:
    '--extractor-args', 'youtube:player_client=android,web;player_skip=configs',
    // Mobile Chrome User-Agent works best for TikTok, Facebook, Instagram and YouTube
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
  ];

  // If user placed a cookies.txt file, use it automatically
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
  return new Promise((resolve, reject) => {
    const ytDlp = getYtDlpPath();
    const detected = detectPlatform(url);

    const args = [
      '--dump-json',
      '--no-download',
      ...getCommonArgs(),
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
        // Human-readable Arabic explanations for common errors
        let errMsg = stderr || `فشل في معالجة الرابط (كود: ${code})`;
        if (errMsg.includes('Sign in to confirm you’re not a bot')) {
          errMsg = 'يوتيوب يطلب تأكيد حساب أو كوكيز مؤقتة. جرب رابط فيديو آخر أو تيك توك/إنستقرام/فيسبوك.';
        } else if (errMsg.includes('Video unavailable') || errMsg.includes('Private video')) {
          errMsg = 'الفيديو غير متاح أو تم تعيينه كفيديو خاص.';
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
        });
      } catch (err: any) {
        reject(new Error(`فشل في استخراج تفاصيل الفيديو: ${err.message}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}
