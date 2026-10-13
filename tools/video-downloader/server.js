/**
 * ==============================================
 *  أداة تنزيل الفيديوهات - السيرفر الخلفي
 *  Video Downloader - Backend Server
 * ==============================================
 *
 * يدعم: يوتيوب، تيك توك، إنستقرام
 * المحرك: yt-dlp + ffmpeg
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3500;

// ===== Middleware =====
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// ===== مجلد التحميلات المؤقتة =====
const TEMP_DIR = path.join(os.tmpdir(), 'video-downloader-temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ===== تخزين حالة المهام =====
const tasks = new Map();

// مسار yt-dlp (المحلي أولاً، ثم العام في PATH)
function getYtDlpPath() {
    const localExe = path.join(__dirname, 'yt-dlp.exe');
    if (fs.existsSync(localExe)) {
        return localExe;
    }
    return 'yt-dlp';
}

// ===== دوال مساعدة =====

/**
 * التحقق من صحة الرابط حسب المنصة
 */
function validateUrl(url, platform) {
    const patterns = {
        youtube: /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/i,
        tiktok: /^(https?:\/\/)?(www\.|vm\.)?tiktok\.com\//i,
        instagram: /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|stories)\//i,
    };
    return patterns[platform]?.test(url) || false;
}

/**
 * تحويل الثواني لصيغة مقروءة
 */
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * استخراج الجودات المتاحة
 */
function extractFormats(info, platform) {
    const formats = [];

    if (platform === 'youtube') {
        const availableHeights = new Set();
        if (info.formats) {
            info.formats.forEach(f => {
                if (f.height) availableHeights.add(f.height);
            });
        }
        if (availableHeights.has(2160) || availableHeights.size === 0) {
            formats.push({ value: '4k', label: '4K (2160p)' });
        }
        formats.push({ value: '1080p', label: '1080p Full HD' });
        formats.push({ value: '720p', label: '720p HD' });
        formats.push({ value: '480p', label: '480p' });
        formats.push({ value: 'audio', label: 'صوت فقط (MP3)' });
    } else if (platform === 'tiktok') {
        formats.push({ value: 'best', label: 'أفضل جودة' });
        formats.push({ value: 'audio', label: 'صوت فقط (MP3)' });
    } else if (platform === 'instagram') {
        formats.push({ value: 'best', label: 'أفضل جودة' });
        formats.push({ value: 'audio', label: 'صوت فقط (MP3)' });
    }

    return formats;
}

// ============================================================
//  API ENDPOINTS
// ============================================================

/**
 * POST /api/info
 * جلب معلومات الفيديو من الرابط
 */
