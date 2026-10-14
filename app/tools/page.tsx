'use client';

import React, { useState, useEffect } from 'react';
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
  Plus,
  Globe,
  Wrench,
  Trash2,
} from 'lucide-react';
import { AddToolModal } from '@/components/AddToolModal';

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

export default function ToolsHubPage() {
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(true);

  useEffect(() => {
    fetchCustomTools();
  }, []);

  const fetchCustomTools = async () => {
    setLoadingCustom(true);
    try {
      const res = await fetch('/api/custom-tools');
      const data = await res.json();
      if (data.success && data.tools) {
        setCustomTools(data.tools);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCustom(false);
    }
  };

  const handleDeleteCustomTool = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف أداة "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/custom-tools/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomTools((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      alert('فشل في حذف الأداة');
    }
  };

  const defaultTools = [
    {
      id: 'ai-sales-crm',
      title: 'أداة المبيعات والـ CRM الذاتي',
      subtitle: 'Apex AI Sales Agency & Outreach CRM',
      badge: 'أداة ويب مباشرة',
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
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="glass-panel p-6 md:p-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-3">
              <Boxes className="w-4 h-4" />
              <span>Creziax Central Tools Suite</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              بوابة الأدوات المركزية للعمل
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              منصة سحابية متكاملة تجمع جميع أدواتك العملية في مكان واحد. كل أداة تعمل باستقلالية تامة داخل المتصفح، مع إمكانية إضافة وتضمين أي أداة أو موقع ويب للعمل داخلياً بنقرة زر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أداة جديدة (رابط)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Default Tools */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>الأدوات الأساسية المدمجة</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">4 أدوات نظام</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {defaultTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="glass-panel p-6 border border-slate-800 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between rounded-2xl relative"
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
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>{tool.title}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono">{tool.subtitle}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${tool.badgeColor} shrink-0`}
                    >
                      {tool.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {tool.description}
                  </p>

                  {/* Feature Highlights */}
                  <div className="space-y-1.5 mb-5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>أبرز المميزات:</span>
                    </div>
                    {tool.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tech Stack Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {tool.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  <Link
                    href={tool.primaryLink}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>{tool.primaryLabel}</span>
                    <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of User's Custom Added Tools */}
      <div>
        <div className="flex items-center justify-between mb-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">أدواتي المخصصة المضمنة</h2>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 border border-cyan-800/40 px-2 py-0.5 rounded-full">
              {customTools.length} مضافة
            </span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة أداة جديدة</span>
          </button>
        </div>

        {customTools.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 bg-slate-900/30">
            <Globe className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-xs font-bold text-slate-300">لم تقم بإضافة أي أدوات مخصصة بعد</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              يمكنك نسخ رابط أي موقع أو أداة من المتصفح (مثل Canva، Notion، ChatGPT، إلخ) وتضمينها لتعمل داخل موقعك مباشرة.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة أول أداة مخصصة الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTools.map((tool) => {
              const CustomIcon = iconMap[tool.icon || 'Globe'] || Globe;
              return (
                <div
                  key={tool.id}
                  className="glass-panel p-5 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <CustomIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                            {tool.name}
                          </h4>
                          <span className="text-[9px] text-emerald-400 font-mono">Live In-App</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteCustomTool(tool.id, tool.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="حذف الأداة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono truncate" dir="ltr">
                      {tool.url}
                    </p>

                    {tool.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/tools/custom/${tool.id}`}
                    className="w-full bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-200 text-xs font-bold py-2 px-3 rounded-lg border border-slate-700/80 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>فتح واستعراض الأداة</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Tool Modal */}
      <AddToolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onToolAdded={(newTool) => {
          setCustomTools((prev) => [...prev, newTool]);
        }}
      />
    </div>
  );
}
