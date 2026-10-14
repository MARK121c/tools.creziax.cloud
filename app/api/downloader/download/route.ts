import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getYtDlpPath, TEMP_DIR, downloadTasks, getCommonArgs } from '@/lib/downloader';
import { getCloudDirectDownloadLink } from '@/lib/cloudDownloader';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { url, quality, resourceContent, startTime, endTime, audioOnly } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'الرجاء إدخال رابط الفيديو' }, { status: 400 });
    }

    const taskId = crypto.randomUUID();
    const taskDir = path.join(TEMP_DIR, taskId);
    fs.mkdirSync(taskDir, { recursive: true });

    downloadTasks.set(taskId, {
      status: 'processing',
      progress: 10,
      message: 'جاري الاتصال بالخادم وتجهيز البث...',
      filePath: null,
      fileName: null,
      error: null,
    });

    // Start background download
    runDownload(taskId, taskDir, { url, quality, resourceContent, startTime, endTime, audioOnly });

    return NextResponse.json({ success: true, taskId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function runDownload(
  taskId: string,
  taskDir: string,
  options: { url: string; quality?: string; resourceContent?: string; startTime?: string; endTime?: string; audioOnly?: boolean }
) {
  const task = downloadTasks.get(taskId);
  if (!task) return;

  try {
    // 1. Cloud Download Engine (bypasses bot verification like vidssave)
    if (options.resourceContent) {
      task.progress = 30;
      task.message = 'جاري الاتصال بالسيرفر السحابي وتجهيز الرابط الفائق...';

      const directLink = await getCloudDirectDownloadLink(options.resourceContent);
      if (directLink) {
        task.progress = 60;
        task.message = 'جاري سحب الفيديو بأقصى سرعة...';

        const fileRes = await fetch(directLink, {
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://ar.vidssave.com/',
          },
        });
        if (fileRes.ok) {
          const ext = options.audioOnly ? 'mp3' : 'mp4';
          const finalFileName = `video_${Date.now()}.${ext}`;
          const finalPath = path.join(taskDir, finalFileName);

          const arrayBuffer = await fileRes.arrayBuffer();
          fs.writeFileSync(finalPath, Buffer.from(arrayBuffer));

          // If trimming is requested
          if (options.startTime || options.endTime) {
            task.progress = 85;
            task.message = 'جاري اقتطاع المشهد المطلوب...';
            const trimmedName = `clip_${finalFileName}`;
            const trimmedPath = path.join(taskDir, trimmedName);

            try {
              await new Promise<void>((resTrim, rejTrim) => {
                const trimArgs = ['-y', '-i', finalPath];
                if (options.startTime) trimArgs.push('-ss', options.startTime);
                if (options.endTime) trimArgs.push('-to', options.endTime);
                trimArgs.push('-c', 'copy', trimmedPath);

                const pTrim = spawn('ffmpeg', trimArgs);
                pTrim.on('close', (c) => (c === 0 ? resTrim() : rejTrim(new Error('فشل اقتطاع الفيديو'))));
                pTrim.on('error', rejTrim);
              });

              task.status = 'done';
              task.progress = 100;
              task.message = 'اكتمل التحميل والاقتطاع بنجاح! جاري التنزيل لجهازك...';
              task.fileName = trimmedName;
              task.filePath = trimmedPath;
              return;
            } catch {
              // fallback to original untrimmed file
            }
          }

          task.status = 'done';
          task.progress = 100;
          task.message = 'اكتمل التحميل بنجاح! جاري التنزيل لجهازك...';
          task.fileName = finalFileName;
          task.filePath = finalPath;
          return;
        }
      }
    }

    // 2. Fallback to local yt-dlp (works for TikTok, etc.)
    const isAudio = options.audioOnly || options.quality === 'audio';
    const outputTemplate = path.join(taskDir, '%(title).120B.%(ext)s');

    const args: string[] = [
      '-o', outputTemplate,
      ...getCommonArgs(options.url),
    ];

    if (isAudio) {
      args.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0'
      );
    } else {
      args.push('--merge-output-format', 'mp4');

      if (options.quality && options.quality !== 'best') {
        const heightNum = parseInt(options.quality, 10);
        if (!isNaN(heightNum)) {
          // Supports 4320 (8k), 2160 (4k), 1440 (2k), 1080, 720, etc.
          args.push('-f', `bestvideo[height<=${heightNum}]+bestaudio/best[height<=${heightNum}]/best`);
        } else {
          args.push('-f', 'bestvideo+bestaudio/best');
        }
      } else {
        // Highest available (e.g. 8K / 4K / 1080p)
        args.push('-f', 'bestvideo+bestaudio/best');
      }
    }

    // Precise clip trimming via ffmpeg postprocessor
    if (options.startTime || options.endTime) {
      const postArgs: string[] = [];
      if (options.startTime) postArgs.push('-ss', options.startTime);
      if (options.endTime) postArgs.push('-to', options.endTime);
      if (postArgs.length > 0) {
        args.push('--postprocessor-args', `ffmpeg:${postArgs.join(' ')}`);
      }
    }

    args.push(options.url);

    const proc = spawn(getYtDlpPath(), args, { windowsHide: true });

    proc.stdout.on('data', (d) => {
      const text = d.toString();
      const match = text.match(/(\d+\.?\d*)%/);
      if (match && task) {
        task.progress = Math.min(parseFloat(match[1]), 99);
        task.message = `جاري التحميل والمعالجة: ${task.progress.toFixed(0)}%`;
      }
    });

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const files = fs.readdirSync(taskDir).filter((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'));
          if (files.length > 0) {
            const finalFile = files[0];
            task.status = 'done';
            task.progress = 100;
            task.message = 'اكتمل التحميل بنجاح! جاري التنزيل لجهازك...';
            task.fileName = finalFile;
            task.filePath = path.join(taskDir, finalFile);
          } else {
            task.status = 'error';
            task.error = 'لم يتم العثور على الملف بعد اكتمال المعالجة';
          }
        } catch (e: any) {
          task.status = 'error';
          task.error = e.message;
        }
      } else {
        task.status = 'error';
        let friendlyErr = stderr || `فشل التحميل (رمز الخطأ: ${code})`;
        if (friendlyErr.includes('Sign in to confirm you’re not a bot')) {
          friendlyErr = 'يوتيوب يطلب كوكيز أو تسجيل دخول على عنوان السيرفر. يرجى تجربة فيديو آخر أو منصات تيك توك/إنستقرام/فيسبوك/بنترست.';
        }
        task.error = friendlyErr;
      }
    });

    proc.on('error', (err) => {
      task.status = 'error';
      task.error = err.message;
    });
  } catch (err: any) {
    task.status = 'error';
    task.error = err.message;
  }
}
