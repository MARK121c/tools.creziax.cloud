'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Sparkles,
  Video,
  Download,
  Wrench,
  Layers,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Maximize2,
  Minimize2,
  Trash2,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';

interface CustomTool {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  createdAt: string;
}

const iconMap: Record<string, any> = {
  Globe: Globe,
  Sparkles: Sparkles,
  Video: Video,
  Download: Download,
  Wrench: Wrench,
  Layers: Layers,
  ExternalLink: ExternalLink,
};

export default function CustomToolViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tool, setTool] = useState<CustomTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTool();
  }, [params.id]);

  const fetchTool = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/custom-tools/${params.id}`);
      const data = await res.json();
      if (data.success && data.tool) {
        setTool(data.tool);
      } else {
        setError(data.error || 'لم يتم العثور على الأداة المطلوبة');
      }
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل بيانات الأداة');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tool) return;
    if (!confirm(`هل أنت متأكد من حذف أداة "${tool.name}" نهائياً من المنظومة؟`)) return;

    try {
      const res = await fetch(`/api/custom-tools/${tool.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('custom-tools-updated'));
        }
        router.push('/tools');
        router.refresh();
      }
    } catch (err) {
      alert('فشل في حذف الأداة');
    }
  };

  const reloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  const copyUrl = () => {
    if (!tool) return;
    navigator.clipboard.writeText(tool.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const IconComponent = tool?.icon && iconMap[tool.icon] ? iconMap[tool.icon] : Globe;

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">جارٍ فتح الأداة داخل الموقع...</p>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">خطأ في فتح الأداة</h2>
        <p className="text-xs text-slate-400">{error || 'الأداة غير متوفرة أو تم حذفها'}</p>
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 hover:text-white"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة لبوابة الأدوات</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`space-y-4 transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#070a11] p-4 flex flex-col' : 'w-full'
      }`}
    >
      {/* Top Header Bar for In-App Viewer */}
      <div className="bg-[#0c1220] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
        {/* Left: Tool Details & Breadcrumb */}
        <div className="flex items-center gap-3 overflow-hidden">
          <Link
            href="/tools"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 shrink-0"
            title="الرجوع للأدوات"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span>{tool.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                Live Preview
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono truncate" dir="ltr">
              {tool.url}
            </p>
          </div>
        </div>

        {/* Right: Frame Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {/* Copy URL */}
          <button
            onClick={copyUrl}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="نسخ الرابط"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Refresh Frame */}
          <button
            onClick={reloadIframe}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="إعادة تحميل الإطار"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Toggle Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title={isFullscreen ? 'تصغير الإطار' : 'تكبير ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open External in New Tab */}
          <a
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            title="فتح في تبويب مستقل"
          >
            <span>فتح خارجي</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Delete Tool */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 transition-colors"
            title="حذف الأداة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div
        className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1322] shadow-2xl ${
          isFullscreen ? 'flex-1 h-full' : 'h-[calc(100vh-190px)] min-h-[550px]'
        }`}
      >
        <iframe
          key={iframeKey}
          src={tool.url}
          title={tool.name}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          allow="camera; microphone; fullscreen; clipboard-read; clipboard-write; autoplay; display-capture;"
        />
      </div>

      {/* Security note / Frame fallback helper */}
      <div className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>إذا ظهرت لك شاشة بيضاء أو رفض الموقع التحميل بسبب سياسات الحماية (X-Frame-Options):</span>
        </div>
        <a
          href={tool.url}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 underline shrink-0 mr-2"
        >
          <span>اضغط هنا لفتح الموقع مباشرة</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
