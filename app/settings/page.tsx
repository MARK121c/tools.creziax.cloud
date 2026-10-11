'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Mail,
  Send,
  Sparkles,
  Youtube,
  Save,
  CheckCircle2,
  AlertCircle,
  Link2,
  Building,
  RefreshCw,
  Zap,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test states
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Auth / Password change states
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [updatingAuth, setUpdatingAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Load Settings
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings || {});
      })
      .catch((e) => console.error('Failed to load settings:', e))
      .finally(() => setLoading(false));

    // Load current admin user
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setCurrentUser(d.user);
          setAdminEmail(d.user.email);
        }
      })
      .catch((e) => console.error('Failed to load user:', e));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الإعدادات');

      setSaveStatus({ type: 'success', message: 'تم حفظ وتحديث جميع الإعدادات بنجاح!' });
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (target: string) => {
    setTesting(target);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [target]: {
          success: data.success,
          message: data.message || (data.success ? 'تم الاتصال بنجاح' : 'فشل الاتصال'),
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [target]: { success: false, message: err.message || 'فشل فحص الاتصال' },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleUpdateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingAuth(true);
    setAuthStatus(null);

    try {
      if (!currentPassword) {
        throw new Error('يرجى كتابة كلمة المرور الحالية لتأكيد التغيير');
      }

      if (newPassword && newPassword !== confirmPassword) {
        throw new Error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      }

      const res = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          currentPassword,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث بيانات الحساب');
      }

      setAuthStatus({ type: 'success', message: data.message || 'تم تحديث بيانات الحساب وكلمة المرور بنجاح!' });
      setCurrentUser((prev) => (prev ? { ...prev, email: adminEmail } : null));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setAuthStatus({ type: 'error', message: err.message || 'حدث خطأ أثناء تحديث بيانات الحساب' });
    } finally {
      setUpdatingAuth(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
        <p className="text-xs">جارٍ تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-2">
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>System & Security Hub</span>
            </div>
            <h1 className="text-2xl font-black text-white">إعدادات النظام، الأمان ومفاتيح الربط</h1>
            <p className="text-xs text-slate-300 mt-1">
              إدارة بيانات حساب المدير وتغيير كلمة المرور، مفاتيح الـ API المجانية، خادم البريد SMTP، ورابط الحجز.
            </p>
          </div>
        </div>
      </div>

      {/* 🔐 Admin Account & Security Section */}
      <div className="glass-panel p-6 sm:p-7 border border-indigo-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/20 space-y-5 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">بيانات حساب المدير والأمان (Admin Credentials)</h3>
              <p className="text-xs text-slate-400">تعديل البريد الإلكتروني وكلمة المرور الخاصة بتسجيل الدخول للنظام</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs text-indigo-300">
            <User className="w-3.5 h-3.5" />
            <span dir="ltr">{currentUser?.email || 'admin@creziax.cloud'}</span>
          </div>
        </div>

        {authStatus && (
          <div
            className={`p-4 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in ${
              authStatus.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
            }`}
          >
            {authStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{authStatus.message}</span>
          </div>
        )}

        <form onSubmit={handleUpdateAuth} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              بريد تسجيل الدخول (Admin Email)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@creziax.cloud"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور الحالية <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور الجديدة (اختياري)
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="اتركها فارغة إذا لم ترد التغيير"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور الجديدة"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                dir="ltr"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updatingAuth}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Lock className={`w-3.5 h-3.5 ${updatingAuth ? 'animate-spin' : ''}`} />
              <span>{updatingAuth ? 'جارٍ تحديث الحساب...' : 'تحديث بيانات الدخول وكلمة المرور'}</span>
            </button>
          </div>
        </form>
      </div>

      {saveStatus && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in ${
            saveStatus.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Integration & API Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Agency Information Section */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Building className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">بيانات الوكالة ورابط الحجز (Agency Profile)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم الوكالة / الاستوديو</label>
              <input
                type="text"
                value={settings.agency_name || ''}
                onChange={(e) => handleChange('agency_name', e.target.value)}
                placeholder="Apex Media & Growth Studio"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">وصف ونشاط الوكالة</label>
              <input
                type="text"
                value={settings.agency_tagline || ''}
                onChange={(e) => handleChange('agency_tagline', e.target.value)}
                placeholder="وكالة إنتاج إعلامي متخصصة في صناعة الفيديوهات الاحترافية وتكبير القنوات"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              رابط حجز موعد المكالمة (Calendly / Cal.com Link)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={settings.booking_link || ''}
                onChange={(e) => handleChange('booking_link', e.target.value)}
                placeholder="https://calendly.com/your-agency/15min"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-10 pl-3.5 py-2.5 text-xs text-white font-mono"
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              سيتم تضمين هذا الرابط تلقائياً في نهاية كل بريد إلكتروني ترويجي مولّد عبر الـ AI.
            </p>
          </div>
        </div>

        {/* Free API Keys Section */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">مفاتيح API المجانية (Free Tier APIs)</h3>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Google Gemini API Key (مجاني رسمي)</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestConnection('gemini')}
                disabled={testing === 'gemini'}
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
              >
                <Zap className="w-3 h-3" />
                <span>{testing === 'gemini' ? 'جارٍ الفحص...' : 'فحص الاتصال'}</span>
              </button>
            </div>
            <input
              type="password"
              value={settings.gemini_api_key || ''}
              onChange={(e) => handleChange('gemini_api_key', e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
            />
            {testResults.gemini && (
              <p className={`text-[11px] ${testResults.gemini.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {testResults.gemini.message}
              </p>
            )}
          </div>

          {/* YouTube Data API Key */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-rose-500" />
                <span>YouTube Data API v3 Key (10,000 وحدة يومياً مجاناً)</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestConnection('youtube')}
                disabled={testing === 'youtube'}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20"
              >
                <Zap className="w-3 h-3" />
                <span>{testing === 'youtube' ? 'جارٍ الفحص...' : 'فحص الاتصال'}</span>
              </button>
            </div>
            <input
              type="password"
              value={settings.youtube_api_key || ''}
              onChange={(e) => handleChange('youtube_api_key', e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
            />
            {testResults.youtube && (
              <p className={`text-[11px] ${testResults.youtube.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {testResults.youtube.message}
              </p>
            )}
          </div>
        </div>

        {/* Hostinger SMTP Mailer Section */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">إعدادات خادم البريد (Hostinger SMTP)</h3>
            </div>
            <button
              type="button"
              onClick={() => handleTestConnection('smtp')}
              disabled={testing === 'smtp'}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
            >
              <Send className="w-3 h-3" />
              <span>{testing === 'smtp' ? 'جارٍ الفحص...' : 'اختبار خادم SMTP'}</span>
            </button>
          </div>

          {testResults.smtp && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResults.smtp.success
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              <span>{testResults.smtp.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">SMTP Host</label>
              <input
                type="text"
                value={settings.smtp_host || ''}
                onChange={(e) => handleChange('smtp_host', e.target.value)}
                placeholder="smtp.hostinger.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">SMTP Port</label>
              <input
                type="number"
                value={settings.smtp_port || '465'}
                onChange={(e) => handleChange('smtp_port', e.target.value)}
                placeholder="465"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">SMTP User (البريد الرسمي)</label>
              <input
                type="text"
                value={settings.smtp_user || ''}
                onChange={(e) => handleChange('smtp_user', e.target.value)}
                placeholder="partnership@yourcompany.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">SMTP Password</label>
              <input
                type="password"
                value={settings.smtp_pass || ''}
                onChange={(e) => handleChange('smtp_pass', e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المرسل الظاهر للعملاء</label>
            <input
              type="text"
              value={settings.smtp_sender_name || ''}
              onChange={(e) => handleChange('smtp_sender_name', e.target.value)}
              placeholder="فريق الشراكات والمبيعات | Apex Media"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Telegram Notifications Section */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-white text-base">تنبيهات بوت تليجرام عند حجز المواعيد</h3>
            </div>
            <button
              type="button"
              onClick={() => handleTestConnection('telegram')}
              disabled={testing === 'telegram'}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20"
            >
              <Zap className="w-3 h-3" />
              <span>{testing === 'telegram' ? 'جارٍ الإرسال...' : 'إرسال تنبيه تجريبي'}</span>
            </button>
          </div>

          {testResults.telegram && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResults.telegram.success
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              <span>{testResults.telegram.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Telegram Bot Token</label>
              <input
                type="password"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
                placeholder="123456789:ABCdefGHI..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Telegram Chat ID</label>
              <input
                type="text"
                value={settings.telegram_chat_id || ''}
                onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                placeholder="123456789 أو -100xxxx"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* AI Prompt Template Editor */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-base">تخصيص برومبت الذكاء الاصطناعي (AI Prompt Template)</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              قالب التوجيه العام لمحرك Gemini (يدعم المتغيرات: {'{channelName}'}, {'{description}'}, {'{recentVideos}'}, {'{bookingLink}'})
            </label>
            <textarea
              rows={8}
              value={settings.ai_pitch_prompt_template || ''}
              onChange={(e) => handleChange('ai_pitch_prompt_template', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl shadow-blue-600/25 transition-all"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ جميع إعدادات الربط والـ API'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
