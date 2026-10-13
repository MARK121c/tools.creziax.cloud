import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  channel: string;
  description: string;
  formats: Array<{
    id: string;
    label: string;
    ext: string;
    height: number;
    hasAudio: boolean;
    formatNote: string;
  }>;
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

export async function fetchVideoInfo(url: string, platform?: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const ytDlp = getYtDlpPath();
    const args = ['--dump-json', '--no-download', '--no-warnings', url];

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
        return reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }

      try {
        const jsonLines = stdout.trim().split('\n').filter((l) => l.trim().length > 0);
        if (jsonLines.length === 0) {
          return reject(new Error('لم يتم العثور على معلومات الفيديو'));
        }

        const info = JSON.parse(jsonLines[0]);
        const formatsList = (info.formats || [])
          .filter((f: any) => f.vcodec && f.vcodec !== 'none' && f.height)
          .map((f: any) => ({
            id: f.format_id,
            label: `${f.height}p (${f.ext || 'mp4'})`,
            ext: f.ext || 'mp4',
            height: f.height,
            hasAudio: f.acodec && f.acodec !== 'none',
            formatNote: f.format_note || '',
          }))
          .sort((a: any, b: any) => b.height - a.height);

        // Deduplicate
        const uniqueHeights = new Set();
        const dedupedFormats: any[] = [];
        for (const f of formatsList) {
          if (!uniqueHeights.has(f.height)) {
            uniqueHeights.add(f.height);
            dedupedFormats.push(f);
          }
        }

        resolve({
          title: info.title || 'فيديو بدون عنوان',
          thumbnail: info.thumbnail || '',
          duration: info.duration || 0,
          durationString: formatDuration(info.duration || 0),
          channel: info.uploader || info.channel || 'غير معروف',
          description: (info.description || '').substring(0, 200),
          formats: dedupedFormats,
        });
      } catch (err: any) {
        reject(new Error(`Failed to parse video info: ${err.message}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}
