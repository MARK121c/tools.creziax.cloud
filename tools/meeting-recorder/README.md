# 🎙️ Stealth Meeting Recorder Pro (Windows Desktop)

مسجل اجتماعات سطح مكتب احترافي وخفيف ومصمم خصيصاً لنظام **Windows** لتسجيل الاجتماعات والمكالمات (**Zoom, Microsoft Teams, Google Meet, Webex**) بدون استهلاك موارد الجهاز وبدون اكتشاف برامج الاجتماعات لعملية التسجيل (Stealth Recording).

---

## 🌟 الميزات المعمارية الرئيسية

1. **Floating Draggable Widget (PyQt6):**
   - ويدجت عائم داكن وخفيف على شاشة سطح المكتب، يدعم الشفافية والبقاء دائماً في المقدمة (`Always on Top`).
   - تحكم كامل بالماوس (سحب وإفلات في أي مكان على الشاشة).
   - زر التسجيل 🔴، زر الإيقاف المؤقت/الاستئناف ⏸️، وزر الحفظ ⏹️.
   - مؤقت زمني دقيق في الوقت الفعلي (`HH:MM:SS`).
   - **Stealth Protection:** استبعاد الويدجت تلقائياً من تسجيل الشاشة عبر واجهة Windows API الرسمية (`SetWindowDisplayAffinity - WDA_EXCLUDEFROMCAPTURE`) حتى لا يظهر الويدجت في الفيديو المسجل أو في شاشات المشاركة!

2. **Dual-Channel High-Fidelity Audio Capture (SoundCard Loopback):**
   - **صوت النظام (Loopback WASAPI):** التقاط صوت المتحدثين الآخرين في الاجتماع مباشرة من كارت الصوت دون الحاجة لأي كابلات صوت وهمية.
   - **صوت الميكروفون:** تسجيل صوتك الشخصي بالتوازي بدقة عالية.
   - دمج القناتين في الوقت الفعلي مع ميزة **Auto-Gain Control (AGC)** وضاغط صوتي لمنع الصدى والتداخل وتشويه الصوت (Clipping).

3. **High-Performance Screen Grabber (mss + OpenCV):**
   - التقاط الشاشة بمعدل 30 إطار/ثانية أو 60 إطار/ثانية مع استهلاك ضئيل جداً للذاكرة والمعالج.
   - دعم تسجيل كامل الشاشة الرئيسية أو تحديد نافذة/منطقة مخصصة بالسحب والإفلات.

4. **Hardware-Accelerated Muxing (FFmpeg + NVENC):**
   - تسريع عتادي بواسطة كروت شاشة NVIDIA (`h264_nvenc`) مع الرجوع التلقائي للمعالج (`libx264`).
   - مزامنة دقيقة جداً بين الصوت والصورة (`Audio-Video Sync`).
   - حفظ تلقائي في مجلد `./Recordings/Meeting_YYYY-MM-DD_HH-MM-SS.mp4`.
   - إشعار نظام ويندوز في صينية النظام (System Tray) عند اكتمال الحفظ.

---

## 🚀 متطلبات التثبيت والتشغيل (Setup Guide)

### 1. متطلبات النظام:
- نظام **Windows 10 / 11** (64-bit).
- تثبيت **Python 3.10** أو أحدث (تأكد من تفعيل خيار `Add Python to PATH` أثناء التثبيت).

---

### 2. تثبيت الحزم والمكتبات (pip install):

افتح سطر الأوامر (Command Prompt أو PowerShell) داخل مجلد الأداة ونفّذ:

```bash
# إنشاء بيئة افتراضية (موصى به)
python -m venv venv

# تفعيل البيئة في ويندوز
venv\Scripts\activate

# تثبيت جميع المكتبات المطلوبة
pip install -r requirements.txt
```

أو بتنفيذ أمر التثبيت اليدوي المباشر:
```bash
pip install PyQt6 mss opencv-python soundcard numpy scipy ffmpeg-python
```

---

### 3. تثبيت وضبط FFmpeg على Windows:

يتطلب دمج الفيديو والصوت محرك **FFmpeg**. لتثبيته وضبطه في الـ PATH:

#### الطريقة الأولى (الأسهل عبر winget):
افتح `PowerShell` ونفّذ الأمر التالي:
```powershell
winget install Gyan.FFmpeg
```

#### الطريقة الثانية (عبر Chocolatey):
```powershell
choco install ffmpeg
```

#### الطريقة الثالثة (التثبيت اليدوي):
1. حمّل ملف FFmpeg المضغوط (Release Essentials) من الموقع الرسمي:
   👉 [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
2. فك الضغط وانقل المجلد إلى `C:\ffmpeg`.
3. افتح البحث في ويندوز واكتب: **Edit the system environment variables** (تعديل متغيرات بيئة النظام).
4. اضغط على **Environment Variables...**، ثم في قسم `System variables` اختر **Path** واضغط **Edit**.
5. اضغط **New** وأضف المسار: `C:\ffmpeg\bin`.
6. اضغط **OK** وأعد تشغيل الـ Terminal.
7. تأكد من عمله بكتابة: `ffmpeg -version`.

---

## 🎮 تشغيل الأداة:

- **بنقرة واحدة:** اضغط مرتين على ملف `run.bat`.
- **أو عبر سطر الأوامر:**
```bash
python main.py
```

---

## 📁 هيكلية ملفات الأداة (Code Architecture)

```text
tools/meeting-recorder/
├── main.py              # نقطة البداية وإدارة التطبيق والـ Tray Icon
├── gui.py               # نافذة التحكم العائمة (Floating Widget) ومحدد المنطقة
├── audio_engine.py      # محرك الصوت الثنائي (WASAPI Loopback + Mic)
├── video_engine.py      # محرك التقاط الشاشة السريع عبر mss
├── muxer.py             # محرك الدمج والحفظ النهائي عبر FFmpeg
├── config.py            # ملف الإعدادات وإخفاء النافذة عن التسجيل
├── requirements.txt     # مكتبات بايثون المطلوبة
├── run.bat              # سكربت تشغيل مباشر لنظام ويندوز
└── Recordings/          # المجلد التلقائي لحفظ الاجتماعات
```