app.post('/api/info', async (req, res) => {
    const { url, platform } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, error: 'الرجاء إدخال رابط الفيديو' });
    }

    if (platform && !validateUrl(url, platform)) {
        return res.status(400).json({
            success: false,
            error: `الرابط المدخل لا يتوافق مع منصة ${platform === 'youtube' ? 'يوتيوب' : platform === 'tiktok' ? 'تيك توك' : 'إنستقرام'}`
        });
    }

    try {
        const output = await new Promise((resolve, reject) => {
            const args = ['--js-runtimes', 'node', '--dump-json', '--no-download', '--no-warnings', url];
            const proc = spawn(getYtDlpPath(), args, { windowsHide: true });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', d => { stdout += d.toString(); });
            proc.stderr.on('data', d => { stderr += d.toString(); });
            proc.on('close', code => {
                if (code === 0) resolve(stdout.trim());
                else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
            });
            proc.on('error', err => reject(err));
        });

        // قد يرجع أكثر من JSON object (مثل carousel الإنستقرام)
        const jsonLines = output.split('\n').filter(line => {
            try { JSON.parse(line); return true; } catch { return false; }
        });
        const entries = jsonLines.map(line => JSON.parse(line));

        if (entries.length === 0) {
            throw new Error('لم يتم العثور على معلومات الفيديو');
        }

        // فيديو واحد
        if (entries.length === 1) {
            const info = entries[0];
            return res.json({
                success: true,
                data: {
                    title: info.title || 'بدون عنوان',
                    thumbnail: info.thumbnail || '',
                    duration: info.duration || 0,
                    durationString: formatDuration(info.duration || 0),
                    channel: info.uploader || info.channel || info.creator || 'غير معروف',
                    description: info.description ? info.description.substring(0, 200) : '',
                    formats: extractFormats(info, platform),
                    isCarousel: false,
                    platform: platform
                }
            });
        }

        // منشور متعدد (Carousel)
        const items = entries.map((info, index) => ({
            index: index,
            title: info.title || `عنصر ${index + 1}`,
            thumbnail: info.thumbnail || '',
            duration: info.duration || 0,
            type: (info.ext === 'mp4' || info.vcodec !== 'none') ? 'video' : 'image'
        }));

        return res.json({
            success: true,
            data: {
                title: entries[0].title || 'منشور متعدد',
                thumbnail: entries[0].thumbnail || '',
                channel: entries[0].uploader || entries[0].channel || 'غير معروف',
                formats: extractFormats(entries[0], platform),
                isCarousel: true,
                carouselItems: items,
                totalItems: items.length,
                platform: platform
            }
        });

    } catch (err) {
        console.error('Info fetch error:', err.message);

        let errorMsg = 'فشل في جلب معلومات الفيديو';
        if (err.message.includes('Private') || err.message.includes('private')) {
            errorMsg = 'هذا الفيديو خاص ولا يمكن الوصول إليه';
        } else if (err.message.includes('not exist') || err.message.includes('404') || err.message.includes('unavailable')) {
            errorMsg = 'الفيديو غير موجود أو تم حذفه';
        } else if (err.message.includes('rate') || err.message.includes('429')) {
            errorMsg = 'تم تجاوز حد الطلبات. الرجاء الانتظار قليلاً والمحاولة مرة أخرى';
        } else if (err.message.includes('is not recognized') || err.message.includes('ENOENT')) {
            errorMsg = 'yt-dlp غير مثبت. الرجاء تثبيته أولاً (https://github.com/yt-dlp/yt-dlp/releases)';
        }

        return res.status(500).json({ success: false, error: errorMsg });
    }
});

/**
 * POST /api/download/start
 * بدء عملية التحميل في الخلفية وإرجاع معرّف المهمة
 */
app.post('/api/download/start', async (req, res) => {
    const { url, platform, quality, startTime, endTime, noWatermark, audioOnly, carouselIndex } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, error: 'الرجاء إدخال رابط الفيديو' });
    }

    const taskId = uuidv4();
    const taskDir = path.join(TEMP_DIR, taskId);
    fs.mkdirSync(taskDir, { recursive: true });

    // تهيئة حالة المهمة
    tasks.set(taskId, {
        status: 'processing',
        progress: 0,
        message: 'جاري التحضير...',
        filePath: null,
        fileName: null,
        error: null
    });

    // إرجاع معرّف المهمة فوراً
    res.json({ success: true, taskId });

    // بدء التحميل في الخلفية
    processDownload(taskId, taskDir, { url, platform, quality, startTime, endTime, noWatermark, audioOnly, carouselIndex });
});

/**
 * GET /api/status/:taskId
 * الاستعلام عن حالة التحميل
 */
app.get('/api/status/:taskId', (req, res) => {
    const task = tasks.get(req.params.taskId);
    if (!task) {
        return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
    }
    res.json({ success: true, ...task, filePath: undefined });
});

/**
 * GET /api/file/:taskId
 * تحميل الملف النهائي
 */
app.get('/api/file/:taskId', (req, res) => {
    const task = tasks.get(req.params.taskId);
    if (!task || task.status !== 'done' || !task.filePath) {
        return res.status(404).json({ success: false, error: 'الملف غير متوفر' });
    }

    res.download(task.filePath, task.fileName, () => {
        // تنظيف بعد 5 دقائق
        setTimeout(() => {
            try {
                const taskDir = path.dirname(task.filePath);
                fs.rmSync(taskDir, { recursive: true, force: true });
                tasks.delete(req.params.taskId);
            } catch (e) { /* تجاهل أخطاء التنظيف */ }
        }, 5 * 60 * 1000);
    });
});

// ============================================================
//  معالجة التحميل في الخلفية
// ============================================================

