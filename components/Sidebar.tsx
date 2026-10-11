'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Youtube,
  Users,
  Sparkles,
  CalendarCheck,
  Settings,
  Flame,
  Zap,
} from 'lucide-react';

const navigationItems = [
  {
    name: 'لوحة المؤشرات',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'صائد عملاء يوتيوب',
    href: '/scraper',
    icon: Youtube,
  },
  {
    name: 'إدارة العملاء (CRM)',
    href: '/crm',
    icon: Users,
  },
  {
    name: 'استوديو عروض AI',
    href: '/pitches',
    icon: Sparkles,
  },
  {
    name: 'الاجتماعات والإحاطات',
    href: '/meetings',
    icon: CalendarCheck,
  },
  {
    name: 'الإعدادات والربط',
    href: '/settings',
    icon: Settings,
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900/80 backdrop-blur-xl border-l border-slate-800 flex flex-col h-screen sticky top-0 z-40 hidden md:flex">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-base text-white tracking-wide">
              Apex AI Sales
            </h1>
            <p className="text-xs text-blue-400 font-medium">نظام المبيعات الذاتي</p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          الوحدات والأنظمة
        </div>

        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Cost-Free Badge Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span>نظام مجاني 100% (Zero Cost)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            يعمل عبر SQLite + Gemini Free + Nodemailer Hostinger.
          </p>
        </div>
      </div>
    </aside>
  );
};
