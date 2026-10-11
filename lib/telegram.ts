import { getSetting } from './settings';

export interface TelegramNotificationOptions {
  title: string;
  leadName: string;
  channelUrl?: string;
  niche?: string;
  subscriberCount?: number;
  meetingDate?: string;
  briefingText: string;
  recommendedPrice?: string;
  strategyNotes?: string;
}

export async function sendTelegramNotification(options: TelegramNotificationOptions): Promise<{ success: boolean; error?: string }> {
  const token = await getSetting('telegram_bot_token');
  const chatId = await getSetting('telegram_chat_id');

  if (!token || !chatId) {
    console.log('[Telegram Notification Skipped]: Missing bot token or chat ID');
    return { success: false, error: 'Telegram Bot Token or Chat ID not configured' };
  }

  const message = `
🚀 *${options.title}*

👤 *العميل / القناة:* ${options.leadName}
🎯 *النيش:* ${options.niche || 'غير محدد'}
👥 *المشتركين:* ${(options.subscriberCount || 0).toLocaleString()}
📅 *موعد الاجتماع:* ${options.meetingDate || 'قريباً'}
💰 *السعر المقترح:* ${options.recommendedPrice || 'حسب الاتفاق'}

━━━━━━━━━━━━━━━━━━━
📋 *ملخص الإحاطة الاستراتيجية:*
${options.briefingText}

💡 *مفاتيح إغلاق الصفقة (Deal Triggers):*
${options.strategyNotes || 'لا توجد ملاحظات إضافية'}
━━━━━━━━━━━━━━━━━━━
🔗 ${options.channelUrl || ''}
  `.trim();

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API error:', data);
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send Telegram message:', error);
    return { success: false, error: error.message };
  }
}
