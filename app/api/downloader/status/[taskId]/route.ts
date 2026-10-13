import { NextRequest, NextResponse } from 'next/server';
import { downloadTasks } from '@/lib/downloader';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
  const task = downloadTasks.get(params.taskId);
  if (!task) {
    return NextResponse.json({ success: false, error: 'المهمة غير موجودة' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    status: task.status,
    progress: task.progress,
    message: task.message,
    fileName: task.fileName,
    error: task.error,
  });
}
