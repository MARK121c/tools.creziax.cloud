'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Play,
  Square,
  Pause,
  Download,
  UploadCloud,
  Trash2,
  Share2,
  Clock,
  Mic,
  Monitor,
  Volume2,
  Sparkles,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Eye,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface SavedRecording {
  id: string;
  title: string;
  durationSeconds: number;
  fileSize: number;
  fileName: string;
  mimeType: string;
  createdAt: string;
  notes?: string;
}

export default function WebMeetingRecorderPage() {
  // Capture states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioSource, setAudioSource] = useState<'dual' | 'system' | 'mic'>('dual');
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);

  // Result states
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // History & playback states
  const [recordingsList, setRecordingsList] = useState<SavedRecording[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [playingItem, setPlayingItem] = useState<SavedRecording | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load saved recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/recordings');
      const data = await res.json();
      if (data.success) {
        setRecordingsList(data.recordings || []);
      }
    } catch (err) {
      console.error('Failed to load recordings:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  // Timer logic
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // ==========================================
  // Start WebRTC Dual-Audio Capture
  // ==========================================
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setRecordedBlob(null);
      setRecordedUrl(null);
      setUploadSuccess(false);

      const width = resolution === '1080p' ? 1920 : 1280;
      const height = resolution === '1080p' ? 1080 : 720;

      // 1. Get Screen Capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: fps },
        },
        audio: audioSource === 'system' || audioSource === 'dual',
      });

      let finalAudioTracks: MediaStreamTrack[] = [];

      // 2. Dual Audio Mixing (Web Audio API)
      if (audioSource === 'dual') {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });

          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const dest = audioCtx.createMediaStreamDestination();

          // Connect Screen Audio
          if (displayStream.getAudioTracks().length > 0) {
            const screenSource = audioCtx.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]));
            const screenGain = audioCtx.createGain();
            screenGain.gain.value = 1.0;
            screenSource.connect(screenGain).connect(dest);
          }

          // Connect Mic Audio
          if (micStream.getAudioTracks().length > 0) {
            const micSource = audioCtx.createMediaStreamSource(micStream);
            const micGain = audioCtx.createGain();
            micGain.gain.value = 1.0;
            micSource.connect(micGain).connect(dest);
          }

          finalAudioTracks = dest.stream.getAudioTracks();
        } catch (micErr) {
          console.warn('Microphone access denied or unavailable, using system audio only:', micErr);
          finalAudioTracks = displayStream.getAudioTracks();
        }
      } else if (audioSource === 'mic') {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        finalAudioTracks = micStream.getAudioTracks();
      } else {
        finalAudioTracks = displayStream.getAudioTracks();
      }

      // 3. Create Combined Stream
      const combinedStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...finalAudioTracks,
      ]);
      streamRef.current = combinedStream;

      // Connect to Live Preview
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = combinedStream;
        previewVideoRef.current.play().catch(() => {});
      }

      // Handle user pressing browser's native "Stop Sharing" button
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // 4. Setup MediaRecorder
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: resolution === '1080p' ? 4500000 : 2500000,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const completeBlob = new Blob(chunksRef.current, { type: selectedMime });
        const url = URL.createObjectURL(completeBlob);
        setRecordedBlob(completeBlob);
        setRecordedUrl(url);
        setRecordingTitle(`تسجيل_اجتماع_${new Date().toISOString().slice(0, 10)}`);

        // Stop all track hardware
        combinedStream.getTracks().forEach((track) => track.stop());
        displayStream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
      };

      mediaRecorder.start(1000); // chunk every 1s
      mediaRecorderRef.current = mediaRecorder;

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    } catch (err: any) {
      console.error('Error starting screen recording:', err);
      alert(err.message || 'فشل في بدء تسجيل الشاشة. يرجى منح الإذن عند طلب المتصفح.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  // ==========================================
  // Direct Download to Computer
  // ==========================================
  const handleDirectDownload = () => {
    if (!recordedUrl || !recordedBlob) return;
    const a = document.createElement('a');
    a.href = recordedUrl;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${recordingTitle || 'Meeting_Recording'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ==========================================
  // Save & Upload to Server Database
  // ==========================================
  const handleSaveToServer = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', recordedBlob, `${recordingTitle || 'recording'}.${ext}`);
      formData.append('title', recordingTitle || 'تسجيل اجتماع جديد');
      formData.append('duration', recordingTime.toString());

      const res = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadSuccess(true);
        fetchRecordings();
      } else {
        alert(data.error || 'فشل في رفع التسجيل إلى السيرفر');
      }
    } catch (err: any) {
      alert('خطأ أثناء رفع التسجيل: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete recording
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التسجيل؟')) return;
    try {
      const res = await fetch(`/api/recordings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRecordings();
        if (playingItem?.id === id) setPlayingItem(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy shareable download link
  const copyShareLink = (id: string) => {
    const link = `${window.location.origin}/api/recordings/${id}/download`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <Video className="w-4 h-4" />
            <span>استوديو تسجيل الشاشة والاجتماعات المباشر • Creziax Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            مسجل الاجتماعات والشاشة من المتصفح مباشرة
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            يعمل مباشرة داخل الموقع بدون تثبيت برامج • تسجيل بدقة 1080p مع دمج صوت النظام والميكروفون وحفظ بالسيرفر
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

      {/* Main Studio Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Video Live Preview & Controls (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl aspect-video flex items-center justify-center">
            {/* Live Preview Video or Standby Screen */}
            <video
              ref={previewVideoRef}
              className={`w-full h-full object-contain ${isRecording ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {!isRecording && !recordedUrl && (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
                  <Monitor className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">الاستوديو جاهز للتسجيل</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  اختر مصدر الصوت والدقة ثم اضغط على زر بدء التسجيل لاختيار نافذة الاجتماع أو الشاشة بالكامل
                </p>
              </div>
            )}

            {/* If Recording Finished: Show Recorded Video Player */}
            {!isRecording && recordedUrl && (
              <video
                src={recordedUrl}
                controls
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Floating Top Status Bar during recording */}
            {isRecording && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 pointer-events-auto">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'}`} />
                  <span className="text-xs font-mono font-bold text-white tracking-widest">
                    {formatTime(recordingTime)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isPaused ? '(مؤقت)' : '(جاري التسجيل)'}
                  </span>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-[11px] text-cyan-300 font-mono pointer-events-auto">
                  {resolution} • {fps}FPS
                </div>
              </div>
            )}

            {/* Floating Controls Bar at Bottom of Video during recording */}
            {isRecording && (
              <div className="absolute bottom-5 inset-x-0 flex justify-center items-center gap-3">
                <div className="bg-slate-950/90 backdrop-blur-lg border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
                  {isPaused ? (
                    <button
                      onClick={resumeRecording}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>استئناف</span>
                    </button>
                  ) : (
                    <button
                      onClick={pauseRecording}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>إيقاف مؤقت</span>
                    </button>
                  )}

                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>إنهاء وحفظ</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar when Video is Recorded */}
          {!isRecording && recordedBlob && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تم التقاط التسجيل بنجاح! ({formatTime(recordingTime)} • {formatFileSize(recordedBlob.size)})</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    يمكنك تنزيل الفيديو على جهازك فوراً أو حفظه وأرشفته على سيرفر المنصة.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleDirectDownload}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 transition-all"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>تنزيل على جهازك</span>
                  </button>

                  <button
                    onClick={handleSaveToServer}
                    disabled={isUploading || uploadSuccess}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all ${
                      uploadSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-600/25'
                    }`}
                  >
                    {isUploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : uploadSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>{uploadSuccess ? 'تم الحفظ بالسيرفر' : isUploading ? 'جاري الرفع...' : 'حفظ بالسيرفر'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder="أدخل عنوان التسجيل (اختياري)..."
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 flex-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recording Settings & Trigger (1 col) */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>إعدادات التسجيل الفوري</span>
            </h3>

            {/* Audio Source Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">مصدر التقاط الصوت:</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setAudioSource('dual')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                    audioSource === 'dual'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold">صوت مدمج (Dual Mixed Audio)</div>
                      <div className="text-[10px] text-slate-400">صوت الاجتماع + الميكروفون معاً</div>
                    </div>
                  </div>
                  {audioSource === 'dual' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </button>

                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setAudioSource('system')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                    audioSource === 'system'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Monitor className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold">صوت النظام / التاب فقط</div>
                      <div className="text-[10px] text-slate-400">صوت المشاركين في الاجتماع</div>
                    </div>
                  </div>
                  {audioSource === 'system' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </button>

                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setAudioSource('mic')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                    audioSource === 'mic'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Mic className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold">الميكروفون فقط</div>
                      <div className="text-[10px] text-slate-400">صوتك الشخصي من المايك</div>
                    </div>
                  </div>
                  {audioSource === 'mic' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </button>
              </div>
            </div>

            {/* Quality and FPS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">دقة الفيديو:</label>
                <select
                  disabled={isRecording}
                  value={resolution}
                  onChange={(e: any) => setResolution(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="1080p">1080p Full HD</option>
                  <option value="720p">720p HD</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">معدل الإطارات:</label>
                <select
                  disabled={isRecording}
                  value={fps}
                  onChange={(e: any) => setFps(Number(e.target.value) as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={30}>30 FPS (متوازن)</option>
                  <option value={60}>60 FPS (فائق السلاسة)</option>
                </select>
              </div>
            </div>

            {/* Big Launch Button */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black py-4 rounded-xl shadow-xl shadow-cyan-600/25 flex items-center justify-center gap-2.5 transition-all text-sm active:scale-[0.98]"
              >
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span>بدء تسجيل الشاشة الآن</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2.5 transition-all text-sm"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>إنهاء وحفظ التسجيل ({formatTime(recordingTime)})</span>
              </button>
            )}

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">💡 نصيحة عند التسجيل:</p>
              <p>عند ظهور نافذة المتصفح، اختر &quot;نافذة الاجتماع&quot; وتأكد من تفعيل خيار &quot;مشاركة صوت النظام/التبويب&quot; للحصول على صوت نقي.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Archive / History Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">أرشيف التسجيلات المحفوظة على السيرفر</h2>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-mono">
              {recordingsList.length}
            </span>
          </div>

          <button
            onClick={fetchRecordings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        {recordingsList.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <Video className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-xs">لا توجد تسجيلات مؤرشفة حالياً على السيرفر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="p-3">عنوان التسجيل</th>
                  <th className="p-3">المدة</th>
                  <th className="p-3">الحجم</th>
                  <th className="p-3">تاريخ الحفظ</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recordingsList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="truncate max-w-xs">{rec.title}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{formatTime(rec.durationSeconds)}</td>
                    <td className="p-3 font-mono text-slate-400">{formatFileSize(rec.fileSize)}</td>
                    <td className="p-3 text-slate-400" dir="ltr">
                      {new Date(rec.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPlayingItem(rec)}
                          className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors"
                          title="تشغيل الفيديو"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={`/api/recordings/${rec.id}/download`}
                          download
                          className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-colors"
                          title="تحميل الملف"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => copyShareLink(rec.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="نسخ رابط التحميل المباشر"
                        >
                          {copiedId === rec.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors"
                          title="حذف التسجيل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Video Player for Saved Recording */}
      {playingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-3">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">{playingItem.title}</h3>
              </div>
              <button
                onClick={() => setPlayingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <video
                src={`/api/recordings/${playingItem.id}/download`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 flex items-center justify-between text-xs text-slate-400">
              <div>
                الحجم: {formatFileSize(playingItem.fileSize)} • المدة: {formatTime(playingItem.durationSeconds)}
              </div>
              <a
                href={`/api/recordings/${playingItem.id}/download`}
                download
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-lg font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل على الجهاز</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
