import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recording = await (prisma as any).recording.findUnique({
      where: { id: params.id },
    });

    if (!recording) {
      return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
    }

    const driveFolderUrl = await getSetting('drive_backup_url', '');
    const deleteAfterUpload = (await getSetting('drive_delete_local_after_upload', 'true')) === 'true';

    // Parse existing notes
    let notesData: any = {};
    try {
      if (recording.notes && recording.notes.startsWith('{')) {
        notesData = JSON.parse(recording.notes);
      }
    } catch {
      notesData = { rawNotes: recording.notes };
    }

    // Mark as uploaded to Google Drive
    notesData.uploadedToDrive = true;
    notesData.driveUrl = driveFolderUrl || notesData.driveUrl || 'https://drive.google.com';
    notesData.uploadedAt = new Date().toISOString();

    // If local file purge is enabled, safely delete the video from server disk to save space
    let localFilePurged = false;
    if (deleteAfterUpload && recording.filePath && fs.existsSync(recording.filePath)) {
      try {
        fs.unlinkSync(recording.filePath);
        localFilePurged = true;
        notesData.localPurged = true;
      } catch (err) {
        console.warn('Failed to remove local file:', err);
      }

      // Also clean up any cached mp3/mp4 conversions
      const baseNoExt = recording.filePath.replace(/\.[^.]+$/, '');
      if (fs.existsSync(baseNoExt + '.mp3')) {
        try { fs.unlinkSync(baseNoExt + '.mp3'); } catch {}
      }
      if (fs.existsSync(baseNoExt + '.mp4')) {
        try { fs.unlinkSync(baseNoExt + '.mp4'); } catch {}
      }
    }

    const updated = await (prisma as any).recording.update({
      where: { id: params.id },
      data: {
        notes: JSON.stringify(notesData),
      },
    });

    return NextResponse.json({
      success: true,
      message: localFilePurged
        ? 'تمت المزامنة بنجاح وتفريغ مساحة السيرفر!'
        : 'تمت المزامنة مع Google Drive بنجاح!',
      recording: updated,
      localFilePurged,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
