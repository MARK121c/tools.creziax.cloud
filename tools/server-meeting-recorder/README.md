# 🎙️ Creziax Headless Server Meeting Recorder (24/7 Linux Daemon)

منظومة برمجية متكاملة ومصممة هندسياً للعمل على خوادم **Linux VPS (Ubuntu 20.04 / 22.04 / 24.04)** بدون شاشة حقيقية (Headless Mode) لتسجيل الاجتماعات الصوتية والمرئية آلياً (Google Meet, Microsoft Teams, Zoom Web, WebRTC) على مدار 24/7 عبر خادم خلفي، مع واجهة برمجية كاملة (FastAPI REST API)، وتحكم في الذاكرة ومراقبة السعة وحفظ الفيديوهات بصيغة MP4 H.264/AAC.

---

## 🏗️ البنية الهندسية للخدمة (Architecture Overview)

```
tools/server-meeting-recorder/
├── config.py                 # إدارة الإعدادات والبيئة (Pydantic Settings)
├── logger.py                 # تسجيل متقدم وتدوير السجلات (Rotating Logs 10MB)
├── models.py                 # مخططات البيانات والطلبات (Pydantic Schemas)
├── audio_display_manager.py  # إدارة الشاشة الافتراضية (Xvfb) والصوت الوهمي (PulseAudio)
├── recorder_engine.py        # محرك التسجيل المتقدم (FFmpeg Screen & Audio Muxer)
├── browser_engine.py         # بوت التصفح التلقائي والانضمام (Playwright Chromium)
├── storage.py                # إدارة الملفات ومسح التسجيلات القديمة تلقائياً (Retention Policy)
├── service.py                # منسق الجلسات المتعددة والمهام الخلفية (Lifecycle Orchestrator)
├── api.py                    # نقاط الـ REST API والتحكم والأمان (FastAPI)
├── main.py                   # نقطة تشغيل التطبيق (Uvicorn ASGI Server)
├── Dockerfile                # صورة الحاوية الإنتاجية خفيفة الوزن
├── docker-compose.yml        # تنسيق وتشغيل الحاوية والـ Volumes
├── deploy.sh                 # سكربت النشر الآلي بضغطة زر لخوادم Ubuntu
├── meeting-recorder.service  # ملف خدمة الـ Systemd للتشغيل على السيرفر كـ Daemon
└── requirements.txt          # مكتبات بايثون المطلوبة
```

---

## ⚡ طرق النشر على خادم VPS (Deployment Guide)

### الطريقة الأولى: النشر الآلي بضغطة زر (موصى بها) 🚀

على خادم الـ Ubuntu الخاص بك، ادخل على المجلد وشغل السكربت:
```bash
cd tools/server-meeting-recorder
chmod +x deploy.sh
sudo ./deploy.sh
```
يقوم السكربت تلقائياً بـ:
1. تحديث حزم أوبونتو وتثبيت الحزم الأساسية.
2. تثبيت Docker و Docker Compose إن لم تكن مثبتة.
3. إنشاء ملف `.env` آمن بمفتاح API سري.
4. بناء الحاوية وتشغيلها في الخلفية مع إعادة تشغيل تلقائية في حال التوقف.
5. التحقق من صحة الخدمة عبر Healthcheck.

---

### الطريقة الثانية: عبر Docker Compose يدوياً 🐳

1. نسخ ملف الإعدادات:
```bash
cp .env.example .env
```
2. بناء وتشغيل الحاوية:
```bash
docker compose up --build -d
```
3. التحقق من السجلات:
```bash
docker compose logs -f
```

---

### الطريقة الثالثة: التشغيل كخدمة Systemd مباشرة على السيرفر ⚙️

1. تثبيت الحزم على السيرفر:
```bash
sudo apt update && sudo apt install -y xvfb pulseaudio pulseaudio-utils ffmpeg python3-venv python3-pip
```
2. إنشاء بيئة بايثون وتثبيت المكتبات:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```
3. تثبيت وتشغيل الخدمة:
```bash
sudo cp meeting-recorder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now meeting-recorder
sudo systemctl status meeting-recorder
```

---

## 📡 واجهة الـ API والتحكم (REST API Endpoints)

تعمل الخدمة افتراضياً على المنفذ **`8080`**.
يمكنك زيارة التوثيق التفاعلي Swagger مباشرة عبر المتصفح:
`http://YOUR_SERVER_IP:8080/docs`

### 1. فحص صحة النظام (Health Check)
```bash
curl http://localhost:8080/health
```
**الرد:**
```json
{
  "status": "healthy",
  "uptime_seconds": 3600.5,
  "active_recordings_count": 1,
  "active_recordings": ["rec_a1b2c3d4e5f6"],
  "disk_usage_percent": 18.4,
  "xvfb_running": true,
  "pulseaudio_running": true,
  "version": "1.0.0"
}
```

### 2. بدء تسجيل اجتماع (Start Recording)
```bash
curl -X POST http://localhost:8080/api/recordings/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "meeting_url": "https://meet.google.com/abc-defg-hij",
    "title": "اجتماع فريق المبيعات الأسبوعي",
    "bot_name": "Creziax Sales Bot",
    "max_duration_minutes": 120,
    "fps": 30
  }'
```

### 3. إيقاف تسجيل جلسة وحفظ الفيديو (Stop Recording)
```bash
curl -X POST http://localhost:8080/api/recordings/rec_a1b2c3d4e5f6/stop \
  -H "X-API-Key: YOUR_API_KEY"
```

### 4. استعراض قائمة التسجيلات (List Recordings)
```bash
curl http://localhost:8080/api/recordings \
  -H "X-API-Key: YOUR_API_KEY"
```

### 5. تحميل فيديو الاجتماع (Download MP4)
```bash
curl -O http://localhost:8080/api/recordings/rec_a1b2c3d4e5f6/download
```

---

## 🛡️ ميزات الأمان وتدوير الذاكرة (Storage & Reliability)
- **تدوير السجلات (Log Rotation):** يتم حفظ السجلات في ملفات بحد أقصى 10MB مع 5 نسخ احتياطية لمنع امتلاء القرص.
- **سياسة مسح التسجيلات القديمة (Retention Policy):** حذف تلقائي للتسجيلات الأقدم من 30 يوماً (أو قابلة للتعديل عبر `RETENTION_DAYS`).
- **حماية مساحة القرص:** في حال تجاوز استهلاك القرص 90%، تقوم الخدمة بمسح أقدم التسجيلات فوراً لحماية السيرفر من الانهيار.
- **حفظ سليم للفيديو:** يقوم محرك FFmpeg بإرسال إشارة `SIGINT` وإغلاق الـ MP4 Moov Atom لضمان عدم تلف أي فيديو حتى لو تم الإيقاف المفاجئ.
