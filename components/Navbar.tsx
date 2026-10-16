'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Menu,
  X,
  LogOut,
  Boxes,
  Video,
  Download,
  Server,
  Settings,
  Plus,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

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

  // Identify active tool
  let toolTitle = 'منظومة المبيعات والـ CRM';
  let toolColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';

  if (pathname.startsWith('/tools/meeting-recorder')) {
    toolTitle = 'استوديو مسجل الاجتماعات';
    toolColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  } else if (pathname.startsWith('/tools/video-downloader')) {
    toolTitle = 'محمل ومقتطع الفيديوهات';
    toolColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (pathname === '/tools') {
    toolTitle = 'بوابة الأدوات المركزية';
    toolColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  } else if (pathname.startsWith('/settings')) {
    toolTitle = 'إعدادات النظام والأمان';
    toolColor = 'text-slate-300 bg-slate-800 border-slate-700';
  }

  return (
    <header className="bg-[#0a0e17]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 md:px-8 py-3 flex items-center justify-between select-none">
      {/* Left: Mobile Menu & Active Tool Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Active Tool Pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${toolColor}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{toolTitle}</span>
        </div>

        <Link
          href="/tools"
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition-all"
        >
          <Boxes className="w-3.5 h-3.5 text-indigo-400" />
          <span>بوابة الأدوات</span>
        </Link>
      </div>

      {/* Right: Quick Tool Switcher Pills & User */}
      <div className="flex items-center gap-2">
        {/* Quick Tool Switch Buttons */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          <Link
            href="/"
            title="أداة المبيعات والـ CRM"
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !pathname.startsWith('/tools') && !pathname.startsWith('/settings')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>المبيعات</span>
          </Link>

          <Link
            href="/tools/meeting-recorder"
            title="مسجل الاجتماعات"
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              pathname.startsWith('/tools/meeting-recorder')
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>المسجل</span>
          </Link>

          <Link
            href="/tools/video-downloader"
            title="محمل الفيديوهات"
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              pathname.startsWith('/tools/video-downloader')
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3 h-3" />
            <span>المحمل</span>
          </Link>
        </div>

        {/* If inside CRM tool: Quick action button */}
        {!pathname.startsWith('/tools') && !pathname.startsWith('/settings') && (
          <Link
            href="/scraper"
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>جلب عملاء</span>
          </Link>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="تسجيل الخروج"
          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bg-slate-950 border-b border-slate-800 p-4 space-y-3 z-50 shadow-2xl">
          <div className="text-xs font-bold text-slate-400 px-1">الأدوات المستقلة:</div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>المبيعات والـ CRM</span>
            </Link>

            <Link
              href="/tools/meeting-recorder"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-cyan-400" />
              <span>مسجل الاجتماعات</span>
            </Link>

            <Link
              href="/tools/video-downloader"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-rose-400" />
              <span>محمل الفيديوهات</span>
            </Link>
          </div>

          <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>الإعدادات</span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