async function processDownload(taskId, taskDir, options) {
    const { url, platform, quality, startTime, endTime, noWatermark, audioOnly, carouselIndex } = options;
    const task = tasks.get(taskId);

    try {
        const isAudio = audioOnly || quality === 'audio';
        const hasTrimming = !!(startTime || endTime);

        // مسار القالب لتنزيل الملف الأولي
        const rawTemplate = path.join(taskDir, 'raw_%(title).100B.%(ext)s');

        const args = [
            '--js-runtimes', 'node',
            '-o', rawTemplate,
            '--no-warnings',
            '--newline',
            '--no-playlist',
            '-N', '8', // تحميل متعدد المسارات (Multi-threading) لتسريع التحميل 5-10 أضعاف
            '--buffer-size', '16M'
        ];

        // === اختيار الجودة والصيغة المتوافقة مع برامج المونتاج بأعلى سرعة ===
        if (isAudio) {
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
        } else if (platform === 'youtube') {
            if (quality === '4k') {
                args.push('-f', 'bv*[height<=2160]+ba/b');
                // تحويل لـ H.264 + AAC بسرعة فائقة لكي يقبله Premiere Pro
                args.push('--recode-video', 'mp4');
                args.push('--postprocessor-args', 'VideoConvertor:-c:v libx264 -preset veryfast -threads 0 -pix_fmt yuv420p -c:a aac -b:a 192k');
            } else if (quality === '1080p') {
                args.push('-f', 'bv*[vcodec^=avc1][height<=1080]+ba[acodec^=mp4a]/bv*[height<=1080]+ba/b');
                args.push('--merge-output-format', 'mp4');
                args.push('--postprocessor-args', 'Merger:-c:v copy -c:a aac');
            } else if (quality === '720p') {
                args.push('-f', 'bv*[vcodec^=avc1][height<=720]+ba[acodec^=mp4a]/bv*[height<=720]+ba/b');
                args.push('--merge-output-format', 'mp4');
                args.push('--postprocessor-args', 'Merger:-c:v copy -c:a aac');
            } else if (quality === '480p') {
                args.push('-f', 'bv*[vcodec^=avc1][height<=480]+ba[acodec^=mp4a]/bv*[height<=480]+ba/b');
                args.push('--merge-output-format', 'mp4');
                args.push('--postprocessor-args', 'Merger:-c:v copy -c:a aac');
            } else {
                args.push('-f', 'bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*+ba/b');
                args.push('--merge-output-format', 'mp4');
                args.push('--postprocessor-args', 'Merger:-c:v copy -c:a aac');
            }
        } else {
            // تيك توك وإنستقرام
            args.push('-f', 'bestvideo+bestaudio/best');
            if (!isAudio) {
                args.push('--merge-output-format', 'mp4');
            }
        }

        // إنستقرام: اختيار عنصر معين من الـ carousel
        if (platform === 'instagram' && carouselIndex !== undefined && carouselIndex !== null && carouselIndex !== 'all') {
            args.push('--playlist-items', String(Number(carouselIndex) + 1));
        }

        args.push(url);

        // تحديث الحالة
        task.status = 'downloading';
        task.message = 'جاري تنزيل الفيديو بأقصى سرعة... ⚡';
        task.progress = 10;

        // تشغيل yt-dlp
        let lastStderr = '';
        await new Promise((resolve, reject) => {
            const proc = spawn(getYtDlpPath(), args, { windowsHide: true });

            proc.stdout.on('data', (data) => {
                const line = data.toString();
                const progressMatch = line.match(/(\d+\.?\d*)%/);
                if (progressMatch) {
                    const pct = parseFloat(progressMatch[1]);
                    // إذا كان هناك قص، نخصص 85% للتحميل و 15% للقص
                    task.progress = hasTrimming ? Math.min(85, Math.round(pct * 0.85)) : Math.min(95, Math.round(pct));
                    task.message = `جاري التحميل... %${task.progress}`;
                }
                if (line.includes('[Merger]') || line.includes('Merging')) {
                    task.message = 'جاري دمج ومعالجة الفيديو والصوت...';
                }
            });

            proc.stderr.on('data', (data) => {
                const line = data.toString();
                lastStderr += line;
            });

            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(lastStderr.trim() || `yt-dlp فشل برمز الخروج ${code}`));
            });

            proc.on('error', (err) => {
                reject(new Error(`فشل في تشغيل yt-dlp: ${err.message}`));
            });
        });

        // البحث عن الملف الذي تم تنزيله
        const rawFiles = fs.readdirSync(taskDir).filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl'));
        if (rawFiles.length === 0) {
            throw new Error('لم يتم العثور على الملف المحمل');
        }

        const rawFilePath = path.join(taskDir, rawFiles[0]);
        let finalFilePath = rawFilePath;
        let finalFileName = rawFiles[0].replace(/^raw_/, '');

        // === خطوة القص السريع عبر ffmpeg (إذا تم تحديد أوقات) ===
        if (hasTrimming && !isAudio) {
            task.message = 'جاري قص المقطع بسرعة فائقة... ✂️⚡';
            task.progress = 90;

            const trimmedFileName = `trimmed_${finalFileName}`;
            const trimmedFilePath = path.join(taskDir, trimmedFileName);

            const ffArgs = [];
            if (startTime) ffArgs.push('-ss', startTime);
            if (endTime) ffArgs.push('-to', endTime);
            ffArgs.push('-i', rawFilePath);
            // استخدام -preset veryfast و -threads 0 لاستغلال كل أنوية المعالج وتسريع القص بأقصى سرعة
            ffArgs.push(
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-threads', '0',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-y',
                trimmedFilePath
            );

            await new Promise((resolve, reject) => {
                const ffProc = spawn('ffmpeg', ffArgs, { windowsHide: true });
                let ffErr = '';
                ffProc.stderr.on('data', d => { ffErr += d.toString(); });
                ffProc.on('close', code => {
                    if (code === 0 && fs.existsSync(trimmedFilePath)) {
                        // حذف الملف الخام المؤقت
                        try { fs.unlinkSync(rawFilePath); } catch (e) {}
                        finalFilePath = trimmedFilePath;
                        finalFileName = finalFileName.replace(/\.[^/.]+$/, '') + '_trimmed.mp4';
                        resolve();
                    } else {
                        reject(new Error(ffErr || `فشل ffmpeg برمز ${code}`));
                    }
                });
                ffProc.on('error', err => reject(err));
            });
        } else {
            // إعادة تسمية الملف لإزالة بادئة raw_
            const cleanPath = path.join(taskDir, finalFileName);
            fs.renameSync(rawFilePath, cleanPath);
            finalFilePath = cleanPath;
        }

        // تحديث الحالة: تم بنجاح
        task.status = 'done';
        task.progress = 100;
        task.message = 'تم التحميل والمعالجة بنجاح! ✅';
        task.filePath = finalFilePath;
        task.fileName = finalFileName;

    } catch (err) {
        console.error('Download error:', err.message);

        let errorMsg = 'فشل في تحميل الفيديو';
        if (err.message.includes('Private') || err.message.includes('private')) {
            errorMsg = 'هذا الفيديو خاص ولا يمكن تحميله';
        } else if (err.message.includes('rate') || err.message.includes('429')) {
            errorMsg = 'تم تجاوز حد الطلبات. حاول مرة أخرى لاحقاً';
        } else if (err.message.includes('not exist') || err.message.includes('unavailable')) {
            errorMsg = 'الفيديو غير موجود أو تم حذفه';
        }

        task.status = 'error';
        task.progress = 0;
        task.message = errorMsg;
        task.error = errorMsg;
    }
}

// ===== تنظيف الملفات المؤقتة كل ساعة =====
setInterval(() => {
    try {
        const now = Date.now();
        if (!fs.existsSync(TEMP_DIR)) return;
        const dirs = fs.readdirSync(TEMP_DIR);
        dirs.forEach(dir => {
            const dirPath = path.join(TEMP_DIR, dir);
            try {
                const stat = fs.statSync(dirPath);
                if (now - stat.mtimeMs > 60 * 60 * 1000) {
                    fs.rmSync(dirPath, { recursive: true, force: true });
                    tasks.delete(dir);
                }
            } catch (e) { /* تجاهل */ }
        });
    } catch (e) { /* تجاهل */ }
}, 60 * 60 * 1000);

// ===== تشغيل السيرفر =====
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   🎬 أداة تنزيل الفيديوهات تعمل الآن     ║');
    console.log(`║   🌐 http://localhost:${PORT}               ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});
