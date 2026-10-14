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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

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
  let activeToolKey: 'crm' | 'meeting-recorder' | 'video-downloader' | 'server-recorder' | 'hub' | 'settings' = 'crm';

  if (pathname.startsWith('/tools/meeting-recorder')) {
    activeToolKey = 'meeting-recorder';
  } else if (pathname.startsWith('/tools/video-downloader')) {
    activeToolKey = 'video-downloader';
  } else if (pathname.startsWith('/tools/server-meeting-recorder')) {
    activeToolKey = 'server-recorder';
  } else if (pathname === '/tools') {
    activeToolKey = 'hub';
  } else if (pathname.startsWith('/settings')) {
    activeToolKey = 'settings';
  } else {
    activeToolKey = 'crm';
  }

  const allTools = [
    {
      id: 'crm',
      name: 'منظومة المبيعات والـ CRM',
      subtitle: 'صيد قنوات يوتيوب وصياغة عروض AI',
      href: '/',
      icon: Sparkles,
      color: 'text-indigo-400',
      activeBg: 'bg-indigo-600',
      badge: 'CRM',
    },
    {
      id: 'meeting-recorder',
      name: 'استوديو مسجل الاجتماعات',
      subtitle: 'تسجيل الشاشة والصوت المدمج من المتصفح',
      href: '/tools/meeting-recorder',
      icon: Video,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-600',
      badge: 'Studio',
    },
    {
      id: 'video-downloader',
      name: 'محمل ومقتطع الفيديوهات',
      subtitle: 'يوتيوب وتيك توك وإنستقرام بأعلى دقة',
      href: '/tools/video-downloader',
      icon: Download,
      color: 'text-rose-400',
      activeBg: 'bg-rose-600',
      badge: 'Media',
    },
    {
      id: 'server-recorder',
      name: 'خادم التسجيل السحابي 24/7',
      subtitle: 'بوت لينكس المستقل لخوادم VPS',
      href: '/tools/server-meeting-recorder',
      icon: Server,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-600',
      badge: 'Daemon',
    },
  ];

  const activeTool = allTools.find((t) => t.id === activeToolKey) || allTools[0];

  return (
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
            4 أدوات
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
            <div className={`w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 ${activeTool.color}`}>
              <activeTool.icon className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{activeTool.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{activeTool.badge}</p>
            </div>
          </div>
        </div>

        {/* Dropdown Menu to Switch Tools */}
        {toolsDropdownOpen && (
          <div className="mt-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 space-y-1 shadow-2xl animate-fade-in">
            {allTools.map((t) => {
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
          </div>
        )}
      </div>

      {/* Contextual Sub-Navigation: Shows ONLY what belongs to the active tool */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
          أقسام الأداة
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

        {/* 4. If Server Recorder is active */}
        {activeToolKey === 'server-recorder' && (
          <div className="space-y-1">
            <Link
              href="/tools/server-meeting-recorder"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
            >
              <Server className="w-4 h-4 text-white" />
              <span>لوحة وأوامر الخادم 24/7</span>
            </Link>
          </div>
        )}

        {/* 5. If Hub is active */}
        {activeToolKey === 'hub' && (
          <div className="space-y-1">
            {allTools.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className="flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-900/80 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${t.color}`} />
                    <span>{t.name}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Section: Other Tools Quick Jump */}
        {activeToolKey !== 'hub' && (
          <div className="pt-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
              أدوات المنظومة الأخرى
            </div>
            {allTools
              .filter((t) => t.id !== activeToolKey)
              .map((t) => {
                const Icon = t.icon;
                return (
                  <Link
                    key={t.id}
                    href={t.href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                      <span className="truncate">{t.name}</span>
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
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
  );
};
