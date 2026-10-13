'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Copy,
  Check,
  Terminal,
  Video,
  Clock,
  Scissors,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Play,
  FileCode,
  Layers,
  Zap,
} from 'lucide-react';

export default function VideoDownloaderPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeSnippets = [
    {
      title: 'التشغيل بنقرة واحدة على ويندوز (One-Click Launcher):',
      command: 'tools\\video-downloader\\start.bat',
    },
    {
      title: 'تثبيت الحزم وتشغيل الخادم عبر Node.js:',
      command: 'cd tools/video-downloader && npm install && node server.js',
    },
    {
      title: 'رابط فتح الواجهة المحلية بعد التشغيل:',
      command: 'http://localhost:3500',
    },
  ];

  const features = [
    {
      icon: Video,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      title: 'أعلى دقة متاحة (4K & 1080p)',
      desc: 'دعم استخراج وتنزيل الجودات الأصلية الفائقة 4K و 1080p Full HD و 720p HD أو استخراج الصوت النقي MP3.',
    },
    {
      icon: Scissors,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'اقتطاع وتنزيل أجزاء معينة فقط',
      desc: 'إمكانية تحديد وقت البداية والنهاية (Start & End Time) وتنزيل اللقطة المطلوبة فقط مباشرة لتوفير الوقت وسرعة النت.',
    },
    {
      icon: Layers,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      title: 'دعم متعدد المنصات (3-in-1)',
      desc: 'دعم كامل لمنصات يوتيوب (بما في ذلك Shorts)، وتيك توك بدون علامات مائية، وإنستقرام للريلز والمنشورات المتعددة.',
    },
  ];

  const projectFiles = [
    {
      name: 'server.js',
      description: 'خادم Express الخلفي الذي يتعامل مع yt-dlp ومسارات الفحص /api/info والتحميل /api/download',
      tag: 'Express Backend',
    },
    {
      name: 'start.bat',
      description: 'سكربت ويندوز المباشر لتثبيت التبعيات وفتح المتصفح وتشغيل الخادم على المنفذ 3500',
      tag: 'Windows Launcher',
    },
    {
      name: 'yt-dlp.exe',
      description: 'النسخة التنفيذية المحدثة من محرك yt-dlp السريع لاستخراج وتنزيل الوسائط',
      tag: 'Engine Binary',
    },
    {
      name: 'static/index.html',
      description: 'واجهة المستخدم الأمامية المصممة بـ Dark Mode مع شريط التقدم والمؤقت',
      tag: 'UI Layout',
    },
    {
      name: 'static/app.js',
      description: 'معالجة جلب معلومات الفيديو والتحكم في خيارات الجودة والاقتطاع والتحميل المباشر',
      tag: 'Client Logic',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="glass-panel p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-rose-500/20 text-white shrink-0">
              <Download className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Tool #3 - Media & Video
                </span>
                <span className="text-xs text-slate-400 font-mono" dir="ltr">tools/video-downloader/</span>
              </div>
              <h1 className="text-2xl font-black text-white">أداة تنزيل واقتطاع فيديوهات يوتيوب والوسائط</h1>
              <p className="text-xs text-slate-300 mt-1">
                تنزيل الفيديوهات بأعلى دقة ممكنة (4K / 1080p / MP3) مع ميزة اقتطاع جزء محدد بالدقائق والثواني بدقة.
              </p>
            </div>
          </div>

          <Link
            href="/tools"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 self-start sm:self-center bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700"
          >
            <span>العودة لمركز الأدوات</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div key={idx} className="glass-panel p-5 border border-slate-800 rounded-xl space-y-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${feat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">{feat.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Launch & Terminal Commands */}
      <div className="glass-panel p-6 border border-slate-800 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Terminal className="w-5 h-5 text-rose-400" />
          <h2 className="text-base font-bold text-white">طريقة التشغيل السريع للأداة (Quick Start)</h2>
        </div>

        <div className="space-y-4">
          {codeSnippets.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {item.title}
              </label>
              <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-slate-200">
                <span dir="ltr">{item.command}</span>
                <button
                  onClick={() => copyToClipboard(item.command, idx)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="نسخ الأمر"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            تم ضبط المنفذ الافتراضي ليعمل على <code className="text-amber-300 font-mono">http://localhost:3500</code> حتى لا يتعارض مع منفذ لوحة تحكم السيلز (3000).
          </p>
        </div>
      </div>

      {/* Code Structure Table */}
      <div className="glass-panel p-6 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <FileCode className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">هيكلية ملفات الأداة داخل المجلد المخصص</h2>
        </div>

        <div className="divide-y divide-slate-800/80">
          {projectFiles.map((file, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <code className="text-xs font-bold text-rose-400 font-mono bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-800/30" dir="ltr">
                  {file.name}
                </code>
                <span className="text-xs text-slate-300">{file.description}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 self-start sm:self-center">
                {file.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
