'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Copy,
  Check,
  Terminal,
  FolderOpen,
  Volume2,
  Mic,
  Cpu,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Download,
  Play,
  FileCode,
  Sparkles,
} from 'lucide-react';

export default function MeetingRecorderPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeSnippets = [
    {
      title: 'التشغيل بنقرة واحدة على ويندوز (One-Click Run):',
      command: 'tools\\meeting-recorder\\run.bat',
    },
    {
      title: 'أمر تثبيت الحزم والمكتبات عبر pip:',
      command: 'pip install PyQt6 mss opencv-python soundcard numpy scipy ffmpeg-python',
    },
    {
      title: 'تثبيت FFmpeg على ويندوز عبر winget:',
      command: 'winget install Gyan.FFmpeg',
    },
    {
      title: 'تشغيل الأداة عبر Python مباشرة:',
      command: 'python tools/meeting-recorder/main.py',
    },
  ];

  const projectFiles = [
    {
      name: 'main.py',
      description: 'نقطة الانطلاق الرئيسية، تنسيق الأحداث، وإدارة أيقونة شريط المهام (System Tray Icon)',
      tag: 'Orchestrator',
    },
    {
      name: 'gui.py',
      description: 'الويدجت العائم الشفاف (Floating Widget)، محدد المنطقة (Region Selector)، ونافذة الإعدادات',
      tag: 'UI & Overlay',
    },
    {
      name: 'audio_engine.py',
      description: 'التقاط الصوت المزدوج (WASAPI Loopback للنظام + الميكروفون) مع ميزة Auto-Gain Control',
      tag: 'Audio Capture',
    },
    {
      name: 'video_engine.py',
      description: 'التقاط الشاشة فائق السرعة عبر mss بمعدل 30/60 FPS بدون استهلاك المعالج',
      tag: 'Video Grabber',
    },
    {
      name: 'muxer.py',
      description: 'دمج الصوت والفيديو في ملف MP4 نهائي في الخلفية مع دعم كروت الشاشة NVENC',
      tag: 'FFmpeg Muxer',
    },
    {
      name: 'config.py',
      description: 'إعدادات الأداة واستدعاء Windows API لحجب الويدجت عن التسجيل (WDA_EXCLUDEFROMCAPTURE)',
      tag: 'Config & Win32',
    },
    {
      name: 'run.bat',
      description: 'ملف تشغيل مباشر لنظام ويندوز ينشئ البيئة الافتراضية venv ويثبت المتطلبات تلقائياً',
      tag: 'Windows Launcher',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="glass-panel p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/20 text-white shrink-0">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Tool #2 - Desktop
                </span>
                <span className="text-xs text-slate-400 font-mono" dir="ltr">tools/meeting-recorder/</span>
              </div>
              <h1 className="text-2xl font-black text-white">مسجل الاجتماعات الخفي (Stealth Meeting Recorder)</h1>
              <p className="text-xs text-slate-300 mt-1">
                تطبيق سطح مكتب احترافي وخفيف لنظام Windows لتسجيل مكالمات Zoom و Teams و Google Meet بأعلى جودة وبدون لاج.
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
        <div className="glass-panel p-5 border border-slate-800 rounded-xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">إخفاء ذاتي تام (Stealth Mode)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            يستخدم ميزة ويندوز الرسمية <code>WDA_EXCLUDEFROMCAPTURE</code> لإخفاء ويدجت التسجيل كلياً عن الفيديو المسجل وعن مشاركة الشاشة.
          </p>
        </div>

        <div className="glass-panel p-5 border border-slate-800 rounded-xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">تسجيل صوت مزدوج نقي</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            التقاط مباشر لصوت المشاركين الداخلي (WASAPI Loopback) + صوتك عبر الميكروفون مع موازنة تلقائية وتصفية الصدى (AGC).
          </p>
        </div>

        <div className="glass-panel p-5 border border-slate-800 rounded-xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">تسريع عتادي بدون استهلاك الرام</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            محرك التقاط شاشة فائق الخفة عبر <code>mss</code> مع دعم كروت شاشة NVIDIA (NVENC) لإنتاج فيديو سلس 30/60 FPS بدون أي بطء.
          </p>
        </div>
      </div>

      {/* Quick Launch & Terminal Commands */}
      <div className="glass-panel p-6 border border-slate-800 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Terminal className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">أوامر التثبيت والتشغيل السريع (Commands)</h2>
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
      </div>

      {/* Code Structure Table */}
      <div className="glass-panel p-6 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <FileCode className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">هيكلية ملفات الأداة داخل المشروع</h2>
        </div>

        <div className="divide-y divide-slate-800/80">
          {projectFiles.map((file, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <code className="text-xs font-bold text-cyan-400 font-mono bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/30" dir="ltr">
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
