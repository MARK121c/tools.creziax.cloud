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
  Flame,
  Zap,
  LogOut,
  UserCheck,
  Boxes,
  Video,
  Layers,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

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

  const isToolsHubActive = pathname === '/tools';

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-xl border-l border-slate-800 flex flex-col h-screen sticky top-0 z-40 hidden md:flex select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <Link href="/tools" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-base text-white tracking-wide flex items-center gap-1.5">
              <span>Creziax Tools</span>
            </h1>
            <p className="text-[11px] text-blue-400 font-medium">منظومة الأدوات المتكاملة</p>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-3.5 space-y-4 overflow-y-auto">
        {/* Central Hub Button */}
        <div>
          <Link
            href="/tools"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              isToolsHubActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Boxes className="w-4 h-4 text-blue-400" />
              <span>بوابة الأدوات المركزية</span>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Hub</span>
          </Link>
        </div>

        {/* Section 1: AI Sales CRM Suite */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>قسم المبيعات والـ CRM</span>
          </div>

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
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Section 2: Desktop Tools */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Video className="w-3 h-3 text-cyan-400" />
            <span>قسم أدوات سطح المكتب</span>
          </div>

          <Link
            href="/tools/meeting-recorder"
            className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs transition-all ${
              pathname === '/tools/meeting-recorder'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>مسجل الاجتماعات</span>
            </div>
            <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/40 px-1.5 py-0.5 rounded font-mono">
              Desktop
            </span>
          </Link>
        </div>

        {/* Section 3: Settings */}
        <div className="space-y-1 pt-1">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            الإعدادات العامة
          </div>
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
              pathname === '/settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>إعدادات النظام والأمان</span>
          </Link>
        </div>
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-3.5 border-t border-slate-800/80 space-y-2.5">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
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
