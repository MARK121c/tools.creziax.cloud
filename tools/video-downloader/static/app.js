/**
 * ==============================================
 *  أداة تنزيل الفيديوهات - واجهة المستخدم
 *  Video Downloader - Frontend Logic
 * ==============================================
 */

// ===== حالة التطبيق =====
const API_BASE = (window.location.protocol.startsWith('http') && window.location.port !== '') ? '' : 'http://localhost:3000';
let currentPlatform = 'youtube';
let videoData = null;
let currentTaskId = null;
let pollInterval = null;

// ===== عناصر الصفحة =====
const $ = (id) => document.getElementById(id);

// ===== تبديل المنصة =====
function switchPlatform(platform) {
    currentPlatform = platform;
    videoData = null;
    currentTaskId = null;

    // تحديث التبويبات
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.platform === platform);
    });

    // تحديث placeholder
    const placeholders = {
        youtube: 'الصق رابط يوتيوب هنا... (مثال: https://youtube.com/watch?v=...)',
        tiktok: 'الصق رابط تيك توك هنا... (مثال: https://tiktok.com/@user/video/...)',
        instagram: 'الصق رابط إنستقرام هنا... (مثال: https://instagram.com/reel/...)'
    };
    $('urlInput').placeholder = placeholders[platform];

    // إخفاء بطاقة المعلومات
    $('videoInfoCard').classList.add('hidden');
    hideError();
    resetProgress();

    // مسح حقل الإدخال
    $('urlInput').value = '';
    $('urlInput').focus();
}

// ===== لصق الرابط من الحافظة =====
async function pasteUrl() {
    try {
        const text = await navigator.clipboard.readText();
        $('urlInput').value = text;
        $('urlInput').focus();
    } catch (err) {
        showError('لم نتمكن من الوصول للحافظة. الرجاء اللصق يدوياً (Ctrl+V)');
    }
}

// ===== جلب معلومات الفيديو =====
async function fetchInfo() {
    const url = $('urlInput').value.trim();

    if (!url) {
        showError('الرجاء إدخال رابط الفيديو أولاً');
        return;
    }

    // إظهار حالة التحميل
    setFetchLoading(true);
    hideError();
    $('videoInfoCard').classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, platform: currentPlatform })
        });

        const result = await response.json();

        if (!result.success) {
            showError(result.error || 'حدث خطأ غير متوقع');
            return;
        }

        videoData = result.data;
        displayVideoInfo(videoData);

    } catch (err) {
        showError('فشل الاتصال بالسيرفر. تأكد أن السيرفر يعمل.');
        console.error('Fetch error:', err);
    } finally {
        setFetchLoading(false);
    }
}

