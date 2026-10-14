import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tool = await (prisma as any).customTool.findUnique({
      where: { id: params.id },
    });

    if (!tool) {
      return NextResponse.json({ success: false, error: 'الأداة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tool });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await (prisma as any).customTool.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'تم حذف الأداة بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, url, icon, description } = await req.json();

    let formattedUrl = url?.trim();
    if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const updated = await (prisma as any).customTool.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(formattedUrl ? { url: formattedUrl } : {}),
        ...(icon ? { icon } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
      },
    });

    return NextResponse.json({ success: true, tool: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
