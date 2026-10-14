import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tools = await (prisma as any).customTool.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, tools });
  } catch (error: any) {
    console.error('Failed to fetch custom tools:', error);
    return NextResponse.json({ success: false, tools: [], error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, url, icon, description, category } = await req.json();

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'الاسم ورابط الأداة مطلوبان' },
        { status: 400 }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newTool = await (prisma as any).customTool.create({
      data: {
        name: name.trim(),
        url: formattedUrl,
        icon: icon || 'Globe',
        description: description?.trim() || '',
        category: category || 'custom',
      },
    });

    return NextResponse.json({ success: true, tool: newTool }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create custom tool:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
