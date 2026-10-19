'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  UserCheck,
  Key,
  Trash2,
  PlusCircle,
  ChevronDown,
  ChevronUp,
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
  const [minSubscribers, setMinSubscribers] = useState(1000);
  const [filterFaceless, setFilterFaceless] = useState(true);
  const [onlyArabic, setOnlyArabic] = useState(true);
  const [strictNameOnly, setStrictNameOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<YouTubeScrapeResult[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Record<string, boolean>>({});
  const [syncingNotion, setSyncingNotion] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual dismiss / remove channel from results list
  const handleRemoveChannel = (channelId: string) => {
    setResults((prev) => prev.filter((c) => c.channelId !== channelId));
    setSelectedChannels((prev) => {
      const updated = { ...prev };
      delete updated[channelId];
      return updated;
    });
  };

  // Dashboard stats
  const [totalNotionLeads, setTotalNotionLeads] = useState<number | null>(null);
  const [loadingNotionCount, setLoadingNotionCount] = useState(false);
  const [scrapeStats, setScrapeStats] = useState<{
    totalChecked: number;
    qualified: number;
    skippedLowSubscribers: number;
    skippedFaceless: number;
    skippedNonArabic: number;
  } | null>(null);

  const fetchNotionCount = async () => {
    setLoadingNotionCount(true);
    try {
      const res = await fetch('/api/notion/stats');
      const data = await res.json();
      if (data.success) {
        setTotalNotionLeads(data.totalNotionLeads);
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotionCount(false);
    }
  };

  // Google API Token Pool state
  const [tokenPool, setTokenPool] = useState<Array<{ index: number; key: string; masked: string; isDefault: boolean }>>([]);
  const [showTokenManager, setShowTokenManager] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenMessage, setTokenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/scraper/tokens');
      const data = await res.json();
      if (data.success) {
        setTokenPool(data.keys || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotionCount();
    fetchTokens();
  }, []);

  const handleAddToken = async () => {
    if (!newTokenInput.trim()) return;
    setTokenLoading(true);
    setTokenMessage(null);
    try {
      const res = await fetch('/api/scraper/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', key: newTokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشلت إضافة التوكن');
      setTokenPool(data.keys || []);
      setNewTokenInput('');
      setTokenMessage({ type: 'success', text: '✅ تمت إضافة المفتاح إلى مجموعة التناوب بنجاح!' });
    } catch (err: any) {
      setTokenMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء إضافة المفتاح' });
    } finally {
      setTokenLoading(false);
    }
  };

  const handleDeleteToken = async (keyToDelete: string) => {
    setTokenLoading(true);
    setTokenMessage(null);
    try {
      const res = await fetch('/api/scraper/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', key: keyToDelete }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل حذف التوكن');
      setTokenPool(data.keys || []);
      setTokenMessage({ type: 'success', text: '🗑️ تم حذف المفتاح من المجموعة' });
    } catch (err: any) {
      setTokenMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء حذف المفتاح' });
    } finally {
      setTokenLoading(false);
    }
  };

  // Search YouTube strictly upon clicking the search button
  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSaveStatus(null);
    setSelectedChannels({});
    try {
      const res = await fetch(
        `/api/scraper/youtube?query=${encodeURIComponent(query)}&maxResults=${maxResults}&minSubscribers=${minSubscribers}&filterFaceless=${filterFaceless}&onlyArabic=${onlyArabic}&strictNameOnly=${strictNameOnly}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل البحث في يوتيوب');
      setResults(data.channels || []);
      if (data.stats) {
        setScrapeStats(data.stats);
      }

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
      fetchNotionCount();
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
      {/* 📊 Lead Generation Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Leads in Notion */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">إجمالي العملاء في Notion</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white">
              {loadingNotionCount ? '...' : totalNotionLeads !== null ? totalNotionLeads : '—'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">عميل مسجل</span>
          </div>
          <button
            onClick={fetchNotionCount}
            disabled={loadingNotionCount}
            className="text-[11px] text-emerald-400/80 hover:text-emerald-300 mt-2 flex items-center gap-1 font-medium transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loadingNotionCount ? 'animate-spin' : ''}`} />
            <span>تحديث العدد</span>
          </button>
        </div>

        {/* Stat 2: Qualified Leads Found in Current Session */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">القنوات المطابقة للشروط</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white">{results.length}</span>
            <span className="text-xs text-slate-400 font-semibold">قناة مؤهلة</span>
          </div>
          <p className="text-[11px] text-blue-400/80 mt-2 font-medium">
            (محدد للإرسال: {selectedCount})
          </p>
        </div>

        {/* Stat 3: Skipped / Filtered Out (Faceless & Low Subs) */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">مستبعدة (فيسلس / أجنبي / أقل من 1K)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white">
              {scrapeStats ? scrapeStats.skippedLowSubscribers + scrapeStats.skippedFaceless + (scrapeStats.skippedNonArabic || 0) : 0}
            </span>
            <span className="text-xs text-slate-400 font-semibold">قناة مستبعدة</span>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
            {scrapeStats
              ? `${scrapeStats.skippedFaceless} فيسلس • ${scrapeStats.skippedNonArabic || 0} غير عربي • ${scrapeStats.skippedLowSubscribers} < 1K`
              : 'فلترة تلقائية صارمة'}
          </p>
        </div>

        {/* Stat 4: Direct Emails Extracted */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">إيميلات تواصل مباشرة</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white">
              {results.filter((r) => r.email).length}
            </span>
            <span className="text-xs text-slate-400 font-semibold">إيميل جاهز</span>
          </div>
          <p className="text-[11px] text-purple-400/80 mt-2 font-medium">
            جاهزون للتواصل والبيع المباشر
          </p>
        </div>
      </div>

      {/* 🔑 Google Tokens Pool Manager */}
      <div className="glass-panel border border-slate-800 rounded-2xl bg-slate-900/60 overflow-hidden shadow-lg transition-all">
        <button
          type="button"
          onClick={() => setShowTokenManager(!showTokenManager)}
          className="w-full p-4 flex items-center justify-between text-right hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">إدارة مفاتيح جوجل (Token Pool & Auto-Failover)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {tokenPool.length} مفتاح مسجل
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تداول ذكي: عند انتهاء كوتا أي مفتاح (10,000 كوتا يومياً)، يحول النظام تلقائياً للمفتاح التالي دون توقف السحب.
              </p>
            </div>
          </div>
          <div className="text-slate-400 p-2">
            {showTokenManager ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showTokenManager && (
          <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/50 animate-fade-in">
            {/* Notification message */}
            {tokenMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  tokenMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {tokenMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{tokenMessage.text}</span>
              </div>
            )}

            {/* List of keys */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">المفاتيح المسجلة حالياً للتناوب:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {tokenPool.map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                        #{t.index}
                      </span>
                      <code className="text-xs font-mono text-emerald-400 font-bold">{t.masked}</code>
                      {t.isDefault && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                          افتراضي
                        </span>
                      )}
                    </div>
                    {tokenPool.length > 1 && (
                      <button
                        onClick={() => handleDeleteToken(t.key)}
                        disabled={tokenLoading}
                        title="حذف المفتاح من المجموعة"
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add new key input */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs font-bold text-slate-300 block mb-2">إضافة مفتاح جديد للمجموعة:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTokenInput}
                  onChange={(e) => setNewTokenInput(e.target.value)}
                  placeholder="ألصق مفتاح YouTube Data API v3 الجديد هنا (يبدأ بـ AIzaSy...)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  onClick={handleAddToken}
                  disabled={tokenLoading || !newTokenInput.trim()}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all flex-shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{tokenLoading ? 'جارٍ الإضافة...' : 'إضافة المفتاح'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header Section & Search Engine */}
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
        <div className="mt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Input field - strictly controlled without auto search */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="أدخل الكلمات المفتاحية أو المجال (مثال: تسويق، عقارات، مونتاج، بودكاست)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-11 pl-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 shadow-inner"
              />
            </div>

            {/* Filter controls row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Max Results */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
                <span className="text-[11px] text-slate-400 font-medium">العدد:</span>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
                  className="bg-transparent text-xs text-white focus:outline-none font-semibold cursor-pointer"
                >
                  <option value={10} className="bg-slate-900">10 نتائج</option>
                  <option value={20} className="bg-slate-900">20 نتيجة</option>
                  <option value={30} className="bg-slate-900">30 نتيجة</option>
                  <option value={50} className="bg-slate-900">50 نتيجة</option>
                </select>
              </div>

              {/* Min Subscribers Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
                <span className="text-[11px] text-slate-400 font-medium">المشتركين:</span>
                <select
                  value={minSubscribers}
                  onChange={(e) => setMinSubscribers(parseInt(e.target.value, 10))}
                  className="bg-transparent text-xs text-emerald-400 focus:outline-none font-semibold cursor-pointer"
                >
                  <option value={1000} className="bg-slate-900">1,000+ (إجباري)</option>
                  <option value={5000} className="bg-slate-900">5,000+ مشترك</option>
                  <option value={10000} className="bg-slate-900">10,000+ مشترك</option>
                  <option value={50000} className="bg-slate-900">50,000+ مشترك</option>
                </select>
              </div>

              {/* Explicit Search Button - ONLY runs when clicked */}
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-3.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all flex-shrink-0 active:scale-95 cursor-pointer"
              >
                <Search className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'جارٍ البحث والفلترة...' : 'بدء فحص وسحب القنوات'}</span>
              </button>
            </div>
          </div>

          {/* Faceless Filter Toggle & Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
            {/* Quick Niche Presets (clicking only fills the input, does NOT trigger search) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>المجالات:</span>
              </span>
              {NICHE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuery(preset)}
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

            <div className="flex flex-wrap items-center gap-2">
              {/* Only Arabic Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors flex-shrink-0">
                <input
                  type="checkbox"
                  checked={onlyArabic}
                  onChange={(e) => setOnlyArabic(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-emerald-400 font-bold">🇸🇦 عربي فقط</span>
              </label>

              {/* Faceless Channels Exclude Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors flex-shrink-0">
                <input
                  type="checkbox"
                  checked={filterFaceless}
                  onChange={(e) => setFilterFaceless(e.target.checked)}
                  className="rounded border-slate-700 text-red-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>استبعاد الفيسلس (Faceless)</span>
              </label>

              {/* Strict Name Only Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors flex-shrink-0">
                <input
                  type="checkbox"
                  checked={strictNameOnly}
                  onChange={(e) => setStrictNameOnly(e.target.checked)}
                  className="rounded border-slate-700 text-purple-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-purple-400 font-bold">🎯 أسماء أشخاص حقيقية فقط</span>
              </label>
            </div>
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

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        صانع محتوى 👤
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(channel.channelId)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="استبعاد هذه القناة من القائمة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
