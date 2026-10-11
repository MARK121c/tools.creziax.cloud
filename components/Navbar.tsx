'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Mail, Plus, Menu, X, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const navLinks = [
    { name: 'لوحة المؤشرات', href: '/' },
    { name: 'صائد يوتيوب', href: '/scraper' },
    { name: 'CRM العملاء', href: '/crm' },
    { name: 'عروض AI', href: '/pitches' },
    { name: 'الاجتماعات', href: '/meetings' },
    { name: 'الإعدادات', href: '/settings' },
  ];

  return (
    <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>النظام نشط وجاهز للعمليات الآلية</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/scraper"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>جلب عملاء جدد</span>
        </Link>
        <Link
          href="/crm"
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-700/60 transition-all"
        >
          <Mail className="w-4 h-4 text-amber-400" />
          <span>إرسال الحملات</span>
        </Link>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-slate-900 border-b border-slate-800 p-4 space-y-2 z-50">
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
        </div>
      )}
    </header>
  );
};
