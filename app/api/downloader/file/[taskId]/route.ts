import { NextRequest, NextResponse } from 'next/server';
import { downloadTasks } from '@/lib/downloader';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
  const task = downloadTasks.get(params.taskId);

  if (!task || task.status !== 'done' || !task.filePath || !fs.existsSync(task.filePath)) {
    return NextResponse.json({ success: false, error: 'الملف غير جاهز أو غير موجود' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(task.filePath);
  const encodedName = encodeURIComponent(task.fileName || 'video.mp4');

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
    },
  });
}
