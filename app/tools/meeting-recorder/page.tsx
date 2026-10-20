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
  ArrowRight,
  ExternalLink,
  Music,
  Film,
  FolderSync,
  ShieldCheck,
  Save,
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
  const [audioSource, setAudioSource] = useState<'all' | 'system' | 'mic'>('all');
  const [videoQuality, setVideoQuality] = useState<'1080p' | '720p' | '4k'>('1080p');

  // Result states
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [currentServerId, setCurrentServerId] = useState<string | null>(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isPreparingDownload, setIsPreparingDownload] = useState<'mp4' | 'mp3' | null>(null);

  // Google Drive Settings states
  const [driveLink, setDriveLink] = useState('');
  const [autoUploadToDrive, setAutoUploadToDrive] = useState(true);
  const [deleteLocalAfterUpload, setDeleteLocalAfterUpload] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // History & playback states
  const [recordingsList, setRecordingsList] = useState<SavedRecording[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [playingItem, setPlayingItem] = useState<SavedRecording | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load recordings and settings on mount
  useEffect(() => {
    fetchRecordings();
    fetchDriveSettings();
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

  const fetchDriveSettings = async () => {
    try {
      const res = await fetch('/api/recordings/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setDriveLink(data.settings.driveLink || '');
        setAutoUploadToDrive(data.settings.autoUpload ?? true);
        setDeleteLocalAfterUpload(data.settings.deleteAfterUpload ?? true);
      }
    } catch (err) {
      console.error('Failed to load drive settings:', err);
    }
  };

  const handleSaveDriveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsSavedSuccess(false);
    try {
      const res = await fetch('/api/recordings/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveLink,
          autoUpload: autoUploadToDrive,
          deleteAfterUpload: deleteLocalAfterUpload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSavedSuccess(true);
        setTimeout(() => setSettingsSavedSuccess(false), 3000);
      } else {
        alert(data.error || 'فشل في حفظ إعدادات Drive');
      }
    } catch (err: any) {
      alert('خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setIsSavingSettings(false);
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

  // Parse notes to check Drive upload status
  const getDriveStatus = (notes?: string) => {
    if (!notes) return { isUploaded: false, driveUrl: null, localPurged: false };
    try {
      if (notes.startsWith('{')) {
        const parsed = JSON.parse(notes);
        return {
          isUploaded: Boolean(parsed.uploadedToDrive),
          driveUrl: parsed.driveUrl || driveLink || null,
          localPurged: Boolean(parsed.localPurged),
        };
      }
    } catch {}
    return { isUploaded: false, driveUrl: null, localPurged: false };
  };

  // ==========================================
  // Start Screen & Audio Capture
  // ==========================================
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setRecordedBlob(null);
      setRecordedUrl(null);
      setUploadSuccess(false);

      // Resolve quality settings
      const qualityConfig = {
        '720p': { width: 1280, height: 720, fps: 30, bps: 2500000 },
        '1080p': { width: 1920, height: 1080, fps: 30, bps: 5000000 },
        '4k': { width: 3840, height: 2160, fps: 30, bps: 12000000 },
      }[videoQuality] || { width: 1920, height: 1080, fps: 30, bps: 5000000 };

      // 1. Get Screen Capture with full audio support (System + Tab + Speakers)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: qualityConfig.width },
          height: { ideal: qualityConfig.height },
          frameRate: { ideal: qualityConfig.fps },
        },
        audio: audioSource !== 'mic', // captures system/tab audio
      });

      let finalAudioTracks: MediaStreamTrack[] = [];

      // 2. Audio Mixing (All sounds: System/Device + Microphone)
      if (audioSource === 'all') {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: true,
            },
          });

          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const dest = audioCtx.createMediaStreamDestination();

          // Connect system/device sound from screen share if available
          if (displayStream.getAudioTracks().length > 0) {
            const screenSource = audioCtx.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]));
            const screenGain = audioCtx.createGain();
            screenGain.gain.value = 1.2; // slight boost for meeting participants
            screenSource.connect(screenGain).connect(dest);
          }

          // Connect microphone
          if (micStream.getAudioTracks().length > 0) {
            const micSource = audioCtx.createMediaStreamSource(micStream);
            const micGain = audioCtx.createGain();
            micGain.gain.value = 1.0;
            micSource.connect(micGain).connect(dest);
          }

          finalAudioTracks = dest.stream.getAudioTracks();
        } catch (micErr) {
          console.warn('Microphone access denied or unavailable, using system audio:', micErr);
          finalAudioTracks = displayStream.getAudioTracks();
        }
      } else if (audioSource === 'mic') {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        finalAudioTracks = micStream.getAudioTracks();
      } else {
        // System audio only
        finalAudioTracks = displayStream.getAudioTracks();
      }

      // 3. Combine Streams
      const combinedStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...finalAudioTracks,
      ]);
      streamRef.current = combinedStream;

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = combinedStream;
        previewVideoRef.current.play().catch(() => {});
      }

      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // 4. MediaRecorder with preferred universal MP4 / H.264 codecs first
      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const selectedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: qualityConfig.bps,
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
        const autoTitle = `اجتماع_${new Date().toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/[/\\?%*:|"<>]/g, '_')}`;
        setRecordingTitle(autoTitle);

        combinedStream.getTracks().forEach((track) => track.stop());
        displayStream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }

        // Auto save to server so it never disappears on refresh!
        autoSaveRecording(completeBlob, autoTitle);
      };

      mediaRecorder.start(1000);
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

  // Auto-save recording immediately when stopped so it persists on disk & DB
  const autoSaveRecording = async (blob: Blob, title: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', blob, `${title}.${ext}`);
      formData.append('title', title);
      formData.append('duration', recordingTime.toString());

      const res = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.recording) {
        setUploadSuccess(true);
        setCurrentServerId(data.recording.id);
        fetchRecordings();

        // If user already clicked download while upload was pending, trigger it now!
        if (isPreparingDownload && data.recording.id) {
          window.location.href = `/api/recordings/${data.recording.id}/download?format=${isPreparingDownload}`;
          setIsPreparingDownload(null);
        }

        // If Drive auto-upload is on and link is present, sync and open drive
        if (autoUploadToDrive && driveLink.trim() && data.recording?.id) {
          handleSyncToDrive(data.recording.id);
        }
      }
    } catch (err: any) {
      console.error('Auto save error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Direct Download (Triggers true server conversion if uploaded, or clean client download)
  const handleClientDownload = (format: 'mp4' | 'mp3') => {
    if (currentServerId) {
      // Use high quality server ffmpeg conversion!
      window.location.href = `/api/recordings/${currentServerId}/download?format=${format}`;
      return;
    }

    // If still uploading, queue the download to trigger immediately upon upload completion
    if (isUploading) {
      setIsPreparingDownload(format);
      return;
    }

    if (!recordedUrl || !recordedBlob) return;
    const a = document.createElement('a');
    a.href = recordedUrl;
    const cleanTitle = (recordingTitle || 'Meeting_Recording').replace(/[/\\?%*:|"<>]/g, '').trim();
    // Use proper extension matching recorded blob
    const isActuallyMp4 = recordedBlob.type.includes('mp4');
    const finalExt = format === 'mp3' ? 'mp3' : (isActuallyMp4 ? 'mp4' : 'webm');
    a.download = `${cleanTitle}.${finalExt}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch {}
    }, 1000);
  };

  // Save to Server with persistent protection and auto Drive trigger
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
      if (data.success && data.recording) {
        setUploadSuccess(true);
        setCurrentServerId(data.recording.id);
        fetchRecordings();

        // If auto-upload to Drive is enabled and a Drive link is set, trigger sync automatically!
        if (autoUploadToDrive && driveLink.trim() && data.recording?.id) {
          handleSyncToDrive(data.recording.id);
        }
      } else {
        alert(data.error || 'فشل في حفظ التسجيل إلى السيرفر');
      }
    } catch (err: any) {
      alert('خطأ أثناء حفظ التسجيل: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Sync to Google Drive, open folder, and safely free server storage
  const handleSyncToDrive = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/recordings/${id}/sync-drive`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchRecordings();
        // If a Google Drive link is configured, open it in a new window/tab so user can confirm/upload
        if (driveLink && driveLink.startsWith('http')) {
          window.open(driveLink, '_blank', 'noopener,noreferrer');
        }
      } else {
        alert(data.error || 'تعذرت المزامنة مع Google Drive');
      }
    } catch (err: any) {
      alert('خطأ أثناء المزامنة: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  // Delete recording with safe-check if not uploaded to Drive yet
  const handleDelete = async (rec: SavedRecording) => {
    const driveInfo = getDriveStatus(rec.notes);
    if (!driveInfo.isUploaded) {
      const confirmed = confirm(
        '⚠️ تنبيه أمني: هذا التسجيل لم يتم رفعه بعد إلى Google Drive!\nهل أنت متأكد من رغبتك في حذفه نهائياً من السيرفر الآن؟'
      );
      if (!confirmed) return;
    } else {
      if (!confirm('هل تريد حذف سجل هذا الاجتماع نهائياً؟')) return;
    }

    try {
      const res = await fetch(`/api/recordings/${rec.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRecordings();
        if (playingItem?.id === rec.id) setPlayingItem(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <Video className="w-4 h-4" />
            <span>استوديو تسجيل الاجتماعات الذكي • Creziax Meeting Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            مسجل الاجتماعات والشاشة مع النسخ الاحتياطي السحابي
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تسجيل فوري بدون برامج • تنزيل كصوت MP3 أو فيديو MP4 • رفع تلقائي إلى Google Drive مع تفريغ مساحة السيرفر تلقائياً
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
        {/* Left Column: Live Preview & Recorded Output (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl aspect-video flex items-center justify-center">
            {/* Live Preview Video */}
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
                <h3 className="text-lg font-bold text-white">الاستوديو جاهز لبدء التسجيل</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  اضغط على الزر الأخضر لبدء تسجيل نافذة الاجتماع بالصوت والصورة، وسيتم حفظ كل شيء تلقائياً.
                </p>
              </div>
            )}

            {/* Finished Recording Player */}
            {!isRecording && recordedUrl && (
              <video
                src={recordedUrl}
                controls
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Floating Status Bar during recording */}
            {isRecording && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 pointer-events-auto">
                  <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'}`} />
                  <span className="text-xs font-mono font-bold text-white tracking-widest">
                    {formatTime(recordingTime)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isPaused ? '(مؤقت)' : '(جاري التسجيل)'}
                  </span>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-[11px] text-emerald-400 font-medium pointer-events-auto flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>محمي من الانقطاع</span>
                </div>
              </div>
            )}

            {/* Floating Controls Bar at Bottom of Video */}
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
                    <span>إنهاء وحفظ التسجيل</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar when Video is Recorded: MP4 / MP3 Downloads & Auto-Upload */}
          {!isRecording && recordedBlob && (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-4 animate-fade-in shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>اكتمل التسجيل بنجاح! ({formatTime(recordingTime)} • {formatFileSize(recordedBlob.size)})</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    اختر التنزيل المباشر كصوت MP3 أو فيديو MP4، أو احفظه على السيرفر ليتم رفعه تلقائياً للـ Drive.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Download MP4 */}
                  <button
                    onClick={() => handleClientDownload('mp4')}
                    disabled={isPreparingDownload === 'mp4'}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-700 transition-all disabled:opacity-60"
                  >
                    <Film className={`w-3.5 h-3.5 text-cyan-400 ${isPreparingDownload === 'mp4' ? 'animate-spin' : ''}`} />
                    <span>{isPreparingDownload === 'mp4' ? 'جاري تجهيز MP4...' : 'تنزيل فيديو MP4'}</span>
                  </button>

                  {/* Download MP3 */}
                  <button
                    onClick={() => handleClientDownload('mp3')}
                    disabled={isPreparingDownload === 'mp3'}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-700 transition-all disabled:opacity-60"
                  >
                    <Music className={`w-3.5 h-3.5 text-amber-400 ${isPreparingDownload === 'mp3' ? 'animate-spin' : ''}`} />
                    <span>{isPreparingDownload === 'mp3' ? 'جاري تجهيز MP3...' : 'تنزيل صوت MP3'}</span>
                  </button>

                  {/* Direct Open / Upload to Google Drive */}
                  {driveLink && driveLink.startsWith('http') && (
                    <button
                      onClick={() => {
                        if (currentServerId) {
                          handleSyncToDrive(currentServerId);
                        } else {
                          window.open(driveLink, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold border border-amber-500/30 transition-all shadow-md"
                    >
                      <FolderSync className="w-3.5 h-3.5 text-amber-400" />
                      <span>فتح مجلد Drive للرفع</span>
                    </button>
                  )}

                  {/* Save to Server & Auto-sync to Drive */}
                  <button
                    onClick={handleSaveToServer}
                    disabled={isUploading}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all ${
                      uploadSuccess
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/25'
                    }`}
                  >
                    {isUploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : uploadSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>
                      {isUploading
                        ? 'جاري الحفظ بالسيرفر...'
                        : uploadSuccess
                        ? 'محفوظ بالسيرفر والأرشيف ✓'
                        : 'حفظ بالسيرفر والأرشيف'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder="أدخل عنوان الاجتماع..."
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 flex-1 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Simple Controls & Google Drive Settings Box (1 col) */}
        <div className="space-y-4">
          {/* Quick Record Trigger Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>بدء تسجيل اجتماع</span>
            </h3>

            {/* Audio Source Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">مصدر التقاط الصوت:</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setAudioSource('all')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                    audioSource === 'all'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold">جميع أصوات الجهاز + المايك (شامل كل شيء)</div>
                      <div className="text-[10px] text-slate-400">يلقط صوت المكالمة، اليوتيوب، الزوم، والسماعات + المايك</div>
                    </div>
                  </div>
                  {audioSource === 'all' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
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
                    <Monitor className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="text-xs font-bold">صوت الجهاز الداخلي فقط (بدون مايك)</div>
                      <div className="text-[10px] text-slate-400">صوت المشاركين في المكالمة أو البرامج فقط</div>
                    </div>
                  </div>
                  {audioSource === 'system' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
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
                    <Mic className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold">صوت الميكروفون فقط</div>
                      <div className="text-[10px] text-slate-400">صوتك الشخصي من المايك</div>
                    </div>
                  </div>
                  {audioSource === 'mic' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Video Resolution / Quality Selector */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 block">دقة وجودة تصوير الفيديو:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setVideoQuality('720p')}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                    videoQuality === '720p'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-xs">HD 720p</div>
                  <div className="text-[9px] text-slate-500">حجم أصغر</div>
                </button>

                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setVideoQuality('1080p')}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                    videoQuality === '1080p'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-xs">FHD 1080p</div>
                  <div className="text-[9px] text-cyan-400">الموصى به</div>
                </button>

                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setVideoQuality('4k')}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                    videoQuality === '4k'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-xs">4K Ultra</div>
                  <div className="text-[9px] text-slate-500">أعلى دقة</div>
                </button>
              </div>
            </div>

            {/* Big Launch Button */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black py-4 rounded-xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all text-sm active:scale-[0.98]"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                <span>بدء تسجيل الاجتماع الآن</span>
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
          </div>

          {/* Google Drive Integration & Storage Safety Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-amber-400" />
                <span>ربط التخزين السحابي (Google Drive)</span>
              </h3>
              {settingsSavedSuccess && (
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>تم الحفظ</span>
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1 font-semibold">
                  رابط مجلد Google Drive أو رابط الرفع:
                </label>
                <input
                  type="text"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUploadToDrive}
                    onChange={(e) => setAutoUploadToDrive(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>رفع التسجيل تلقائياً إلى Drive بعد كل ميتنج</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteLocalAfterUpload}
                    onChange={(e) => setDeleteLocalAfterUpload(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>تفريغ مساحة السيرفر تلقائياً بعد اكتمال الرفع للـ Drive</span>
                </label>
              </div>

              <button
                onClick={handleSaveDriveSettings}
                disabled={isSavingSettings}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-xs shadow-md"
              >
                {isSavingSettings ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>حفظ إعدادات Drive</span>
              </button>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>طريقة عمل الرفع إلى Google Drive:</span>
                </p>
                <p className="leading-relaxed">
                  ضع رابط مجلد الـ Drive المشترك الخاص بك أعلاه. عند انتهاء الاجتماع والضغط على تنزيل MP4 أو MP3، يفتح النظام مجلد الـ Drive تلقائياً في نافذة جديدة لتقوم بإفلات الملف فيه فوراً وبكل سهولة.
                </p>
                <p className="leading-relaxed text-slate-500">
                  حماية إضافية: لن يُمسح التسجيل من السيرفر حتى تتأكد من اكتمال وجوده على الدرايف بأمان.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archive / History Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">سجل وأرشيف تسجيلات الاجتماعات</h2>
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
            <p className="text-xs">لا توجد تسجيلات محفوظة حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="p-3">عنوان الاجتماع</th>
                  <th className="p-3">المدة</th>
                  <th className="p-3">الحجم</th>
                  <th className="p-3">حالة السحابة (Drive)</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3 text-center">خيارات التنزيل والإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recordingsList.map((rec) => {
                  const driveInfo = getDriveStatus(rec.notes);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-xs">{rec.title}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{formatTime(rec.durationSeconds)}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {driveInfo.localPurged ? (
                          <span className="text-emerald-400 text-[11px]">مفرغ من السيرفر (0 MB)</span>
                        ) : (
                          formatFileSize(rec.fileSize)
                        )}
                      </td>
                      <td className="p-3">
                        {driveInfo.isUploaded ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مرفوع على Drive</span>
                            </span>
                            {driveInfo.driveUrl && (
                              <a
                                href={driveInfo.driveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-white p-1"
                                title="فتح مجلد Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSyncToDrive(rec.id)}
                            disabled={syncingId === rec.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 text-[11px] font-bold transition-all"
                            title="رفع الآن إلى Google Drive وتفريغ السيرفر"
                          >
                            <FolderSync className={`w-3 h-3 ${syncingId === rec.id ? 'animate-spin' : ''}`} />
                            <span>{syncingId === rec.id ? 'جاري الرفع...' : 'رفع إلى Drive الآن'}</span>
                          </button>
                        )}
                      </td>
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
                          {/* Play video preview */}
                          {!driveInfo.localPurged && (
                            <button
                              onClick={() => setPlayingItem(rec)}
                              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors"
                              title="تشغيل الفيديو"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Download as MP4 Video */}
                          {!driveInfo.localPurged && (
                            <a
                              href={`/api/recordings/${rec.id}/download?format=mp4`}
                              download
                              className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-colors flex items-center gap-1 font-bold text-[10px]"
                              title="تنزيل فيديو MP4"
                            >
                              <Film className="w-3 h-3" />
                              <span>MP4</span>
                            </a>
                          )}

                          {/* Download as MP3 Audio */}
                          {!driveInfo.localPurged && (
                            <a
                              href={`/api/recordings/${rec.id}/download?format=mp3`}
                              download
                              className="p-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white transition-colors flex items-center gap-1 font-bold text-[10px]"
                              title="تنزيل صوت MP3"
                            >
                              <Music className="w-3 h-3" />
                              <span>MP3</span>
                            </a>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(rec)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors"
                            title="حذف الاجتماع"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                src={`/api/recordings/${playingItem.id}/download?format=mp4`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                الحجم: {formatFileSize(playingItem.fileSize)} • المدة: {formatTime(playingItem.durationSeconds)}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/recordings/${playingItem.id}/download?format=mp4`}
                  download
                  className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-lg font-bold"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>تحميل فيديو MP4</span>
                </a>

                <a
                  href={`/api/recordings/${playingItem.id}/download?format=mp3`}
                  download
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-lg font-bold"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>تحميل صوت MP3</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
