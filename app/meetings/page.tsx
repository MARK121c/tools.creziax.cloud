'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Zap,
  Send,
  Sparkles,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { MeetingBriefItem, LeadItem } from '@/types';
import { formatDate } from '@/lib/utils';

export default function MeetingsPage() {
  const [briefs, setBriefs] = useState<MeetingBriefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBriefs = async () => {
    try {
      const res = await fetch('/api/briefs');
      const data = await res.json();
      setBriefs(data.briefs || []);
    } catch (err) {
      console.error('Failed to load briefs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/calendly`);
    }
  }, []);

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Simulate Calendly Webhook Event for testing
  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setStatusMsg(null);
    try {
      const mockPayload = {
        event: 'invitee.created',
        payload: {
          name: 'محمد عبدالله (صانع محتوى تجريبي)',
          email: 'creator.demo@example.com',
          event: {
            start_time: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      };

      const res = await fetch('/api/webhooks/calendly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت المحاكاة');

      setStatusMsg({
        type: 'success',
        text: 'تم استقبال حدث الحجز الوهمي بنجاح، وتوليد ملف الإحاطة الذكي، وإرسال تنبيه Telegram!',
      });
      fetchBriefs();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشلت محاكاة الويب هوك' });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Meeting Intelligence & Webhook Briefs</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              ملفات إحاطة الاجتماعات والتنبيهات الفورية
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              توليد ملفات استخباراتية فور حجز الموعد عبر Calendly أو Cal.com مع نطاق الأسعار المقترح وتنبيه Telegram.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateWebhook}
              disabled={simulating}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Zap className={`w-4 h-4 ${simulating ? 'animate-bounce' : ''}`} />
              <span>{simulating ? 'جارٍ المحاكاة...' : 'محاكاة حجز موعد جديد (Test)'}</span>
            </button>
          </div>
        </div>

        {/* Webhook Endpoint Box */}
        <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>رابط الـ Webhook الخاص بك للربط مع Calendly / Cal.com:</span>
            </span>
            <button
              onClick={copyWebhook}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedWebhook ? 'تم النسخ!' : 'نسخ الرابط'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 truncate text-left dir-ltr">
            {webhookUrl || 'https://your-domain.com/api/webhooks/calendly'}
          </div>
          <p className="text-[11px] text-slate-400">
            أضف هذا الرابط في حسابك على Calendly كـ Webhook للاشتراك في حدث (Invitee Created).
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Briefings List */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-white">ملفات الإحاطة الذكية المسجلة ({briefs.length})</h3>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
            <p className="text-xs">جارٍ تحميل ملفات الإحاطة...</p>
          </div>
        ) : briefs.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400 border border-slate-800">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
            <h4 className="font-bold text-white text-base">لا توجد اجتماعات أو ملفات إحاطة بعد</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              عندما يقوم أي عميل بحجز موعد عبر رابط Calendly، سيقوم النظام تلقائياً بإعداد ملف إحاطة استراتيجي كامل هنا وإرساله لتليجرام.
            </p>
            <button
              onClick={handleSimulateWebhook}
              className="mt-4 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>تجربة محاكاة حجز موعد الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {briefs.map((brief) => (
              <div
                key={brief.id}
                className="glass-panel p-6 border border-slate-800 space-y-4 relative overflow-hidden"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-base">
                      {brief.guestName || brief.lead?.channelName || 'اجتماع عميل'}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {brief.guestEmail || brief.lead?.email || 'بدون إيميل'}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(brief.meetingDate)}</span>
                    </span>
                    {brief.sentToTelegram && (
                      <span className="text-[10px] text-blue-400 font-medium">✓ أُرسل لتليجرام</span>
                    )}
                  </div>
                </div>

                {/* Price & Niche pill */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-400">المجال:</span>
                    <span className="font-bold text-white">{brief.channelNiche || 'عام'}</span>
                  </div>
                  {brief.recommendedPrice && (
                    <div className="bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40 flex items-center gap-1.5 text-emerald-300 font-bold">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{brief.recommendedPrice}</span>
                    </div>
                  )}
                </div>

                {/* Briefing Text */}
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                  <p className="font-bold text-blue-400 mb-1">ملخص الإحاطة الاستراتيجية:</p>
                  {brief.briefingText}
                </div>

                {/* Strategy Closing Keys */}
                {brief.strategyNotes && (
                  <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-xs text-indigo-300">
                    <span className="font-bold">مفاتيح إغلاق الصفقة: </span>
                    {brief.strategyNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
