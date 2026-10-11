import nodemailer from 'nodemailer';
import { getSetting } from './settings';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  bookingLink?: string;
  agencyName?: string;
}

export async function createTransporter() {
  const host = await getSetting('smtp_host', 'smtp.hostinger.com');
  const port = parseInt(await getSetting('smtp_port', '465'), 10);
  const user = await getSetting('smtp_user');
  const pass = await getSetting('smtp_pass');

  if (!user || !pass) {
    return null;
  }

  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function verifySMTPConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'بيانات SMTP غير مكتملة (يرجى إدخال اسم المستخدم وكلمة المرور في الإعدادات)',
      };
    }

    await transporter.verify();
    return {
      success: true,
      message: 'تم الاتصال بخادم SMTP بنجاح وجاهز للإرسال!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `فشل الاتصال بخادم SMTP: ${error.message || 'خطأ غير معروف'}`,
    };
  }
}

export async function sendOutreachEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, body, bookingLink } = options;
  const senderName = await getSetting('smtp_sender_name', 'Apex Media Agency');
  const senderEmail = await getSetting('smtp_user', 'outreach@yourdomain.com');
  const agencyName = await getSetting('agency_name', 'Apex Media');

  const transporter = await createTransporter();

  // HTML format with elegant RTL styling
  const formattedBody = body
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => `<p style="margin-bottom: 16px; line-height: 1.8; color: #1e293b; font-size: 15px;">${line}</p>`)
    .join('');

  const bookingButtonHtml = bookingLink
    ? `
      <div style="margin: 30px 0; text-align: center;">
        <a href="${bookingLink}" target="_blank" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          📅 حجز مكالمة استكشافية (15 دقيقة)
        </a>
      </div>
    `
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
      </style>
    </head>
    <body style="font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 30px 15px; margin: 0; direction: rtl; text-align: right;">
      <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; color: #ffffff; text-align: right;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #60a5fa;">${agencyName}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">شريكك الاستراتيجي في إنتاج المحتوى ونمو القنوات</p>
        </div>
        <div style="padding: 30px 24px;">
          ${formattedBody}
          ${bookingButtonHtml}
        </div>
        <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">تم إرسال هذا البريد الترويجي المخصص بواسطة ${agencyName}.</p>
          <p style="margin: 4px 0 0 0;">إذا كنت لا ترغب في استلام رسائل مشابهة مستقبلاً، يمكنك الرد بكلمة "إلغاء".</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[SMTP SIMULATION] Email sent to ${to} with subject "${subject}"`);
    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text: body,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Failed to send email via SMTP:', error);
    return {
      success: false,
      error: error.message || 'فشل إرسال البريد الإلكتروني عبر خادم SMTP',
    };
  }
}
