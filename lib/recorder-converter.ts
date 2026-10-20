import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Runs ffmpeg to convert WebM / recorded stream to standard MP4 with H.264 + AAC.
 * - Enforces constant 30fps with -vsync 1 / -r 30 to fix Chrome static screen dropouts.
 * - Uses atomic write with .tmp file to prevent corrupt or partial files.
 * - Sets a generous 15-minute timeout so recordings over 5 minutes never get killed early.
 */
export function convertToMp4(
  originalPath: string,
  cachedMp4Path: string,
  timeoutMs: number = 900000
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(originalPath)) {
        return resolve(false);
      }

      const tempMp4Path = `${cachedMp4Path}.tmp.${Date.now()}`;

      // Clean up any stale temp files first
      try {
        const dir = path.dirname(cachedMp4Path);
        const staleFiles = fs
          .readdirSync(dir)
          .filter((f) => f.startsWith(path.basename(cachedMp4Path) + '.tmp.'));
        for (const sf of staleFiles) {
          try {
            fs.unlinkSync(path.join(dir, sf));
          } catch {}
        }
      } catch {}

      const args = [
        '-y',
        '-fflags',
        '+genpts',
        '-analyzeduration',
        '100M',
        '-probesize',
        '100M',
        '-i',
        originalPath,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '26',
        '-pix_fmt',
        'yuv420p',
        '-r',
        '30',
        '-vsync',
        '1',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        tempMp4Path,
      ];

      const proc = spawn('ffmpeg', args, { windowsHide: true });

      const timer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
        if (fs.existsSync(tempMp4Path)) {
          try {
            fs.unlinkSync(tempMp4Path);
          } catch {}
        }
        resolve(false);
      }, timeoutMs);

      proc.on('error', (err) => {
        clearTimeout(timer);
        console.warn('ffmpeg convertToMp4 error:', err.message);
        if (fs.existsSync(tempMp4Path)) {
          try {
            fs.unlinkSync(tempMp4Path);
          } catch {}
        }
        resolve(false);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && fs.existsSync(tempMp4Path) && fs.statSync(tempMp4Path).size > 1000) {
          try {
            fs.renameSync(tempMp4Path, cachedMp4Path);
            resolve(true);
          } catch (renameErr) {
            console.error('Failed to rename temp MP4:', renameErr);
            resolve(false);
          }
        } else {
          if (fs.existsSync(tempMp4Path)) {
            try {
              fs.unlinkSync(tempMp4Path);
            } catch {}
          }
          resolve(false);
        }
      });
    } catch (err) {
      console.error('convertToMp4 exception:', err);
      resolve(false);
    }
  });
}

/**
 * Runs ffmpeg to convert recording to pure MP3 audio.
 */
export function convertToMp3(
  originalPath: string,
  cachedMp3Path: string,
  timeoutMs: number = 300000
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(originalPath)) {
        return resolve(false);
      }

      const tempMp3Path = `${cachedMp3Path}.tmp.${Date.now()}`;

      const args = [
        '-y',
        '-i',
        originalPath,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-ab',
        '192k',
        tempMp3Path,
      ];

      const proc = spawn('ffmpeg', args, { windowsHide: true });

      const timer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
        if (fs.existsSync(tempMp3Path)) {
          try {
            fs.unlinkSync(tempMp3Path);
          } catch {}
        }
        resolve(false);
      }, timeoutMs);

      proc.on('error', (err) => {
        clearTimeout(timer);
        console.warn('ffmpeg convertToMp3 error:', err.message);
        if (fs.existsSync(tempMp3Path)) {
          try {
            fs.unlinkSync(tempMp3Path);
          } catch {}
        }
        resolve(false);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && fs.existsSync(tempMp3Path) && fs.statSync(tempMp3Path).size > 1000) {
          try {
            fs.renameSync(tempMp3Path, cachedMp3Path);
            resolve(true);
          } catch {
            resolve(false);
          }
        } else {
          if (fs.existsSync(tempMp3Path)) {
            try {
              fs.unlinkSync(tempMp3Path);
            } catch {}
          }
          resolve(false);
        }
      });
    } catch (err) {
      console.error('convertToMp3 exception:', err);
      resolve(false);
    }
  });
}
