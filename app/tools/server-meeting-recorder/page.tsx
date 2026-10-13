'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Server,
  Copy,
  Check,
  Terminal,
  FolderOpen,
  Cpu,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Play,
  FileCode,
  Sparkles,
  Zap,
  Radio,
  Clock,
  HardDrive,
  Database,
} from 'lucide-react';

export default function ServerMeetingRecorderPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeSnippets = [
    {
      title: 'النشر الآلي بضغطة زر على سيرفر Ubuntu (Automated Deployment):',
      command: 'cd tools/server-meeting-recorder && chmod +x deploy.sh && sudo ./deploy.sh',
    },
    {
      title: 'التشغيل عبر Docker Compose:',
      command: 'cd tools/server-meeting-recorder && docker compose up --build -d',
    },
    {
      title: 'فحص صحة الخدمة وسعة القرص (Health Check):',
      command: 'curl http://localhost:8080/health',
    },
    {
      title: 'بدء تسجيل اجتماع عبر الـ API:',
      command: `curl -X POST http://localhost:8080/api/recordings/start \\
  -H "Content-Type: application/json" \\
  -d '{"meeting_url": "https://meet.google.com/abc-defg-hij", "title": "ميتنج مبيعات", "bot_name": "Creziax Bot"}'`,
    },
  ];

  const projectFiles = [
    {
      name: 'api.py',
      description: 'واجهة التحكم و الـ REST API (FastAPI) لبدء وإيقاف واستعراض وتحميل التسجيلات',
      tag: 'REST API',
    },
    {
      name: 'service.py',
      description: 'المنسق الرئيسي لدورة حياة الاجتماع، التوقيت، وإشارات الإيقاف الآمنة والـ Webhooks',
      tag: 'Orchestrator',
    },
    {
      name: 'recorder_engine.py',
      description: 'التقاط الشاشة الافتراضية والصوت المدمج عبر FFmpeg وإنتاج MP4 سليم غير قابل للتلف',
      tag: 'FFmpeg Muxer',
    },
    {
      name: 'browser_engine.py',
      description: 'بوت التصفح الآلي (Playwright Chromium) للدخول للاجتماع وتجاوز حوارات الإذن وكتابة الاسم',
      tag: 'Playwright Bot',
    },
    {
      name: 'audio_display_manager.py',
      description: 'إدارة الشاشة الوهمية (Xvfb) وخادم الصوت الافتراضي (PulseAudio Null-Sink)',
      tag: 'Virtual Display & Audio',
    },
    {
      name: 'storage.py',
      description: 'إدارة السجلات وسعة التخزين، وحذف التسجيلات القديمة تلقائياً لحماية مساحة السيرفر',
      tag: 'Retention Policy',
    },
    {
      name: 'Dockerfile & compose',
      description: 'بيئة حاويات متكاملة مع كافة خطوط وحزم لينكس وأدوات الصوت لتشغيل 24/7 دون توقف',
      tag: 'DevOps & Docker',
    },
    {
      name: 'deploy.sh',
      description: 'سكربت شل مؤتمت بالكامل لتجهيز السيرفر وتثبيت الدوكر وتشغيل الخدمة ومراقبتها',
      tag: 'Auto-Deploy',
    },
  ];

  const features = [
    {
      title: 'تشغيل 24/7 بدون شاشة (Headless)',
      desc: 'بيئة عرض صوتية وبصرية وهمية تعمل في الخلفية بالكامل عبر Xvfb و PulseAudio دون الحاجة لأي شاشة حقيقية.',
      icon: Radio,
    },
    {
      title: 'بوت انضمام آلي ذكي',
      desc: 'يتعرف تلقائياً على Google Meet و Teams و Zoom ويدخل باسم البوت مع ضبط أذونات المايك والكاميرا.',
      icon: Sparkles,
    },
    {
      title: 'تسجيل فائق الجودة والاتزان',
      desc: 'ضغط H.264/AAC عالي الكفاءة، مع حفظ موثوق للـ Moov Atom لضمان عدم تلف الفيديو حتى مع الانقطاع.',
      icon: Cpu,
    },
    {
      title: 'تحكم سحابي كامل (REST API)',
      desc: 'إمكانية إرسال روابط الاجتماعات عبر Webhook أو API من أي تطبيق، وتتبع التقدم وتحميل الملفات.',
      icon: Zap,
    },
    {
      title: 'حماية مساحة التخزين تلقائياً',
      desc: 'مسح دوري مجدول للتسجيلات المنتهية، مع نظام طوارئ يفرغ المساحة فوراً عند بلوغ 90% استخدام.',
      icon: HardDrive,
    },
    {
      title: 'تعافي واستمرارية آلية',
      desc: 'مجهز بـ Systemd و Docker Restart Policies لإعادة التشغيل الذاتي في حال حدوث أي كراش أو ريبوت للسيرفر.',
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/tools"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لبوابة الأدوات</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-semibold text-emerald-400">خادم تسجيل الاجتماعات السحابي</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Server Daemon (24/7)
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Server className="w-4 h-4" />
              <span>أداة رقم 4 • Creziax Server Daemons</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              خادم تسجيل الاجتماعات السحابي المستقل (Headless Daemon)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              منظومة بايثون متكاملة مخصصة لخوادم Linux VPS (Ubuntu) تعمل 24/7 بدون واجهة مرئية حقيقية.
              تتلقى روابط اجتماعات Google Meet و Zoom و Teams عبر الـ API، وتدخل الاجتماع افتراضياً وتسجله بالصوت والصورة، وتحفظ الفيديو بجودة عالية وتوفر روابط تحميل وتنبيهات Webhook.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60">
                Ubuntu 20.04/22.04/24.04
              </span>
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60">
                Docker & Compose
              </span>
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60">
                FastAPI REST API
              </span>
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60">
                Xvfb + PulseAudio
              </span>
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60">
                Port 8080
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a
              href="http://localhost:8080/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>فتح توثيق الـ API (Swagger)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Deployment & Quick Commands */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span>أوامر التثبيت والنشر على السيرفر (Production Deployment)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {codeSnippets.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 flex flex-col justify-between"
            >
              <div className="text-xs font-semibold text-slate-300">{item.title}</div>
              <div className="relative group bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-xs text-emerald-300 flex items-center justify-between overflow-x-auto">
                <span className="whitespace-pre-wrap select-all">{item.command}</span>
                <button
                  onClick={() => copyToClipboard(item.command, idx)}
                  className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shrink-0 ml-2"
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

      {/* Feature Highlights Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>المواصفات والقدرات التقنية</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-4 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Structure Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-emerald-400" />
          <span>هيكل ملفات الأداة داخل المشروع (tools/server-meeting-recorder/)</span>
        </h2>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60">
          {projectFiles.map((file, idx) => (
            <div
              key={idx}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-mono text-xs font-bold text-slate-200">{file.name}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{file.description}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto font-mono">
                {file.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
