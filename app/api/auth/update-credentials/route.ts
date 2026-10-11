import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, verifyPassword, hashPassword, createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'غير مصرح، يرجى تسجيل الدخول أولاً' }, { status: 401 });
    }

    const { email, currentPassword, newPassword, confirmPassword } = await req.json();

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Verify current password
    if (!currentPassword) {
      return NextResponse.json({ error: 'يرجى إدخال كلمة المرور الحالية لتأكيد التعديل' }, { status: 400 });
    }

    const isCurrentValid = verifyPassword(currentPassword, dbUser.password);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
    }

    const updateData: { email?: string; password?: string } = {};

    // Update Email if provided
    if (email && email.trim() !== dbUser.email) {
      const emailLower = email.trim().toLowerCase();
      // Check if email already taken
      const existing = await prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (existing && existing.id !== dbUser.id) {
        return NextResponse.json({ error: 'هذا البريد الإلكتروني مستخدم بالفعل' }, { status: 400 });
      }
      updateData.email = emailLower;
    }

    // Update Password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'يجب أن لا تقل كلمة المرور الجديدة عن 6 خانات' }, { status: 400 });
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        return NextResponse.json({ error: 'كلمة المرور الجديدة غير متطابقة مع التأكيد' }, { status: 400 });
      }
      updateData.password = hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'لم يتم إجراء أي تعديلات' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: updateData,
    });

    // Re-issue session token with new details
    const newToken = createSessionToken(updatedUser.id, updatedUser.email);
    const response = NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات الحساب وكلمة المرور بنجاح',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Update credentials error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء تحديث البيانات' },
      { status: 500 }
    );
  }
}
