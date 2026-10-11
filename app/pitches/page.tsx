'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Mail,
  Sliders,
  Settings,
  Flame,
} from 'lucide-react';
import { PitchItem, LeadItem } from '@/types';
import { PitchModal } from '@/components/PitchModal';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function PitchStudioPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<{ subject: string; body: string; personalizedStrategy: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Modals
  const [modalLead, setModalLead] = useState<LeadItem | null>(null);
  const [modalPitch, setModalPitch] = useState<PitchItem | null>(null);
  const [pitchModalOpen, setPitchModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/leads?limit=100')
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads || []);
        if (d.leads && d.leads.length > 0) {
          setSelectedLeadId(d.leads[0].id);
        }
      });
  }, []);

  const handleGenerate = async () => {
    if (!selectedLeadId) {
      setStatusMsg({ type: 'error', text: 'يرجى اختيار صانع محتوى من القائمة أولاً' });
      return;
    }

    setGenerating(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/ai/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          customInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التوليد');

      setGeneratedPitch(data.pitch);
      setStatusMsg({ type: 'success', text: 'تم توليد العرض فائق التخصيص بنجاح عبر Google Gemini!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'حدث خطأ أثناء التوليد' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSendLive = async () => {
    const currentLead = leads.find((l) => l.id === selectedLeadId);
    if (!currentLead) return;

    if (!currentLead.email) {
      setStatusMsg({ type: 'error', text: 'هذا العميل لا يمتلك بريد إلكتروني مسجل. يرجى إدخاله في الـ CRM أولاً' });
      return;
    }

    if (!generatedPitch) return;

    setSendingEmail(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.id,
          targetEmail: currentLead.email,
          customSubject: generatedPitch.subject,
          customBody: generatedPitch.body,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل الإرسال');

      setStatusMsg({ type: 'success', text: `تم إرسال العرض بنجاح إلى ${currentLead.email}!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل الإرسال' });
    } finally {
      setSendingEmail(false);
    }
  };

  const copyText = () => {
    if (!generatedPitch) return;
    navigator.clipboard.writeText(`الموضوع: ${generatedPitch.subject}\n\n${generatedPitch.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentSelectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google Gemini AI Cold Pitch Studio</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              استوديو صياغة العروض التسويقية الذكية
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              محرك ذكاء اصطناعي يقوم بتحليل نيش القناة، ومقاطع الفيديو الأخيرة لكتابة بريد عالي التحويل وغير متطفل.
            </p>
          </div>

          <Link
            href="/settings"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all self-start"
          >
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>تعديل برومبت الوكالة</span>
          </Link>
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

      {/* Generator Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="glass-panel p-6 lg:col-span-5 space-y-4 border border-slate-800 h-fit">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-400" />
            <span>إعدادات التوليد الفوري</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اختر القناة / صانع المحتوى المستهدف
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.channelName} ({l.niche || 'عام'} - {l.email ? 'يوجد إيميل' : 'بدون إيميل'})
                </option>
              ))}
            </select>
          </div>

          {currentSelectedLead && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">البريد:</span>
                <span className="font-mono text-emerald-400">{currentSelectedLead.email || 'غير مسجل'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المشتركين:</span>
                <span>{currentSelectedLead.subscriberCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المجال:</span>
                <span>{currentSelectedLead.niche || 'عام'}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              توجيهات مخصصة (Custom Focus)
            </label>
            <textarea
              rows={3}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="مثال: ركز على عرض عينة مجانية لتحسين الـ Retention Rate في أول دقيقة..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'جارٍ التوليد بواسطة Gemini...' : 'توليد العرض بالذكاء الاصطناعي'}</span>
          </button>
        </div>

        {/* Live Preview Column */}
        <div className="glass-panel p-6 lg:col-span-7 border border-slate-800 flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>المعاينة المباشرة للبريد الترويجي (Live Pitch)</span>
              </h3>
              {generatedPitch && (
                <button
                  onClick={copyText}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-lg"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
                </button>
              )}
            </div>

            {generatedPitch ? (
              <div className="space-y-4 text-xs">
                {/* Subject */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الموضوع (Subject):</span>
                  <p className="font-bold text-white text-sm">{generatedPitch.subject}</p>
                </div>

                {/* Body */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-80 overflow-y-auto leading-relaxed text-slate-200 whitespace-pre-line text-xs font-sans">
                  {generatedPitch.body}
                </div>

                {/* Internal Strategy */}
                <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-[11px] text-purple-300">
                  <span className="font-bold">ملاحظات الذكاء الاصطناعي للفريق: </span>
                  {generatedPitch.personalizedStrategy}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-500">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30 text-purple-400" />
                <p className="font-semibold text-slate-400">لم يتم توليد عرض بعد</p>
                <p className="text-xs mt-1">اختر القناة من القائمة الجانبية واضغط على (توليد العرض بالذكاء الاصطناعي).</p>
              </div>
            )}
          </div>

          {/* Bottom Send Action */}
          {generatedPitch && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-4">
              <span className="text-[11px] text-slate-400">
                جاهز للإرسال الفوري عبر Hostinger SMTP
              </span>
              <button
                onClick={handleSendLive}
                disabled={sendingEmail}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingEmail ? 'جارٍ الإرسال...' : 'إرسال العرض للعميل الآن'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
