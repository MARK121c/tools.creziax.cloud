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

    // 1. Audio MP3 Download
    if (requestedFormat === 'mp3' || requestedFormat === 'audio') {
      const mp3FileName = `${baseName}.mp3`;
      const cachedMp3Path = originalPath.replace(/\.[^.]+$/, '') + '.mp3';

      if (fs.existsSync(cachedMp3Path)) {
        const buffer = fs.readFileSync(cachedMp3Path);
        const encoded = encodeURIComponent(mp3FileName);
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length.toString(),
            'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
          },
        });
      }

      // Convert to MP3 via ffmpeg
      const ok = await runFfmpeg([
        '-y',
        '-i', originalPath,
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        cachedMp3Path,
      ]);

      if (ok && fs.existsSync(cachedMp3Path)) {
        const buffer = fs.readFileSync(cachedMp3Path);
        const encoded = encodeURIComponent(mp3FileName);
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length.toString(),
            'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
          },
        });
      }

      // Fallback: serve original audio
      const origBuf = fs.readFileSync(originalPath);
      const encodedOrig = encodeURIComponent(`${baseName}.webm`);
      return new NextResponse(origBuf, {
        headers: {
          'Content-Type': 'audio/webm',
          'Content-Length': origBuf.length.toString(),
          'Content-Disposition': `attachment; filename="${encodedOrig}"; filename*=UTF-8''${encodedOrig}`,
        },
      });
    }

    // 2. Video MP4 Download
    const mp4FileName = `${baseName}.mp4`;
    const cachedMp4Path = originalPath.replace(/\.[^.]+$/, '') + '.mp4';

    if (originalPath.endsWith('.mp4')) {
      const buffer = fs.readFileSync(originalPath);
      const encoded = encodeURIComponent(mp4FileName);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
        },
      });
    }

    if (fs.existsSync(cachedMp4Path)) {
      const buffer = fs.readFileSync(cachedMp4Path);
      const encoded = encodeURIComponent(mp4FileName);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
        },
      });
    }

    // Convert WebM to MP4 using ffmpeg fast remux/transcode
    let converted = await runFfmpeg([
      '-y',
      '-i', originalPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      cachedMp4Path,
    ]);

    if (!converted) {
      // Try fast copy remux
      converted = await runFfmpeg([
        '-y',
        '-i', originalPath,
        '-c', 'copy',
        cachedMp4Path,
      ]);
    }

    if (converted && fs.existsSync(cachedMp4Path)) {
      const buffer = fs.readFileSync(cachedMp4Path);
      const encoded = encodeURIComponent(mp4FileName);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
        },
      });
    }

    // Fallback: serve original file with MP4/WebM content disposition
    const fileBuffer = fs.readFileSync(originalPath);
    const mimeType = recording.mimeType || 'video/webm';
    const fallbackName = encodeURIComponent(recording.fileName || `${baseName}.webm`);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${fallbackName}`,
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
