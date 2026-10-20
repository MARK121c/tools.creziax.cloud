import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings';
import fs from 'fs';
import path from 'path';
import { convertToMp4 } from '@/lib/recorder-converter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || `تسجيل_اجتماع_${new Date().toISOString().slice(0, 10)}`;
    const durationSeconds = parseInt((formData.get('duration') as string) || '0', 10);
    const notes = (formData.get('notes') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No video file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure storage directory exists
    const storageDir = path.join(process.cwd(), 'storage', 'recordings');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const timestamp = Date.now();
    const safeTitle = title.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
    const extension = file.type.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `${safeTitle}_${timestamp}.${extension}`;
    const filePath = path.join(storageDir, fileName);

    fs.writeFileSync(filePath, buffer);

    // Pre-convert WebM to universal MP4 in the background so downloads are instant
    if (extension === 'webm') {
      const cachedMp4Path = filePath.replace(/\.[^.]+$/, '') + '.mp4';
      convertToMp4(filePath, cachedMp4Path).catch((convErr) => {
        console.warn('Background MP4 pre-conversion failed:', convErr);
      });
    }

    const driveBackupUrl = await getSetting('drive_backup_url', '');
    const autoUpload = (await getSetting('drive_auto_upload', 'true')) === 'true';

    const notesObj: any = {
      driveUrl: driveBackupUrl || null,
      uploadedToDrive: false,
      autoUploadEnabled: autoUpload,
      userNotes: notes,
    };

    const recording = await (prisma as any).recording.create({
      data: {
        title,
        durationSeconds,
        fileSize: buffer.length,
        fileName,
        filePath,
        mimeType: file.type || `video/${extension}`,
        source: 'browser_capture',
        notes: JSON.stringify(notesObj),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Recording saved successfully',
      recording,
    });
  } catch (error: any) {
    console.error('Recording upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload recording' },
      { status: 500 }
    );
  }
}
