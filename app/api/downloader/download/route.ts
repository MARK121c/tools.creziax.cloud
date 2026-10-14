import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getYtDlpPath, TEMP_DIR, downloadTasks, getCommonArgs } from '@/lib/downloader';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { url, quality, startTime, endTime, audioOnly } = await req.json();

    if (!url) {
      return NextResponse.json({ success: false, error: 'الرجاء إدخال رابط الفيديو' }, { status: 400 });
    }

    const taskId = crypto.randomUUID();
    const taskDir = path.join(TEMP_DIR, taskId);
    fs.mkdirSync(taskDir, { recursive: true });

    downloadTasks.set(taskId, {
      status: 'processing',
      progress: 0,
      message: 'جاري الاتصال بالخادم وتجهيز البث...',
      filePath: null,
      fileName: null,
      error: null,
    });

    // Start background download with bypass args
    runDownload(taskId, taskDir, { url, quality, startTime, endTime, audioOnly });

    return NextResponse.json({ success: true, taskId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function runDownload(
  taskId: string,
  taskDir: string,
  options: { url: string; quality?: string; startTime?: string; endTime?: string; audioOnly?: boolean }
) {
  const task = downloadTasks.get(taskId);
  if (!task) return;

  try {
    const isAudio = options.audioOnly || options.quality === 'audio';
    const outputTemplate = path.join(taskDir, '%(title).120B.%(ext)s');

    const args: string[] = [
      '-o', outputTemplate,
      ...getCommonArgs(),
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
