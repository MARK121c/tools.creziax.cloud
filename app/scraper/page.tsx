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
  Plus,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { YouTubeScrapeResult } from '@/types';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

const NICHE_PRESETS = [
  'مونتاج فيديو',
  'صناع محتوى',
  'بودكاست',
  'ريادة أعمال',
  'ذكاء اصطناعي',
  'فيتنس وصحة',
  'تطوير الذات',
  'تقنية وبرمجة',
  'تعليم لغات',
];

export default function ScraperPage() {
  const [query, setQuery] = useState('مونتاج فيديو');
  const [maxResults, setMaxResults] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<YouTubeScrapeResult[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search YouTube
  const handleSearch = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setSaveStatus(null);
    setSelectedChannels({});
    try {
      const res = await fetch(`/api/scraper/youtube?query=${encodeURIComponent(q)}&maxResults=${maxResults}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل البحث');
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

  // Save selected leads to CRM SQLite database
  const handleSaveToCRM = async () => {
    const leadsToSave = results.filter((r) => selectedChannels[r.channelId]);
    if (leadsToSave.length === 0) {
      setSaveStatus({ type: 'error', message: 'يرجى تحديد قناة واحدة على الأقل للحفظ' });
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/scraper/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: leadsToSave,
          niche: query,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ العملاء');

      setSaveStatus({
        type: 'success',
        message: `تم حفظ ${data.savedCount} عميل جديد بنجاح إلى قاعدة بيانات CRM! (تم تخطي ${data.skippedCount} مكرر)`,
      });

      // Mark saved as duplicates in view
      setResults((prev) =>
        prev.map((item) =>
          selectedChannels[item.channelId] ? { ...item, isDuplicate: true } : item
        )
      );
      setSelectedChannels({});
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'فشل حفظ العملاء' });
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.values(selectedChannels).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold mb-2">
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube Data API v3 Scraper</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              صائد العملاء وصناع المحتوى من يوتيوب
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              ابحث عن القنوات النشطة في أي نيش، استخرج بيانات المشتركين والإيميلات، وأضفهم مباشرة لجدول الـ CRM.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/crm"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>فتح جدول الـ CRM</span>
            </Link>
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
                placeholder="أدخل الكلمات المفتاحية أو المجال (مثال: صناع محتوى، بودكاست، مونتاج)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-11 pl-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>5 نتائج</option>
                <option value={10}>10 نتائج</option>
                <option value={20}>20 نتيجة</option>
                <option value={30}>30 نتيجة</option>
              </select>

              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all flex-shrink-0"
              >
                <Search className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'جارٍ البحث...' : 'فحص القنوات'}</span>
              </button>
            </div>
          </div>

          {/* Quick Niche Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>مجالات شائعة:</span>
            </span>
            {NICHE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setQuery(preset);
                  handleSearch(preset);
                }}
                className={`text-xs px-3 py-1 rounded-lg border transition-all flex-shrink-0 ${
                  query === preset
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Status Notification */}
      {saveStatus && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in ${
            saveStatus.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{saveStatus.message}</span>
          </div>
          {saveStatus.type === 'success' && (
            <Link
              href="/crm"
              className="text-xs underline font-bold hover:text-white flex items-center gap-1"
            >
              <span>الانتقال إلى CRM</span>
            </Link>
          )}
        </div>
      )}

      {/* Scraped Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
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
              <span className="text-xs text-slate-400">
                (تم تحديد {selectedCount} قناة للحفظ)
              </span>
            </div>

            <button
              onClick={handleSaveToCRM}
              disabled={saving || selectedCount === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Download className={`w-4 h-4 ${saving ? 'animate-bounce' : ''}`} />
              <span>{saving ? 'جارٍ الحفظ...' : `حفظ المحدد في الـ CRM (${selectedCount})`}</span>
            </button>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((channel) => {
              const isSelected = !!selectedChannels[channel.channelId];

              return (
                <div
                  key={channel.channelId}
                  className={`glass-panel p-5 border transition-all relative ${
                    channel.isDuplicate
                      ? 'border-slate-800 opacity-75'
                      : isSelected
                      ? 'border-blue-500/60 bg-slate-900/90'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Select Checkbox & Duplicate Indicator */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => !channel.isDuplicate && toggleSelect(channel.channelId)}
                        disabled={channel.isDuplicate}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-slate-600 bg-slate-950'
                        }`}
                      >
                        {isSelected && <span className="text-xs font-bold">✓</span>}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300 overflow-hidden border border-slate-700 flex-shrink-0">
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
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>فتح القناة</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    {channel.isDuplicate ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        موجود في الـ CRM
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        عميل جديد 🌟
                      </span>
                    )}
                  </div>

                  {/* Channel Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center my-3">
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
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    {channel.email ? (
                      <span className="font-mono text-emerald-300 font-semibold truncate">
                        {channel.email}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        لم يتم اكتشاف إيميل بالوصف (يمكنك إضافته في الـ CRM)
                      </span>
                    )}
                  </div>

                  {/* Recent Videos */}
                  {channel.recentVideos && channel.recentVideos.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">أحدث المقاطع:</span>
                      {channel.recentVideos.slice(0, 2).map((v, i) => (
                        <div key={i} className="text-[11px] text-slate-300 truncate flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-red-400" />
                          <span className="truncate">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
