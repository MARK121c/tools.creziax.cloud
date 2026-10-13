'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Mail, Plus, Menu, X, LogOut, Boxes, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
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

  const navLinks = [
    { name: 'بوابة الأدوات المركزية', href: '/tools', icon: Boxes },
    { name: 'لوحة مؤشرات المبيعات', href: '/' },
    { name: 'صائد يوتيوب', href: '/scraper' },
    { name: 'CRM العملاء', href: '/crm' },
    { name: 'عروض AI', href: '/pitches' },
    { name: 'الاجتماعات', href: '/meetings' },
    { name: 'مسجل الاجتماعات (Desktop)', href: '/tools/meeting-recorder', icon: Video },
    { name: 'الإعدادات والأمان', href: '/settings' },
  ];

  return (
    <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link
          href="/tools"
          className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-xl transition-all"
        >
          <Boxes className="w-4 h-4 text-blue-400" />
          <span>مركز الأدوات</span>
        </Link>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/40">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>منظومة Creziax النشطة</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/tools/meeting-recorder"
          className="hidden lg:flex items-center gap-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-800/40 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
        >
          <Video className="w-3.5 h-3.5" />
          <span>مسجل الاجتماعات</span>
        </Link>
        <Link
          href="/scraper"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>جلب عملاء</span>
        </Link>
        <button
          onClick={handleLogout}
          title="تسجيل الخروج"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-slate-900 border-b border-slate-800 p-4 space-y-2 z-50 shadow-2xl">
          {currentUser && (
            <div className="p-3 mb-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">{currentUser.name}</span>
              <span className="text-slate-400 font-mono" dir="ltr">{currentUser.email}</span>
            </div>
          )}
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-sm font-medium"
            >
              {item.name}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full text-right px-4 py-2.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-sm font-medium flex items-center justify-between"
          >
            <span>تسجيل الخروج</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
