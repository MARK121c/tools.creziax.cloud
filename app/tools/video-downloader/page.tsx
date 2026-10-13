'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Copy,
  Check,
  Terminal,
  Video,
  Clock,
  Scissors,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Play,
  FileCode,
  Layers,
  Zap,
  RefreshCw,
  AlertCircle,
  Music,
} from 'lucide-react';

interface FormatOption {
  id: string;
  label: string;
  ext: string;
  height: number;
}

interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  channel: string;
  description: string;
  formats: FormatOption[];
}

export default function VideoDownloaderPage() {
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'instagram'>('youtube');
  const [url, setUrl] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoMetadata | null>(null);

  // Download options
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [audioOnly, setAudioOnly] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Download task progress
  const [taskId, setTaskId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');

  // Paste from clipboard helper
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // ignore
    }
  };

  // Fetch video information
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

  // Start download task
  const handleStartDownload = async () => {
    if (!url) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatusText('جاري إرسال طلب التحميل...');
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

  // Poll download progress
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
            setDownloadFileName(data.fileName || 'video.mp4');
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
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
            <Download className="w-4 h-4" />
            <span>محمل الوسائط المباشر • Creziax Media Downloader</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            أداة تنزيل الفيديوهات وقص الأجزاء مباشرة من الموقع
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تعمل مباشرة داخل المتصفح بدون تثبيت برامج • يوتيوب وتيك توك وإنستقرام بأعلى دقة واقتطاع بالثواني
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

      {/* Main Downloader Interface */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Platform Tabs */}
        <div className="flex justify-center gap-2.5">
          {[
            { id: 'youtube', label: 'يوتيوب YouTube', color: 'hover:text-red-400' },
            { id: 'tiktok', label: 'تيك توك TikTok', color: 'hover:text-cyan-400' },
            { id: 'instagram', label: 'إنستقرام Instagram', color: 'hover:text-pink-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPlatform(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                platform === tab.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* URL Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">رابط الفيديو:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
              placeholder="الصق رابط الفيديو من يوتيوب، تيك توك، أو إنستقرام هنا..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            <button
              onClick={handlePaste}
              type="button"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-3 rounded-xl text-xs font-bold border border-slate-700 transition-all"
              title="لصق من الحافظة"
            >
              لصق
            </button>
          </div>
        </div>

        {/* Action Button: Fetch Info */}
        <button
          onClick={handleFetchInfo}
          disabled={isLoadingInfo}
          className="w-full bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
        >
          {isLoadingInfo ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري استخراج معلومات الفيديو...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>جلب معلومات الفيديو وخيارات التنزيل</span>
            </>
          )}
        </button>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loaded Video Details & Options Card */}
        {videoInfo && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 animate-fade-in">
            {/* Video Overview */}
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {videoInfo.thumbnail && (
                <div className="w-full md:w-56 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-1.5 flex-1">
                <h3 className="font-bold text-sm md:text-base text-white leading-snug">
                  {videoInfo.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>القناة: <b className="text-slate-200">{videoInfo.channel}</b></span>
                  <span>•</span>
                  <span>المدة: <b className="text-slate-200">{videoInfo.durationString}</b></span>
                </div>
              </div>
            </div>

            {/* Quality and Format Selectors */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 block">اختر الجودة أو الصيغة:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setAudioOnly(false); setSelectedQuality('best'); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    !audioOnly && selectedQuality === 'best'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  أعلى جودة متاحة (Best)
                </button>

                {videoInfo.formats.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => { setAudioOnly(false); setSelectedQuality(fmt.height.toString()); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      !audioOnly && selectedQuality === fmt.height.toString()
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}

                <button
                  onClick={() => setAudioOnly(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    audioOnly
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>صوت فقط MP3</span>
                </button>
              </div>
            </div>

            {/* Trimming & Clipping Section */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">اقتطاع جزء محدد فقط من الفيديو (Clip Trim)</span>
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
                      placeholder="00:01:30"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">وقت الانتهاء (HH:MM:SS أو بالثواني):</label>
                    <input
                      type="text"
                      placeholder="00:02:45"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Execute Download Button */}
            {!downloadReady ? (
              <button
                onClick={handleStartDownload}
                disabled={isDownloading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{downloadStatusText} ({downloadProgress.toFixed(0)}%)</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل الفيديو الآن على السيرفر</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اكتملت معالجة الفيديو بنجاح! ({downloadFileName})</span>
                </div>
                <a
                  href={`/api/downloader/file/${taskId}`}
                  download={downloadFileName}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-lg shadow-emerald-600/25"
                >
                  <Download className="w-4 h-4" />
                  <span>حفظ الملف على جهازك الآن</span>
                </a>
              </div>
            )}

            {/* Download Progress Bar */}
            {isDownloading && (
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{downloadStatusText}</span>
                  <span>{downloadProgress.toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
