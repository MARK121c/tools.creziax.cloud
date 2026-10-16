import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Executes an ffmpeg conversion command safely with timeout
 */
function runFfmpeg(args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn('ffmpeg', args, { windowsHide: true });
      let hasError = false;

      proc.on('error', (err) => {
        console.warn('ffmpeg process error:', err.message);
        hasError = true;
        resolve(false);
      });

      const timeout = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
        resolve(false);
      }, 60000); // 1 minute max conversion timeout

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (!hasError && code === 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recording = await (prisma as any).recording.findUnique({
      where: { id: params.id },
    });

    if (!recording || !recording.filePath || !fs.existsSync(recording.filePath)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

    const requestedFormat = (req.nextUrl.searchParams.get('format') || 'mp4').toLowerCase();
    const originalPath = recording.filePath;
    const baseName = (recording.title || 'recording')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim()
      .slice(0, 80) || 'meeting_recording';

    // Helper to serve file with full Range / seeking support (essential for video timeline scrubbing)
    const serveFileWithRange = (filePath: string, contentType: string, downloadFileName?: string) => {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.get('range');

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      };

      if (downloadFileName) {
        const encoded = encodeURIComponent(downloadFileName);
        headers['Content-Disposition'] = `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
      }

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          return new NextResponse('Requested range not satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` },
          });
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        const readableStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
        headers['Content-Length'] = chunksize.toString();

        return new NextResponse(readableStream as any, {
          status: 206,
          headers,
        });
      }

      // Full file stream
      const fileStream = fs.createReadStream(filePath);
      const readableStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      headers['Content-Length'] = fileSize.toString();
      return new NextResponse(readableStream as any, {
        status: 200,
        headers,
      });
    };

    // 1. Audio MP3 Download
    if (requestedFormat === 'mp3' || requestedFormat === 'audio') {
      const mp3FileName = `${baseName}.mp3`;
      const cachedMp3Path = originalPath.replace(/\.[^.]+$/, '') + '.mp3';

      if (fs.existsSync(cachedMp3Path) && fs.statSync(cachedMp3Path).size > 1000) {
        return serveFileWithRange(cachedMp3Path, 'audio/mpeg', mp3FileName);
      }

      // Convert to pure standard MP3 via ffmpeg
      const ok = await runFfmpeg([
        '-y',
        '-i', originalPath,
        '-vn',
        '-acodec', 'libmp3lame',
        '-ar', '44100',
        '-ac', '2',
        '-ab', '192k',
        cachedMp3Path,
      ]);

      if (ok && fs.existsSync(cachedMp3Path) && fs.statSync(cachedMp3Path).size > 1000) {
        return serveFileWithRange(cachedMp3Path, 'audio/mpeg', mp3FileName);
      }

      // If ffmpeg failed or file has only video, produce valid mp3 audio or stream original
      return serveFileWithRange(originalPath, 'audio/webm', `${baseName}.webm`);
    }

    // 2. Video MP4 Download / Preview
    const mp4FileName = `${baseName}.mp4`;
    const cachedMp4Path = originalPath.replace(/\.[^.]+$/, '') + '.mp4';

    if (originalPath.endsWith('.mp4')) {
      return serveFileWithRange(originalPath, 'video/mp4', mp4FileName);
    }

    if (fs.existsSync(cachedMp4Path) && fs.statSync(cachedMp4Path).size > 1000) {
      return serveFileWithRange(cachedMp4Path, 'video/mp4', mp4FileName);
    }

    // Convert WebM to MP4 using ffmpeg with standard H.264 + AAC + faststart
    let converted = await runFfmpeg([
      '-y',
      '-i', originalPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast',
      '-crf', '24',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      cachedMp4Path,
    ]);

    if (!converted) {
      // Fallback fast copy remux
      converted = await runFfmpeg([
        '-y',
        '-i', originalPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        cachedMp4Path,
      ]);
    }

    if (converted && fs.existsSync(cachedMp4Path) && fs.statSync(cachedMp4Path).size > 1000) {
      return serveFileWithRange(cachedMp4Path, 'video/mp4', mp4FileName);
    }

    // Fallback: serve original file with range support
    const mimeType = recording.mimeType || 'video/webm';
    return serveFileWithRange(originalPath, mimeType, recording.fileName || `${baseName}.webm`);
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
