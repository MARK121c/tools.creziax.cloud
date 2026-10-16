import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const driveLink = await getSetting('drive_backup_url', '');
    const autoUpload = (await getSetting('drive_auto_upload', 'true')) === 'true';
    const deleteAfterUpload = (await getSetting('drive_delete_local_after_upload', 'true')) === 'true';
    const retentionDays = await getSetting('drive_retention_days', '7');

    return NextResponse.json({
      success: true,
      settings: {
        driveLink,
        autoUpload,
        deleteAfterUpload,
        retentionDays: parseInt(retentionDays, 10) || 7,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driveLink, autoUpload, deleteAfterUpload, retentionDays } = body;

    if (driveLink !== undefined) {
      await setSetting('drive_backup_url', (driveLink || '').trim(), 'Google Drive Backup Folder / Upload URL');
    }

    if (autoUpload !== undefined) {
      await setSetting('drive_auto_upload', autoUpload ? 'true' : 'false', 'Auto upload to Drive after meeting');
    }

    if (deleteAfterUpload !== undefined) {
      await setSetting('drive_delete_local_after_upload', deleteAfterUpload ? 'true' : 'false', 'Purge local file after Drive upload');
    }

    if (retentionDays !== undefined) {
      await setSetting('drive_retention_days', String(retentionDays || 7), 'Local retention days before cleanup');
    }

    return NextResponse.json({
      success: true,
      message: 'تم حفظ إعدادات Google Drive بنجاح',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