// ===== عرض معلومات الفيديو =====
function displayVideoInfo(data) {
    // المعلومات الأساسية
    $('videoThumb').src = data.thumbnail || '';
    $('videoThumb').onerror = function() { this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" fill="%23334155"><rect width="200" height="120"/><text x="100" y="65" text-anchor="middle" fill="%2394a3b8" font-size="14">لا توجد صورة</text></svg>'; };
    $('videoTitle').textContent = data.title;
    $('channelName').textContent = data.channel;
    $('videoDurationBadge').textContent = data.durationString || '';
    $('videoDurationBadge').classList.toggle('hidden', !data.durationString);

    // تعبئة قائمة الجودات
    const select = $('qualitySelect');
    select.innerHTML = '';
    if (data.formats && data.formats.length > 0) {
        data.formats.forEach(fmt => {
            const opt = document.createElement('option');
            opt.value = fmt.value;
            opt.textContent = fmt.label;
            select.appendChild(opt);
        });
    }

    // إظهار/إخفاء الأقسام حسب المنصة
    $('trimmerSection').classList.toggle('hidden', currentPlatform !== 'youtube');
    $('tiktokOptions').classList.toggle('hidden', currentPlatform !== 'tiktok');

    // Carousel (إنستقرام)
    if (data.isCarousel && data.carouselItems) {
        displayCarousel(data.carouselItems);
        $('carouselSection').classList.remove('hidden');
    } else {
        $('carouselSection').classList.add('hidden');
    }

    // إعادة ضبط حالة القص
    $('enableTrim').checked = false;
    $('trimInputs').classList.add('hidden');
    $('startTime').value = '';
    $('endTime').value = '';

    // إظهار البطاقة
    $('videoInfoCard').classList.remove('hidden');
    resetDownloadBtn();
    resetProgress();
    $('successMsg').classList.add('hidden');
}

// ===== عرض عناصر الكاروسيل =====
function displayCarousel(items) {
    const container = $('carouselItems');
    container.innerHTML = '';

    items.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'carousel-item selected';
        div.dataset.index = idx;
        div.onclick = () => toggleCarouselItem(div);

        div.innerHTML = `
            <img src="${item.thumbnail}" alt="${item.title}"
                class="w-full h-20 object-cover"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2280%22 fill=%22%23334155%22><rect width=%22100%22 height=%2280%22/><text x=%2250%22 y=%2244%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2211%22>${idx + 1}</text></svg>'">
            <div class="check-overlay">
                <span class="text-white text-xl">✓</span>
            </div>
            <div class="absolute bottom-0 inset-x-0 bg-black/60 text-center text-xs py-0.5 text-white">
                ${item.type === 'video' ? '🎬' : '🖼️'} ${idx + 1}
            </div>
        `;

        container.appendChild(div);
    });
}

function toggleCarouselItem(el) {
    el.classList.toggle('selected');
}

function selectAllCarousel() {
    document.querySelectorAll('.carousel-item').forEach(el => el.classList.add('selected'));
}

function deselectAllCarousel() {
    document.querySelectorAll('.carousel-item').forEach(el => el.classList.remove('selected'));
}

// ===== تبديل حقول القص =====
function toggleTrimInputs() {
    $('trimInputs').classList.toggle('hidden', !$('enableTrim').checked);
}

// ===== بدء التحميل =====
async function startDownload() {
    if (!videoData) {
        showError('الرجاء جلب معلومات الفيديو أولاً');
        return;
    }

    const url = $('urlInput').value.trim();
    const quality = $('qualitySelect').value;
    const isAudio = quality === 'audio';

    // جمع البيانات
    const payload = {
        url,
        platform: currentPlatform,
        quality,
        audioOnly: isAudio,
        startTime: null,
        endTime: null,
        noWatermark: true,
        carouselIndex: 'all'
    };

    // قص الفيديو
    if (currentPlatform === 'youtube' && $('enableTrim').checked) {
        const startTime = $('startTime').value.trim();
        const endTime = $('endTime').value.trim();

        if (!startTime && !endTime) {
            showError('الرجاء إدخال وقت البداية أو النهاية للقص');
            return;
        }

        // التحقق من صيغة الوقت
        const timeRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
        if (startTime && !timeRegex.test(startTime)) {
            showError('صيغة وقت البداية غير صحيحة. استخدم الصيغة HH:MM:SS أو MM:SS');
            return;
        }
        if (endTime && !timeRegex.test(endTime)) {
            showError('صيغة وقت النهاية غير صحيحة. استخدم الصيغة HH:MM:SS أو MM:SS');
            return;
        }

        payload.startTime = startTime || null;
        payload.endTime = endTime || null;
    }

    // تيك توك - علامة مائية
    if (currentPlatform === 'tiktok') {
        payload.noWatermark = $('noWatermark').checked;
    }

    // إنستقرام - كاروسيل
    if (currentPlatform === 'instagram' && videoData.isCarousel) {
        const selectedItems = document.querySelectorAll('.carousel-item.selected');
        if (selectedItems.length === 0) {
            showError('الرجاء اختيار عنصر واحد على الأقل للتحميل');
            return;
        }
        if (selectedItems.length === 1) {
            payload.carouselIndex = selectedItems[0].dataset.index;
        }
    }

    // إظهار حالة التحميل
    setDownloadLoading(true);
    hideError();
    $('successMsg').classList.add('hidden');
    showProgress(0, 'جاري التحضير...');

    try {
        const response = await fetch(`${API_BASE}/api/download/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!result.success) {
            showError(result.error || 'فشل في بدء التحميل');
            setDownloadLoading(false);
            return;
        }

        currentTaskId = result.taskId;
        pollProgress();

    } catch (err) {
        showError('فشل الاتصال بالسيرفر. تأكد أن السيرفر يعمل.');
        setDownloadLoading(false);
        console.error('Download error:', err);
    }
}

// ===== متابعة تقدم التحميل =====
function pollProgress() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        if (!currentTaskId) {
            clearInterval(pollInterval);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/status/${currentTaskId}`);
            const result = await response.json();

            if (!result.success) {
                clearInterval(pollInterval);
                showError(result.error || 'فشل في متابعة التحميل');
                setDownloadLoading(false);
                return;
            }

            // تحديث شريط التقدم
            showProgress(result.progress || 0, result.message || '');

            if (result.status === 'done') {
                clearInterval(pollInterval);
                showProgress(100, 'تم التحميل بنجاح! ✅');

                // تحميل الملف تلقائياً
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = `${API_BASE}/api/file/${currentTaskId}`;
                    link.download = result.fileName || 'download';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, 500);

                setDownloadLoading(false);
                $('successMsg').classList.remove('hidden');
            }

            if (result.status === 'error') {
                clearInterval(pollInterval);
                showError(result.error || result.message || 'حدث خطأ أثناء التحميل');
                setDownloadLoading(false);
                resetProgress();
            }

        } catch (err) {
            // تجاهل أخطاء الشبكة المؤقتة
            console.warn('Poll error:', err);
        }
    }, 800);
}

