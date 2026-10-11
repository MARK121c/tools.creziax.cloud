import { NextRequest, NextResponse } from 'next/server';
import { verifySMTPConnection } from '@/lib/mailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSetting } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { target } = await req.json();

    if (target === 'smtp') {
      const result = await verifySMTPConnection();
      return NextResponse.json(result);
    }

    if (target === 'gemini') {
      const apiKey = await getSetting('gemini_api_key');
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: 'يرجى إدخال مفتاح Google Gemini API أولاً',
        });
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const res = await model.generateContent('مرحبا، تأكيد الاتصال بالذكاء الاصطناعي بنجاح');
        return NextResponse.json({
          success: true,
          message: `تم الاتصال بـ Google Gemini API بنجاح! الرد: "${res.response.text().trim().substring(0, 50)}..."`,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: `فشل الاتصال بـ Gemini: ${err.message || 'تأكد من صحة المفتاح'}`,
        });
      }
    }

    if (target === 'youtube') {
      const apiKey = await getSetting('youtube_api_key');
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: 'يرجى إدخال مفتاح YouTube Data API أولاً',
        });
      }

      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=test&maxResults=1&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
          return NextResponse.json({
            success: false,
            message: `فشل الاتصال بـ YouTube API: ${data.error.message}`,
          });
        }
        return NextResponse.json({
          success: true,
          message: 'تم الاتصال بـ YouTube Data API v3 بنجاح والبحث يعمل بشكل مثالي!',
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: `فشل الاتصال بـ YouTube: ${err.message}`,
        });
      }
    }

    if (target === 'telegram') {
      const token = await getSetting('telegram_bot_token');
      const chatId = await getSetting('telegram_chat_id');
      if (!token || !chatId) {
        return NextResponse.json({
          success: false,
          message: 'يرجى إدخال Bot Token و Chat ID الخاصين بتليجرام أولاً',
        });
      }

      try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🔔 *اختبار الاتصال بالنظام:*\nتم ربط سستم السيلز والمبيعات مع تليجرام بنجاح! ستصلك التنبيهات الفورية هنا فور حجز الاجتماعات.',
            parse_mode: 'Markdown',
          }),
        });
        const data = await res.json();
        if (data.ok) {
          return NextResponse.json({
            success: true,
            message: 'تم إرسال رسالة تجريبية إلى تليجرام بنجاح!',
          });
        }
        return NextResponse.json({
          success: false,
          message: `خطأ في تليجرام: ${data.description}`,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: `فشل الاتصال بتليجرام: ${err.message}`,
        });
      }
    }

    return NextResponse.json({ error: 'Target unknown' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Testing failed' }, { status: 500 });
  }
}
