'use client';

import React, { useState } from 'react';
import { X, Sparkles, Send, CheckCircle2, AlertCircle, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { LeadItem, PitchItem } from '@/types';

interface PitchModalProps {
  lead: LeadItem | null;
  pitch: PitchItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PitchModal: React.FC<PitchModalProps> = ({
  lead,
  pitch: initialPitch,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !lead) return null;

  const [subject, setSubject] = useState(initialPitch?.subject || '');
  const [body, setBody] = useState(initialPitch?.body || '');
  const [strategy, setStrategy] = useState(initialPitch?.personalizedStrategy || '');
  const [email, setEmail] = useState(lead.email || '');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-generate pitch using Gemini AI
  const handleRegenerate = async () => {
    setGenerating(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/ai/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          channelName: lead.channelName,
          customInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate pitch');

      setSubject(data.pitch.subject);
      setBody(data.pitch.body);
      setStrategy(data.pitch.personalizedStrategy);
      setStatusMsg({ type: 'success', text: 'تم توليد وتخصيص العرض بواسطة الذكاء الاصطناعي بنجاح!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل توليد العرض' });
    } finally {
      setGenerating(false);
    }
  };

  // Send Email via Nodemailer SMTP
  const handleSendEmail = async () => {
    if (!email) {
      setStatusMsg({ type: 'error', text: 'يرجى إدخال بريد إلكتروني صالح للمرسل إليه' });
      return;
    }
    if (!body) {
      setStatusMsg({ type: 'error', text: 'نص البريد فارغ، يرجى توليد العرض أولاً' });
      return;
    }

    setSending(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          targetEmail: email,
          customSubject: subject,
          customBody: body,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إرسال البريد');
      }

      setStatusMsg({ type: 'success', text: 'تم إرسال البريد الإلكتروني بنجاح وتحديث حالة العميل إلى (تم الإرسال)!' });
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل الإرسال عبر SMTP' });
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`الموضوع: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                عرض الذكاء الاصطناعي المخصص | {lead.channelName}
              </h3>
              <p className="text-xs text-slate-400">
                مراجعة وتعديل العرض الترويجي قبل الإرسال عبر Nodemailer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-3 text-sm ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Email Recipient Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                بريد صانع المحتوى (Recipient Email)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                تعليمات إضافية للذكاء الاصطناعي (اختياري)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="مثال: ركز على مونتاج البودكاست والشورتس"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                  <span>{generating ? 'توليد...' : 'إعادة التوليد'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              عنوان البريد الإلكتروني (Subject)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="عنوان العرض المشوق..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Pitch Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                نص العرض الترويجي المخصص (Pitch Body)
              </label>
              <button
                onClick={copyToClipboard}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="نص العرض المولد..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Strategy Notes */}
          {strategy && (
            <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300">
              <span className="font-bold">استراتيجية الإغلاق المقترحة للفريق: </span>
              {strategy}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            إغلاق
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
              <span>{sending ? 'جارٍ الإرسال...' : 'إرسال العرض عبر البريد الآن'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
