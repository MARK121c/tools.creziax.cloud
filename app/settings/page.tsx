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
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test states
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings || {});
      })
      .catch((e) => console.error('Failed to load settings:', e))
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
        <p className="text-xs">جارٍ تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-2">
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>System & API Integration Hub</span>
            </div>
            <h1 className="text-2xl font-black text-white">إعدادات النظام ومفاتيح الربط</h1>
            <p className="text-xs text-slate-300 mt-1">
              إدارة مفاتيح API المجانية، خادم البريد Hostinger SMTP، رابط الاجتماعات، وبوت التنبيهات.
            </p>
          </div>
        </div>
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Agency Information Section */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Building className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">بيانات الوكالة ورابط الحجز (Agency Profile)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم الوكالة الرسمي</label>
              <input
                type="text"
                value={settings.agency_name || ''}
                onChange={(e) => handleChange('agency_name', e.target.value)}
                placeholder="Apex Media & Growth Studio"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">رابط حجز المواعيد (Calendly / Cal.com)</label>
              <input
                type="url"
                value={settings.booking_link || ''}
                onChange={(e) => handleChange('booking_link', e.target.value)}
                placeholder="https://calendly.com/your-agency/15min"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">شعار أو وصف وهوية الوكالة</label>
            <input
              type="text"
              value={settings.agency_tagline || ''}
              onChange={(e) => handleChange('agency_tagline', e.target.value)}
              placeholder="وكالة إنتاج إعلامي متخصصة في صناعة الفيديوهات الاحترافية وتكبير القنوات"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>
        </div>

        {/* AI & Scraper Free API Keys */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Key className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-base">مفاتيح API المجانية (Free Tier Engines)</h3>
          </div>

          {/* Gemini Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Google Gemini API Key (المجاني)</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestConnection('gemini')}
                disabled={testing === 'gemini'}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                <span>{testing === 'gemini' ? 'جارٍ الفحص...' : 'اختبار الاتصال'}</span>
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
              <p
                className={`text-[11px] ${
                  testResults.gemini.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResults.gemini.message}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              يمكنك الحصول عليه مجاناً فوراً من <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google AI Studio</a>.
            </p>
          </div>

          {/* YouTube API Key */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube Data API v3 Key (10,000 وحدة مجاناً يومياً)</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestConnection('youtube')}
                disabled={testing === 'youtube'}
                className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                <span>{testing === 'youtube' ? 'جارٍ الفحص...' : 'اختبار الاتصال'}</span>
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
              <p
                className={`text-[11px] ${
                  testResults.youtube.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResults.youtube.message}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              من لوحة <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google Cloud Console</a>.
            </p>
          </div>
        </div>

        {/* Hostinger SMTP Configuration */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">إعدادات بريد الإرسال (Hostinger SMTP)</h3>
            </div>
            <button
              type="button"
              onClick={() => handleTestConnection('smtp')}
              disabled={testing === 'smtp'}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{testing === 'smtp' ? 'جارٍ الفحص...' : 'اختبار اتصال SMTP'}</span>
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
              {testResults.smtp.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testResults.smtp.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">خادم SMTP (Host)</label>
              <input
                type="text"
                value={settings.smtp_host || 'smtp.hostinger.com'}
                onChange={(e) => handleChange('smtp_host', e.target.value)}
                placeholder="smtp.hostinger.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">المنفذ (Port)</label>
              <input
                type="text"
                value={settings.smtp_port || '465'}
                onChange={(e) => handleChange('smtp_port', e.target.value)}
                placeholder="465 أو 587"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">بريد الإرسال (Username/Email)</label>
              <input
                type="email"
                value={settings.smtp_user || ''}
                onChange={(e) => handleChange('smtp_user', e.target.value)}
                placeholder="outreach@yourdomain.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة مرور البريد (Password)</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المرسل الظاهر (Sender Name)</label>
            <input
              type="text"
              value={settings.smtp_sender_name || ''}
              onChange={(e) => handleChange('smtp_sender_name', e.target.value)}
              placeholder="فريق النمو والشراكات | Apex Media"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Telegram Bot Notification Section */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-base">تنبيهات تليجرام الفورية (Telegram Alerts)</h3>
            </div>
            <button
              type="button"
              onClick={() => handleTestConnection('telegram')}
              disabled={testing === 'telegram'}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{testing === 'telegram' ? 'جارٍ الفحص...' : 'إرسال تنبيه تجريبي'}</span>
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
              {testResults.telegram.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ جميع التغييرات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
