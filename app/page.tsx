'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  Mail,
  MessageSquareReply,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  Youtube,
  Zap,
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadItem, AnalyticsData } from '@/types';
import { formatNumber, formatDate } from '@/lib/utils';
import { PitchModal } from '@/components/PitchModal';
import { LeadModal } from '@/components/LeadModal';

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Quick Batch Trigger: Generate Pitches for all captured leads
  const handleBatchGenerate = async () => {
    setBatchLoading(true);
    setBatchMessage(null);
    try {
      const res = await fetch('/api/ai/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const resData = await res.json();
      setBatchMessage(`تم توليد ${resData.generatedCount || 0} عرض جديد بنجاح!`);
      fetchAnalytics();
    } catch (err: any) {
      setBatchMessage(`حدث خطأ أثناء التوليد: ${err.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // Quick Batch Trigger: Send Emails to all ready leads
  const handleBatchSend = async () => {
    if (!confirm('هل أنت متأكد من إرسال العروض لجميع العملاء الجاهزين؟')) return;
    setBatchLoading(true);
    setBatchMessage(null);
    try {
      const res = await fetch('/api/email/batch-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const resData = await res.json();
      setBatchMessage(`تم إرسال ${resData.sentCount || 0} بريد إلكتروني بنجاح!`);
      fetchAnalytics();
    } catch (err: any) {
      setBatchMessage(`حدث خطأ أثناء الإرسال: ${err.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">جارٍ تحميل إحصائيات النظام ولوحة المؤشرات...</p>
      </div>
    );
  }

  const breakdown = data?.statusBreakdown || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Quick Actions */}
      <div className="glass-panel p-6 md:p-8 relative overflow-hidden border border-blue-500/20">
        <div className="absolute -left-16 -top-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>نظام مبيعات وتسويق ذاتي ذكي</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              لوحة التحكم ومؤشرات الأداء | CRM & Growth Hub
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              إدارة شاملة لدورة المبيعات: تنقيب فوري في يوتيوب، صياغة عروض مخصصة بالذكاء الاصطناعي، إرسال إيميلات عبر Hostinger SMTP، وإحاطات فورية قبل اجتماعات الإغلاق.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleBatchGenerate}
              disabled={batchLoading}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>توليد عروض AI للكل</span>
            </button>
            <button
              onClick={handleBatchSend}
              disabled={batchLoading}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>إرسال الإيميلات الجاهزة</span>
            </button>
            <Link
              href="/scraper"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all"
            >
              <Youtube className="w-4 h-4 text-red-500" />
              <span>صائد جديد</span>
            </Link>
          </div>
        </div>

        {batchMessage && (
          <div className="mt-4 p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl text-xs text-blue-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{batchMessage}</span>
          </div>
        )}
      </div>

      {/* Module A: KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="إجمالي صناع المحتوى"
          value={data?.totalLeads || 0}
          subtitle={`${breakdown.lead_captured || 0} تم استخراجهم حديثاً`}
          icon={Users}
          colorVariant="blue"
        />
        <StatCard
          title="عروض AI جاهزة"
          value={data?.pitchesReady || 0}
          subtitle="بانتظار الإرسال الفوري"
          icon={Sparkles}
          colorVariant="purple"
        />
        <StatCard
          title="إيميلات تم إرسالها"
          value={data?.emailsSent || 0}
          subtitle="عبر Hostinger SMTP"
          icon={Mail}
          colorVariant="amber"
        />
        <StatCard
          title="ردود وتفاعل"
          value={data?.repliesReceived || 0}
          subtitle="صناع محتوى مهتمون"
          icon={MessageSquareReply}
          colorVariant="cyan"
        />
        <StatCard
          title="اجتماعات مجدولة"
          value={data?.meetingsBooked || 0}
          subtitle={`معدل تحويل ${data?.conversionRate || 0}%`}
          icon={CalendarCheck}
          colorVariant="emerald"
        />
      </div>

      {/* Conversion Funnel & Pipeline Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">مراحل مسار المبيعات (Sales Funnel)</h3>
                <p className="text-xs text-slate-400">تتبع تقدم العملاء من لحظة الجلب حتى إغلاق العقود</p>
              </div>
            </div>
            <Link
              href="/crm"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>فتح جدول الـ CRM</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>

          <div className="space-y-3.5 pt-2">
            {[
              { label: '1. تم جلب العميل (Scraped)', count: breakdown.lead_captured || 0, color: 'bg-blue-500' },
              { label: '2. العرض جاهز بالذكاء الاصطناعي (Pitch Ready)', count: breakdown.pitch_ready || 0, color: 'bg-purple-500' },
              { label: '3. تم إرسال البريد الترويجي (Email Sent)', count: breakdown.email_sent || 0, color: 'bg-amber-500' },
              { label: '4. رد العميل والتفاعل (Replied)', count: breakdown.replied || 0, color: 'bg-cyan-500' },
              { label: '5. تم حجز موعد مكالمة (Meeting Booked)', count: breakdown.meeting_booked || 0, color: 'bg-emerald-500' },
              { label: '6. تم إغلاق الصفقة بنجاح 🚀 (Closed Deal)', count: breakdown.closed || 0, color: 'bg-green-400' },
            ].map((step, idx) => {
              const percentage = (data?.totalLeads || 0) > 0 ? ((step.count / (data?.totalLeads || 1)) * 100).toFixed(0) : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">{step.label}</span>
                    <span className="text-slate-400">{step.count} عميل ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full ${step.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(Number(percentage), 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost-free Architecture Details Card */}
        <div className="glass-panel p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-2">بنية النظام المجانية 100%</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              يعمل هذا النظام بشكل مستقل بالكامل داخل سيرفر Hostinger VPS دون أي اشتراكات خارجية مدفوعة:
            </p>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span><strong>قاعدة البيانات:</strong> SQLite مدمجة ومجانية</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span><strong>الذكاء الاصطناعي:</strong> Gemini 1.5 Flash Free Tier</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span><strong>صائد القنوات:</strong> YouTube API v3 (10,000 وحدة/يوم)</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span><strong>الإرسال:</strong> Nodemailer + Hostinger SMTP</span>
              </div>
            </div>
          </div>

          <Link
            href="/settings"
            className="w-full text-center bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 transition-colors mt-4 block"
          >
            إعدادات ومفاتيح الربط (Settings)
          </Link>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">أحدث العملاء المضافين إلى النظام</h3>
            <p className="text-xs text-slate-400">قائمة بأحدث القنوات التي تم استخراجها والتحقق منها</p>
          </div>
          <Link
            href="/crm"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            <span>عرض كل العملاء</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 pr-2 font-semibold">صانع المحتوى / القناة</th>
                <th className="pb-3 font-semibold">البريد الإلكتروني</th>
                <th className="pb-3 font-semibold">المشتركين</th>
                <th className="pb-3 font-semibold">المجال</th>
                <th className="pb-3 font-semibold">الحالة</th>
                <th className="pb-3 pl-2 font-semibold">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(data?.recentLeads || []).map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300 overflow-hidden">
                        {lead.avatarUrl ? (
                          <img src={lead.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Youtube className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{lead.channelName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono text-slate-300">
                    {lead.email || <span className="text-slate-500 font-sans italic">غير متوفر</span>}
                  </td>
                  <td className="py-3.5 font-bold text-slate-200">
                    {formatNumber(lead.subscriberCount)}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                      {lead.niche || 'عام'}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setPitchModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 transition-colors"
                        title="عرض أو إرسال العرض"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setLeadModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors font-medium text-[11px]"
                      >
                        تفاصيل
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PitchModal
        lead={selectedLead}
        pitch={selectedLead?.pitches?.[0] || null}
        isOpen={pitchModalOpen}
        onClose={() => setPitchModalOpen(false)}
        onSuccess={fetchAnalytics}
      />

      <LeadModal
        leadId={selectedLead?.id || null}
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onUpdate={fetchAnalytics}
        onOpenPitch={(lead) => {
          setSelectedLead(lead);
          setPitchModalOpen(true);
        }}
      />
    </div>
  );
}
