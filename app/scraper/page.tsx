'use client';

import React, { useState } from 'react';
import {
  Youtube,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  Video,
  Eye,
  Mail,
  Download,
  FileSpreadsheet,
  Plus,
  ExternalLink,
  Sparkles,
  Database,
  CloudUpload,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { YouTubeScrapeResult } from '@/types';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

const NICHE_PRESETS = [
  'تسويق إلكتروني',
  'صناع محتوى',
  'بودكاست',
  'مونتاج وفيديو',
  'عقارات واستثمار',
  'تجارة إلكترونية',
  'ذكاء اصطناعي',
  'تطوير الذات',
  'تقنية وبرمجة',
];

export default function ScraperPage() {
  const [query, setQuery] = useState('تسويق إلكتروني');
  const [maxResults, setMaxResults] = useState(20);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<YouTubeScrapeResult[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search YouTube via live YouTube Data API
  const handleSearch = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setSaveStatus(null);
    setSelectedChannels({});
    try {
      const res = await fetch(`/api/scraper/youtube?query=${encodeURIComponent(q)}&maxResults=${maxResults}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل البحث في يوتيوب');
      setResults(data.channels || []);

      // Auto-select non-duplicates
      const initialSelection: Record<string, boolean> = {};
      (data.channels || []).forEach((ch: YouTubeScrapeResult) => {
        if (!ch.isDuplicate) {
          initialSelection[ch.channelId] = true;
        }
      });
      setSelectedChannels(initialSelection);
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'حدث خطأ أثناء فحص يوتيوب' });
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    const allSelected = results.every((r) => selectedChannels[r.channelId]);
    const updated: Record<string, boolean> = {};
    results.forEach((r) => {
      updated[r.channelId] = !allSelected;
    });
    setSelectedChannels(updated);
  };

  // Sync selected leads directly to Notion CRM ("العملاء - متابعة CRM")
  const handleSyncToNotion = async () => {
    const leadsToSync = results.filter((r) => selectedChannels[r.channelId]);
    if (leadsToSync.length === 0) {
      setSaveStatus({ type: 'error', message: 'يرجى تحديد قناة واحدة على الأقل للإرسال لنوشن' });
      return;
    }

    setSyncingNotion(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: leadsToSync.map((ch) => ({
            channelName: ch.channelName,
            channelUrl: ch.channelUrl,
            email: ch.email,
            subscribers: ch.subscriberCount,
            niche: query,
            description: ch.description,
          })),
          niche: query,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشلت المزامنة مع Notion');
      }

      setSaveStatus({
        type: 'success',
        message: `🌟 تم إرسال ${data.syncedCount} عميل بنجاح إلى جدول Notion ("العملاء - متابعة CRM")! (تم تخطي ${data.skippedCount} مكرر)`,
      });
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message.includes('404')
          ? '⚠️ يرجى التأكد من ربط التكامل Mark_Personal_OS بصفحة جدول نوشن عبر (...) ثم Connections'
          : `خطأ في ربط Notion: ${err.message}`,
      });
    } finally {
      setSyncingNotion(false);
    }
  };

  // Export leads directly to Excel / CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    const selectedList = results.filter((r) => selectedChannels[r.channelId]);
    const items = selectedList.length > 0 ? selectedList : results;

    if (items.length === 0) {
      setSaveStatus({ type: 'error', message: 'لا توجد بيانات لتصديرها كملف Excel' });
      return;
    }

    const headers = [
      'اسم القناة / العميل',
      'المجال / النتش',
      'البريد الإلكتروني',
      'روابط التواصل الاجتماعي',
      'عدد المشتركين',
      'عدد الفيديوهات',
      'إجمالي المشاهدات',
      'رابط القناة',
      'وصف القناة'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = items.map((ch) => [
      escapeCsv(ch.channelName),
      escapeCsv(query || 'عام'),
      escapeCsv(ch.email || ''),
      escapeCsv((ch.socialLinks || []).join(' | ')),
      escapeCsv(ch.subscriberCount || 0),
      escapeCsv(ch.videoCount || 0),
      escapeCsv(ch.viewCount || 0),
      escapeCsv(ch.channelUrl),
      escapeCsv(ch.description || '')
    ]);

    // \uFEFF ensures Excel displays Arabic text properly without encoding artifacts
    const csvContent = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeQuery = (query || 'leads').trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
    link.href = url;
    link.setAttribute('download', `Creziax_Leads_${safeQuery}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSaveStatus({
      type: 'success',
      message: `📊 تم تحميل ملف Excel بنجاح لـ ${items.length} صانع محتوى!`,
    });
  };

  const selectedCount = Object.values(selectedChannels).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="glass-panel p-6 border border-slate-800 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube Data API v3 Live</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <Database className="w-3.5 h-3.5" />
                <span>Notion CRM Connected</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              صائد وصناع محتوى يوتيوب المباشر ➔ Notion CRM
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              ابحث عن القنوات وصناع المحتوى، استخرج الإيميلات وروابط التواصل، وأرسلهم بنقرة واحدة لجدول Notion الخاص بشركتك.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>جدول: العملاء - متابعة CRM</span>
            </div>
          </div>
        </div>

        {/* Search Bar & Filters */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="أدخل الكلمات المفتاحية أو المجال (مثال: تسويق، عقارات، مونتاج، بودكاست)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-11 pl-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-red-500 font-semibold"
              >
                <option value={10}>10 نتائج</option>
                <option value={20}>20 نتيجة</option>
                <option value={30}>30 نتيجة</option>
                <option value={50}>50 نتيجة</option>
              </select>

              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all flex-shrink-0"
              >
                <Search className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'جارٍ البحث المباشر...' : 'فحص القنوات'}</span>
              </button>
            </div>
          </div>

          {/* Quick Niche Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>المجالات المقترحة:</span>
            </span>
            {NICHE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setQuery(preset);
                  handleSearch(preset);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 font-medium ${
                  query === preset
                    ? 'bg-red-600/20 text-red-300 border-red-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save / Sync Status Notification */}
      {saveStatus && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in border ${
            saveStatus.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-lg shadow-rose-500/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <span className="font-semibold">{saveStatus.message}</span>
          </div>
        </div>
      )}

      {/* Scraped Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    results.every((r) => selectedChannels[r.channelId])
                      ? 'bg-blue-600 border-blue-500'
                      : 'border-slate-600'
                  }`}
                >
                  {results.every((r) => selectedChannels[r.channelId]) && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </div>
                <span>تحديد الكل ({results.length})</span>
              </button>
              <span className="text-xs font-bold text-slate-300">
                (المحدد: {selectedCount} عميل)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Export to Excel Button */}
              <button
                onClick={handleExportToExcel}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
                title="تنزيل البيانات كملف إكسل شيت متوافق مع Excel و Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تنزيل Excel ({selectedCount > 0 ? selectedCount : results.length})</span>
              </button>

              {/* Sync to Notion Button */}
              <button
                onClick={handleSyncToNotion}
                disabled={syncingNotion || selectedCount === 0}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <CloudUpload className={`w-4 h-4 ${syncingNotion ? 'animate-bounce' : ''}`} />
                <span>{syncingNotion ? 'جارٍ الإرسال إلى Notion...' : `إرسال إلى Notion CRM (${selectedCount})`}</span>
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((channel) => {
              const isSelected = !!selectedChannels[channel.channelId];

              return (
                <div
                  key={channel.channelId}
                  className={`glass-panel p-5 border rounded-2xl transition-all relative ${
                    channel.isDuplicate
                      ? 'border-slate-800 opacity-80'
                      : isSelected
                      ? 'border-red-500/60 bg-slate-900/90 shadow-lg shadow-red-500/5'
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Select Checkbox & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSelect(channel.channelId)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'border-slate-600 bg-slate-950'
                        }`}
                      >
                        {isSelected && <span className="text-xs font-bold">✓</span>}
                      </button>

                      <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300 overflow-hidden border border-slate-700 flex-shrink-0 shadow-md">
                        {channel.avatarUrl ? (
                          <img src={channel.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Youtube className="w-5 h-5 text-red-500" />
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">
                          {channel.channelName}
                        </h4>
                        <a
                          href={channel.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          <span>رابط القناة</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      جاهز للإرسال 🚀
                    </span>
                  </div>

                  {/* Channel Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center my-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">المشتركين</span>
                      <span className="text-xs font-bold text-white">
                        {formatNumber(channel.subscriberCount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">الفيديوهات</span>
                      <span className="text-xs font-bold text-white">{channel.videoCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">المشاهدات</span>
                      <span className="text-xs font-bold text-white">{channel.viewCount}</span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    {channel.description || 'لا يوجد وصف متاح للقناة.'}
                  </p>

                  {/* Contact Email Field */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {channel.email ? (
                      <span className="font-mono text-emerald-400 font-bold truncate">
                        {channel.email}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">
                        لم يذكر إيميل بالوصف المتاح (سيتم إرسال رابط القناة لـ Notion)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
