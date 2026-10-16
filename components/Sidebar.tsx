'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Youtube,
  Users,
  Sparkles,
  CalendarCheck,
  Settings,
  LogOut,
  UserCheck,
  Boxes,
  Video,
  Download,
  Server,
  ChevronDown,
  Layers,
  ArrowRight,
  Plus,
  Globe,
  Wrench,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { AddToolModal } from '@/components/AddToolModal';

interface CustomTool {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
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

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    loadCustomTools();

    const handleToolsUpdated = () => {
      loadCustomTools();
    };

    window.addEventListener('custom-tools-updated', handleToolsUpdated);
    return () => {
      window.removeEventListener('custom-tools-updated', handleToolsUpdated);
    };
  }, []);

  const loadCustomTools = () => {
    fetch('/api/custom-tools')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tools) setCustomTools(data.tools);
      })
      .catch(() => {});
  };

  const handleDeleteCustomTool = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف أداة "${name}" نهائياً من المنظومة؟`)) return;
    try {
      const res = await fetch(`/api/custom-tools/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomTools((prev) => prev.filter((t) => t.id !== id));
        window.dispatchEvent(new Event('custom-tools-updated'));
        if (pathname === `/tools/custom/${id}`) {
          router.push('/tools');
        }
      }
    } catch (err) {
      alert('فشل في حذف الأداة');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Determine current active tool domain
  let activeToolKey: string = 'crm';
  let activeCustomTool: CustomTool | undefined;

  if (pathname.startsWith('/tools/meeting-recorder')) {
    activeToolKey = 'meeting-recorder';
  } else if (pathname.startsWith('/tools/video-downloader')) {
    activeToolKey = 'video-downloader';
  } else if (pathname.startsWith('/tools/server-meeting-recorder')) {
    activeToolKey = 'server-recorder';
  } else if (pathname.startsWith('/tools/custom/')) {
    const customId = pathname.replace('/tools/custom/', '').split('/')[0];
    activeCustomTool = customTools.find((t) => t.id === customId);
    activeToolKey = `custom-${customId}`;
  } else if (pathname === '/tools') {
    activeToolKey = 'hub';
  } else if (pathname.startsWith('/settings')) {
    activeToolKey = 'settings';
  } else {
    activeToolKey = 'crm';
  }

  const builtInTools = [
    {
      id: 'crm',
      name: 'منظومة المبيعات والـ CRM',
      subtitle: 'صيد قنوات يوتيوب وصياغة عروض AI',
      href: '/',
      icon: Sparkles,
      color: 'text-indigo-400',
      badge: 'CRM',
    },
    {
      id: 'meeting-recorder',
      name: 'استوديو مسجل الاجتماعات',
      subtitle: 'تسجيل الشاشة والصوت المدمج من المتصفح',
      href: '/tools/meeting-recorder',
      icon: Video,
      color: 'text-cyan-400',
      badge: 'Studio',
    },
    {
      id: 'video-downloader',
      name: 'محمل ومقتطع الفيديوهات',
      subtitle: 'يوتيوب وتيك توك وإنستقرام بأعلى دقة',
      href: '/tools/video-downloader',
      icon: Download,
      color: 'text-rose-400',
      badge: 'Media',
    },
  ];

  const currentToolName = activeCustomTool
    ? activeCustomTool.name
    : builtInTools.find((t) => t.id === activeToolKey)?.name || 'بوابة الأدوات';

  const CurrentToolIcon = activeCustomTool
    ? iconMap[activeCustomTool.icon || 'Globe'] || Globe
    : builtInTools.find((t) => t.id === activeToolKey)?.icon || Boxes;

  return (
    <>
      <aside className="w-64 bg-[#0a0e17] border-l border-slate-800/80 flex flex-col h-screen sticky top-0 z-40 hidden md:flex select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80">
          <Link href="/tools" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-sm text-white tracking-wide flex items-center gap-1.5">
                <span>Creziax Tools</span>
              </h1>
              <p className="text-[10px] text-indigo-400 font-medium">منظومة الأدوات المتكاملة</p>
            </div>
          </Link>
        </div>

        {/* Central Hub Button */}
        <div className="px-3 pt-3">
          <Link
            href="/tools"
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              pathname === '/tools'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-300 bg-slate-900/60 hover:bg-slate-850 hover:text-white border border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              <span>بوابة كل الأدوات (Hub)</span>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
              {4 + customTools.length} أدوات
            </span>
          </Link>
        </div>

        {/* Active Tool Header & Switcher Trigger */}
        <div className="p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>الأداة المفتوحة حالياً</span>
            <button
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className="text-indigo-400 hover:text-indigo-300 text-[10px] flex items-center gap-0.5"
            >
              <span>تبديل</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Current Active Tool Card */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-indigo-400">
                <CurrentToolIcon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{currentToolName}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {activeCustomTool ? 'أداة مخصصة (Live)' : 'أداة نظام نشطة'}
                </p>
              </div>
            </div>
          </div>

          {/* Dropdown Menu to Switch Tools */}
          {toolsDropdownOpen && (
            <div className="mt-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 space-y-1 shadow-2xl animate-fade-in max-h-64 overflow-y-auto">
              <div className="text-[9px] font-bold text-slate-500 px-2 py-0.5">الأدوات الأساسية:</div>
              {builtInTools.map((t) => {
                const Icon = t.icon;
                const isCurrent = t.id === activeToolKey;
                return (
                  <Link
                    key={t.id}
                    href={t.href}
                    onClick={() => setToolsDropdownOpen(false)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                      isCurrent
                        ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                      <span>{t.name}</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-60">{t.badge}</span>
                  </Link>
                );
              })}

              {customTools.length > 0 && (
                <>
                  <div className="text-[9px] font-bold text-slate-500 px-2 pt-2 pb-0.5 border-t border-slate-800">أدواتي المخصصة:</div>
                  {customTools.map((t) => {
                    const CustomIcon = iconMap[t.icon || 'Globe'] || Globe;
                    const isCurrent = activeToolKey === `custom-${t.id}`;
                    return (
                      <div
                        key={t.id}
                        className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                          isCurrent
                            ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Link
                          href={`/tools/custom/${t.id}`}
                          onClick={() => setToolsDropdownOpen(false)}
                          className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
                        >
                          <CustomIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteCustomTool(t.id, t.name);
                            }}
                            title="حذف الأداة نهائياً"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="text-[9px] font-mono text-emerald-400">Live</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Contextual Sub-Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {/* Active Tool Sub-Sections */}
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
            أقسام الأداة الحالية
          </div>

          {/* 1. If AI Sales CRM is active */}
          {activeToolKey === 'crm' && (
            <div className="space-y-1">
              {[
                { name: 'لوحة المؤشرات', href: '/', icon: LayoutDashboard },
                { name: 'صائد عملاء يوتيوب', href: '/scraper', icon: Youtube },
                { name: 'إدارة العملاء (CRM)', href: '/crm', icon: Users },
                { name: 'استوديو عروض AI', href: '/pitches', icon: Sparkles },
                { name: 'الاجتماعات والإحاطات', href: '/meetings', icon: CalendarCheck },
              ].map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* 2. If Meeting Recorder is active */}
          {activeToolKey === 'meeting-recorder' && (
            <div className="space-y-1">
              <Link
                href="/tools/meeting-recorder"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
              >
                <Video className="w-4 h-4 text-white" />
                <span>استوديو التسجيل المباشر</span>
              </Link>
            </div>
          )}

          {/* 3. If Video Downloader is active */}
          {activeToolKey === 'video-downloader' && (
            <div className="space-y-1">
              <Link
                href="/tools/video-downloader"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs bg-rose-600 text-white shadow-md shadow-rose-600/30"
              >
                <Download className="w-4 h-4 text-white" />
                <span>محمل الوسائط والاقتطاع</span>
              </Link>
            </div>
          )}


          {/* 5. If Custom Tool is active */}
          {activeCustomTool && (
            <div className="space-y-1">
              <Link
                href={`/tools/custom/${activeCustomTool.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              >
                <div className="flex items-center gap-2">
                  <CurrentToolIcon className="w-4 h-4" />
                  <span className="truncate">{activeCustomTool.name}</span>
                </div>
                <span className="text-[9px] bg-indigo-950 px-1.5 py-0.5 rounded font-mono">Live</span>
              </Link>
            </div>
          )}

          {/* 6. Custom Tools Section (List of all custom added tools) */}
          <div className="pt-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>أدواتي المخصصة</span>
              <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">
                {customTools.length}
              </span>
            </div>

            {customTools.map((tool) => {
              const CustomIcon = iconMap[tool.icon || 'Globe'] || Globe;
              const isActive = pathname === `/tools/custom/${tool.id}`;
              return (
                <div
                  key={tool.id}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Link
                    href={`/tools/custom/${tool.id}`}
                    className="flex items-center gap-2 overflow-hidden flex-1 min-w-0"
                  >
                    <CustomIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                    <span className="truncate">{tool.name}</span>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteCustomTool(tool.id, tool.name);
                      }}
                      title="حذف الأداة نهائياً"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] text-emerald-400 font-mono opacity-80">Live</span>
                  </div>
                </div>
              );
            })}

            {/* Prominent Add Tool Button at the bottom of navigation */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 hover:text-white text-xs font-bold transition-all group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-125 transition-transform" />
              <span>إضافة أداة جديدة (رابط)</span>
            </button>
          </div>
        </nav>

        {/* Settings & User Info Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
              pathname === '/settings'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>إعدادات النظام والأمان</span>
          </Link>

          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser?.name || 'المدير'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">
                  {currentUser?.email || 'admin@creziax.cloud'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Add Custom Tool Modal */}
      <AddToolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onToolAdded={(newTool) => {
          setCustomTools((prev) => [...prev, newTool]);
        }}
      />
    </>
  );
};
