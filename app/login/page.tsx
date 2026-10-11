'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, Zap } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('admin@creziax.cloud');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-7 sm:p-8 shadow-2xl relative">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
        <ShieldCheck className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold text-white">تسجيل الدخول للنظام</h2>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@creziax.cloud"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              dir="ltr"
            />
          </div>
        </div>

        {/* Password field */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            كلمة المرور
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>دخول إلى لوحة التحكم</span>
              <LogIn className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Quick info */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span>بيانات الدخول الافتراضية: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 font-mono" dir="ltr">admin123</code></span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/25 mb-4 border border-indigo-400/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">نظام مبيعات الذكاء الاصطناعي</h1>
          <p className="text-sm text-slate-400 mt-1">Apex AI Sales Agency & CRM System</p>
        </div>

        {/* Suspense wrapped login form */}
        <Suspense
          fallback={
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">جارٍ تهيئة صفحة الدخول...</p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 Apex AI Sales System. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
