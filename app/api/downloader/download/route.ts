import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getYtDlpPath, TEMP_DIR, downloadTasks } from '@/lib/downloader';

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
      message: 'جاري بدء التحميل...',
      filePath: null,
      fileName: null,
      error: null,
    });

    // Start background download
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
    const outputTemplate = path.join(taskDir, 'output_%(title).100B.%(ext)s');

    const args: string[] = ['-o', outputTemplate, '--no-warnings'];

    if (isAudio) {
      args.push('-x', '--audio-format', 'mp3');
    } else if (options.quality && options.quality !== 'best') {
      args.push('-f', `bestvideo[height<=${options.quality}]+bestaudio/best[height<=${options.quality}]/best`);
    }

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
        task.progress = parseFloat(match[1]);
        task.message = `جاري التحميل: ${task.progress.toFixed(1)}%`;
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        // Find produced file
        const files = fs.readdirSync(taskDir);
        if (files.length > 0) {
          const finalFile = files[0];
          task.status = 'done';
          task.progress = 100;
          task.message = 'اكتمل التحميل بنجاح!';
          task.fileName = finalFile;
          task.filePath = path.join(taskDir, finalFile);
        } else {
          task.status = 'error';
          task.error = 'لم يتم العثور على الملف الناتج';
        }
      } else {
        task.status = 'error';
        task.error = `فشل التحميل (كود الخطأ: ${code})`;
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
