'use client';

import React from 'react';
import Link from 'next/link';
import {
  Boxes,
  Sparkles,
  Video,
  Download,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Settings,
  Flame,
  ArrowUpRight,
  Terminal,
  Monitor,
  Zap,
  Server,
} from 'lucide-react';

export default function ToolsHubPage() {
  const tools = [
    {
      id: 'ai-sales-crm',
      title: 'أداة المبيعات والـ CRM الذاتي',
      subtitle: 'Apex AI Sales Agency & Outreach CRM',
      badge: 'نشط ويعمل سحابياً',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: Sparkles,
      iconBg: 'from-blue-600 to-indigo-600',
      description:
        'نظام مؤتمت متكامل لصيد قنوات يوتيوب ذات الإمكانيات العالية، توليد عروض مبيعات مخصصة عبر Google Gemini، وإرسال حملات البريد تلقائياً مع متابعة الصفقات وحجوزات الاجتماعات.',
      features: [
        'صائد عملاء يوتيوب عبر YouTube Data API v3',
        'محرك صياغة العروض الذكية عبر Google Gemini AI',
        'إرسال الحملات البريدية عبر Hostinger SMTP',
        'لوحة CRM تفاعلية وإشعارات تليجرام فورية',
      ],
      primaryLink: '/',
      primaryLabel: 'فتح أداة المبيعات والـ CRM',
      techStack: ['Next.js 14', 'SQLite', 'Prisma', 'Gemini AI', 'Tailwind'],
      status: 'active',
    },
    {
      id: 'meeting-recorder',
      title: 'استوديو تسجيل الشاشة والاجتماعات المباشر',
      subtitle: 'In-Browser Screen & Meeting Recording Studio',
      badge: 'أداة ويب مباشرة (WebRTC)',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      icon: Video,
      iconBg: 'from-cyan-600 to-blue-600',
      description:
        'استوديو سحابي مباشر يعمل من داخل المتصفح لتسجيل اجتماعات Zoom و Teams و Google Meet، مع دمج صوت الميكروفون وصوت النظام معاً (Dual-Audio)، وأرشفة الفيديوهات بالسيرفر.',
      features: [
        'تسجيل فوري بدون تثبيت عبر WebRTC و getDisplayMedia',
        'دمج صوتي مزدوج نقي (Web Audio API Dual Mixing)',
        'معاينة فيديو حية وضوابط تحكم عائمة مع مؤقت زمني',
        'حفظ وتنزيل مباشر وأرشفة سحابية على السيرفر',
      ],
      primaryLink: '/tools/meeting-recorder',
      primaryLabel: 'فتح استوديو التسجيل المباشر',
      techStack: ['WebRTC', 'Web Audio API', 'MediaRecorder', 'SQLite', 'Prisma'],
      status: 'active',
    },
    {
      id: 'video-downloader',
      title: 'محمل ومقتطع الفيديوهات السحابي المباشر',
      subtitle: 'In-Browser Media Downloader & Clip Trimmer',
      badge: 'أداة ويب مباشرة',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: Download,
      iconBg: 'from-rose-600 via-pink-600 to-indigo-600',
      description:
        'أداة وسائط سحابية مباشرة تدعم يوتيوب وتيك توك وإنستقرام بأعلى دقة (4K, 1080p, MP3) مع ميزة حصرية لاقتطاع وتنزيل أجزاء محددة فقط بالثواني مباشرة من المتصفح.',
      features: [
        'تنزيل مباشر بأعلى جودة 1080p / 4K أو استخراج صوت MP3',
        'قص واقتطاع المشاهد بالثواني (Start & End Time)',
        'معالجة سحابية فورية مع شريط تقدم مباشر لحظي',
        'تنزيل الملف المعالج بنقرة واحدة إلى جهازك',
      ],
      primaryLink: '/tools/video-downloader',
      primaryLabel: 'فتح محمل الوسائط المباشر',
      techStack: ['Node.js API', 'yt-dlp', 'FFmpeg', 'Tailwind', 'Next.js'],
      status: 'active',
    },
    {
      id: 'server-meeting-recorder',
      title: 'خادم تسجيل الاجتماعات السحابي (24/7 Linux Daemon)',
      subtitle: 'Headless Meeting Recorder Daemon (Ubuntu/VPS)',
      badge: 'خادم خلفي سحابي',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: Server,
      iconBg: 'from-emerald-600 via-teal-600 to-cyan-600',
      description:
        'نظام خادم متكامل يعمل 24/7 على خوادم Ubuntu VPS بدون شاشة حقيقية (Headless)، يستقبل روابط Google Meet و Zoom و Teams عبر الـ API وينضم تلقائياً ويسجل الاجتماع بالصوت والصورة.',
      features: [
        'تشغيل 24/7 في الخلفية كخدمة Systemd أو حاوية Docker Compose',
        'شاشة وهمية وصوت افتراضي عبر Xvfb و PulseAudio Null-Sink',
        'بوت انضمام آلي ذكي (Playwright Chromium) يتجاوز الحوارات',
        'واجهة FastAPI كاملة للتحكم والتسجيل وتنزيل الفيديوهات ومسح القديم',
      ],
      primaryLink: '/tools/server-meeting-recorder',
      primaryLabel: 'عرض تفاصيل الخادم وأوامر النشر',
      techStack: ['Python 3.11', 'FastAPI', 'Playwright', 'Xvfb', 'PulseAudio', 'Docker'],
      status: 'active',
    },
    {
      id: 'future-tools',
      title: 'إضافة أداة جديدة للمنظومة',
      subtitle: 'Modular Workspaces & Custom Tools',
      badge: 'جاهز للتوسيع',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: Layers,
      iconBg: 'from-purple-600 to-pink-600',
      description:
        'هيكل المنظومة مصمم معمارياً ليدعم إضافة أدوات جديدة برمجية أو ويب أو سكربتات أتمتة في مجلدات منفصلة ومستقلة تماماً بدون أي تداخل بين الأدوات.',
      features: [
        'عزل كامل للأدوات داخل مجلد tools/ المستقل',
        'لوحة موحدة لإدارة الأدوات والأمان والصلاحيات',
        'إمكانية ربط APIs وقواعد بيانات متخصصة لكل أداة',
      ],
      primaryLink: '#',
      primaryLabel: 'قريباً - إضافة أدوات إضافية',
      techStack: ['Modular Architecture', 'Isolated Workspaces'],
      status: 'coming_soon',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
              <Boxes className="w-4 h-4" />
              <span>Creziax Central Tools Suite</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              بوابة الأدوات المركزية للعمل
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              منصة مركزية تجمع جميع أدواتك العملية المتخصصة في مكان واحد. كل أداة مبنية ومعزولة في قسم ومجلد مستقل لضمان أقصى كفاءة وسهولة في الصيانة والتطوير.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>أداة المبيعات</span>
            </Link>
            <Link
              href="/tools/meeting-recorder"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Video className="w-4 h-4 text-cyan-400" />
              <span>مسجل الاجتماعات</span>
            </Link>
            <Link
              href="/tools/video-downloader"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-rose-400" />
              <span>محمل الفيديوهات</span>
            </Link>
            <Link
              href="/tools/server-meeting-recorder"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Server className="w-4 h-4 text-emerald-400" />
              <span>خادم التسجيل 24/7</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isComingSoon = tool.status === 'coming_soon';

          return (
            <div
              key={tool.id}
              className={`glass-panel p-7 border border-slate-800 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between rounded-2xl relative ${
                isComingSoon ? 'opacity-80' : ''
              }`}
            >
              <div>
                {/* Tool Card Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${tool.iconBg} flex items-center justify-center shadow-lg shadow-blue-500/20 text-white`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">{tool.title}</h2>
                      <p className="text-xs text-slate-400 font-mono" dir="ltr">
                        {tool.subtitle}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${tool.badgeColor}`}
                  >
                    {tool.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-5">
                  {tool.description}
                </p>

                {/* Features List */}
                <div className="space-y-2 mb-6">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    أبرز المزايا والوظائف:
                  </h4>
                  {tool.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Tech Stack Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {tool.techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isComingSoon ? (
                  <button
                    disabled
                    className="w-full bg-slate-800/50 text-slate-400 text-xs font-semibold py-3 px-4 rounded-xl cursor-not-allowed text-center"
                  >
                    {tool.primaryLabel}
                  </button>
                ) : (
                  <Link
                    href={tool.primaryLink}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>{tool.primaryLabel}</span>
                    <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Directory & Modular Architecture Note */}
      <div className="glass-panel p-6 border border-slate-800/80 rounded-2xl bg-slate-900/40">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">
              تنظيم المشروع والمعمارية المستقلة (Modular Directory Structure)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              تم تنظيم الكود بحيث تقع ملفات كل أداة في مجلد مخصص داخل المشروع، مما يحافظ على نظافة الشفرة وسهولة تشغيل كل أداة بمعزل عن الأخرى:
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300" dir="ltr">
              <span className="text-blue-400">tools/</span><br />
              &nbsp;&nbsp;├── <span className="text-emerald-400">meeting-recorder/</span> &nbsp;&nbsp;&nbsp;&nbsp;# أداة مسجل الاجتماعات (Python + PyQt6 + FFmpeg)<br />
              &nbsp;&nbsp;├── <span className="text-rose-400">video-downloader/</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# أداة تنزيل واقتطاع فيديوهات يوتيوب (Node + yt-dlp)<br />
              &nbsp;&nbsp;└── <span className="text-purple-400">ai-sales-crm/</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# نظام المبيعات والـ CRM (Next.js 14 Web App)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