// ===== دوال مساعدة للواجهة =====

function setFetchLoading(loading) {
    $('fetchBtn').disabled = loading;
    $('fetchBtnText').classList.toggle('hidden', loading);
    $('fetchSpinner').classList.toggle('hidden', !loading);
}

function setDownloadLoading(loading) {
    $('downloadBtn').disabled = loading;
    $('downloadBtnIcon').classList.toggle('hidden', loading);
    $('downloadBtnText').textContent = loading ? 'جاري المعالجة...' : 'تحميل الفيديو';
    $('downloadSpinner').classList.toggle('hidden', !loading);
}

function resetDownloadBtn() {
    $('downloadBtn').disabled = false;
    $('downloadBtnIcon').classList.remove('hidden');
    $('downloadBtnText').textContent = 'تحميل الفيديو';
    $('downloadSpinner').classList.add('hidden');
}

function showError(msg) {
    $('errorText').textContent = msg;
    $('errorMsg').classList.remove('hidden');
}

function hideError() {
    $('errorMsg').classList.add('hidden');
}

function showProgress(percent, message) {
    $('progressSection').classList.remove('hidden');
    $('progressBar').style.width = `${percent}%`;
    $('progressText').textContent = message;
}

function resetProgress() {
    $('progressSection').classList.add('hidden');
    $('progressBar').style.width = '0%';
    $('progressText').textContent = '';
}

// ===== أحداث عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', () => {
    // ضبط المنصة الافتراضية
    switchPlatform('youtube');

    // إرسال بالضغط على Enter
    $('urlInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') fetchInfo();
    });

    // لصق تلقائي
    $('urlInput').addEventListener('focus', async () => {
        if ($('urlInput').value.trim() === '') {
            try {
                const text = await navigator.clipboard.readText();
                if (text && (text.includes('youtube.') || text.includes('youtu.be') ||
                    text.includes('tiktok.') || text.includes('instagram.'))) {
                    $('urlInput').value = text;
                }
            } catch (e) { /* الحافظة غير متاحة */ }
        }
    });
});
