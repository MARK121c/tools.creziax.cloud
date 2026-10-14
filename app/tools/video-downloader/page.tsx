'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Scissors,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Music,
  Check,
  Zap,
  Film,
  Play,
} from 'lucide-react';

interface FormatOption {
  id: string;
  label: string;
  ext: string;
  height: number;
  qualityBadge: string;
}

interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  channel: string;
  description: string;
  platform: string;
  maxQuality: string;
  formats: FormatOption[];
}

export default function VideoDownloaderPage() {
  const [platform, setPlatform] = useState<string>('auto');
  const [url, setUrl] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoMetadata | null>(null);

  // Quality & Options
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [audioOnly, setAudioOnly] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Download Task
  const [taskId, setTaskId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');

  const platformTabs = [
    { id: 'auto', label: 'كشف تلقائي', icon: Zap },
    { id: 'youtube', label: 'يوتيوب YouTube', icon: Film },
    { id: 'tiktok', label: 'تيك توك TikTok', icon: Film },
    { id: 'instagram', label: 'إنستقرام Instagram', icon: Film },
    { id: 'facebook', label: 'فيسبوك Facebook', icon: Film },
    { id: 'pinterest', label: 'بنترست Pinterest', icon: Film },
  ];

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch {
      // ignore
    }
  };

  const handleFetchInfo = async () => {
    if (!url.trim()) {
      setErrorMsg('الرجاء إدخال رابط الفيديو أولاً');
      return;
    }

    setIsLoadingInfo(true);
    setErrorMsg(null);
    setVideoInfo(null);
    setDownloadReady(false);

    try {
      const res = await fetch('/api/downloader/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), platform }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'فشل في استخراج معلومات الفيديو');
      }

      setVideoInfo(data.data);
      if (data.data.formats && data.data.formats.length > 0) {
        setSelectedQuality(data.data.formats[0].height.toString());
      } else {
        setSelectedQuality('best');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء جلب الفيديو');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Direct download to user device immediately
  const triggerBrowserFileDownload = (id: string, fileName: string) => {
    const downloadUrl = `/api/downloader/file/${id}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName || 'video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartDownload = async () => {
    if (!url) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatusText('جاري الاتصال والبدء...');
    setDownloadReady(false);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/downloader/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          quality: audioOnly ? 'audio' : selectedQuality,
          audioOnly,
          startTime: isTrimming ? startTime : undefined,
          endTime: isTrimming ? endTime : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'فشل في بدء عملية التحميل');
      }

      setTaskId(data.taskId);
      pollDownloadStatus(data.taskId);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطأ أثناء بدء التحميل');
      setIsDownloading(false);
    }
  };

  const pollDownloadStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/downloader/status/${id}`);
        const data = await res.json();

        if (data.success) {
          setDownloadProgress(data.progress || 0);
          setDownloadStatusText(data.message || 'جاري المعالجة...');

          if (data.status === 'done') {
            clearInterval(interval);
            setIsDownloading(false);
            setDownloadReady(true);
            const targetName = data.fileName || 'video.mp4';
            setDownloadFileName(targetName);

            // DIRECT DOWNLOAD TO DEVICE:
            triggerBrowserFileDownload(id, targetName);
          } else if (data.status === 'error') {
            clearInterval(interval);
            setIsDownloading(false);
            setErrorMsg(data.error || 'حدث خطأ أثناء التنزيل');
          }
        }
      } catch (err) {
        clearInterval(interval);
        setIsDownloading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 p-4 md:p-8 space-y-6 max-w-5xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
            <Download className="w-4 h-4" />
            <span>محمل الوسائط المباشر • Creziax Media Suite</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            تحميل الفيديوهات بأعلى جودة (حتى 8K) وتنزيل فوري للجهاز
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            يدعم يوتيوب، تيك توك، إنستقرام، فيسبوك، وبنترست • يدعم 8K و 4K و 1080p و 720p واقتطاع المقاطع بالثواني
          </p>
        </div>

        <Link
          href="/tools"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>بوابة الأدوات</span>
        </Link>
      </div>

      {/* Main Console Box */}
      <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Platform Selection Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {platformTabs.map((tab) => {
            const isSelected = platform === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPlatform(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* URL Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">رابط الفيديو المراد تحميله:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
              placeholder="الصق الرابط من يوتيوب، تيك توك، إنستقرام، فيسبوك، أو بنترست..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors font-mono"
              dir="ltr"
            />
            <button
              onClick={handlePaste}
              type="button"
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-3.5 rounded-xl text-xs font-bold border border-slate-800 transition-all shrink-0"
              title="لصق من الحافظة"
            >
              لصق
            </button>
          </div>
        </div>

        {/* Fetch Info Button */}
        <button
          onClick={handleFetchInfo}
          disabled={isLoadingInfo}
          className="w-full bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
        >
          {isLoadingInfo ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري فحص الرابط وفك تشفير الجودات المتاحة...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>جلب معلومات الفيديو وخيارات الجودة (حتى 8K)</span>
            </>
          )}
        </button>

        {/* Error Alert — smart YouTube bot block detection */}
        {errorMsg && (
          <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
            errorMsg.includes('YOUTUBE_BOT_BLOCK')
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${errorMsg.includes('YOUTUBE_BOT_BLOCK') ? 'text-amber-400' : 'text-rose-400'}`} />
            <div className="space-y-2 w-full">
              {errorMsg.includes('YOUTUBE_BOT_BLOCK') ? (
                <>
                  <p className="font-bold text-amber-300">⚠️ يوتيوب يحجب السيرفر (IP Bot Block)</p>
                  <p className="leading-relaxed text-amber-200/80">
                    IP السيرفر مصنّف من يوتيوب كـ Bot وبيطلب تسجيل دخول. هذا شائع على خوادم VPS.
                  </p>
                  <div className="mt-2 space-y-1.5 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <p className="font-bold text-amber-300 text-[11px]">✅ الحل الفوري — رفع ملف Cookies:</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-200/80">
                      <li>ثبّت إضافة <strong>«Get cookies.txt LOCALLY»</strong> على Chrome</li>
                      <li>افتح <strong>youtube.com</strong> وتأكد أنك مسجّل دخولك</li>
                      <li>اضغط على الإضافة واضغط «Export» ← احفظ الملف باسم <code className="bg-amber-900/40 px-1 rounded">cookies.txt</code></li>
                      <li>ارفع الملف على السيرفر في المسار: <code className="bg-amber-900/40 px-1 rounded">/app/cookies.txt</code></li>
                    </ol>
                  </div>
                  <p className="text-[11px] text-amber-300">💡 في الوقت الحالي: جرب فيديو <strong>تيك توك / إنستقرام / فيسبوك / بنترست</strong> — شغالة بدون مشاكل.</p>
                </>
              ) : (
                <>
                  <span className="font-bold">خطأ:</span>
                  <p className="leading-relaxed">{errorMsg}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loaded Video Information Card */}
        {videoInfo && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 animate-fade-in">
            {/* Overview */}
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {videoInfo.thumbnail && (
                <div className="w-full md:w-56 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 relative">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30 font-bold">
                    {videoInfo.maxQuality}
                  </div>
                </div>
              )}
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-sm md:text-base text-white leading-snug">
                  {videoInfo.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>الناشر: <b className="text-slate-200">{videoInfo.channel}</b></span>
                  <span>•</span>
                  <span>المدة: <b className="text-slate-200">{videoInfo.durationString}</b></span>
                  <span>•</span>
                  <span>أعلى دقة: <b className="text-emerald-400">{videoInfo.maxQuality}</b></span>
                </div>
              </div>
            </div>

            {/* Quality & Format Buttons */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 block">
                  اختر الجودة المطلوبة (من 720p وحتى 8K حسب دقة الفيديو الأصلية):
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setAudioOnly(false); setSelectedQuality('best'); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    !audioOnly && selectedQuality === 'best'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  أعلى جودة متاحة تلقائياً ({videoInfo.maxQuality})
                </button>

                {videoInfo.formats.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => { setAudioOnly(false); setSelectedQuality(fmt.height.toString()); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      !audioOnly && selectedQuality === fmt.height.toString()
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{fmt.label}</span>
                  </button>
                ))}

                <button
                  onClick={() => setAudioOnly(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    audioOnly
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>استخراج صوت فقط MP3</span>
                </button>
              </div>
            </div>

            {/* Trimming & Cutting Section */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">تنزيل جزء معين فقط من الفيديو (اقتطاع زمني)</span>
                </div>
                <input
                  type="checkbox"
                  checked={isTrimming}
                  onChange={(e) => setIsTrimming(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </div>

              {isTrimming && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">وقت البدء (HH:MM:SS أو بالثواني):</label>
                    <input
                      type="text"
                      placeholder="00:00:15"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">وقت الانتهاء (HH:MM:SS أو بالثواني):</label>
                    <input
                      type="text"
                      placeholder="00:01:45"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Start Download Action */}
            <button
              onClick={handleStartDownload}
              disabled={isDownloading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{downloadStatusText} ({downloadProgress.toFixed(0)}%)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تنزيل الفيديو مباشرة إلى جهازك</span>
                </>
              )}
            </button>

            {/* Progress and status message */}
            {isDownloading && (
              <div className="space-y-1.5 pt-2">
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 transition-all duration-300 rounded-full"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{downloadStatusText}</span>
                  <span>{downloadProgress.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Success Card with Direct Manual Download Button if browser popup blocked */}
            {downloadReady && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم بدء تنزيل الملف لجهازك تلقائياً! ({downloadFileName})</span>
                </div>
                <button
                  onClick={() => triggerBrowserFileDownload(taskId!, downloadFileName)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>اضغط هنا إذا لم يبدأ التنزيل تلقائياً على جهازك</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
