# 🚀 Automated AI Sales Agency & CRM System (نظام المبيعات والتسويق الذاتي)

نظام متكامل ومجاني التكلفة التشغيلية (Zero Cost) لإدارة عمليات استقطاب العملاء B2B والتسويق لوكالات الإنتاج الإعلامي وصناع المحتوى.

---

## 🌟 مميزات النظام المعمارية (Cost-Free Architecture)

- **Frontend & Backend:** Next.js 14 (App Router) + Tailwind CSS + Lucide Icons + TypeScript.
- **قاعدة البيانات (Database):** SQLite مدمجة ومجانية عبر **Prisma ORM** (لا تتطلب أي سيرفر خارجي مدفوع).
- **محرك الذكاء الاصطناعي (AI Engine):** **Google Gemini 1.5 Flash** عبر الفئة المجانية الرسمية (Free Tier).
- **محرك صيد القنوات (Scraper Engine):** **YouTube Data API v3** (10,000 وحدة مجانية يومياً تكفي لجلب آلاف القنوات).
- **محرك البريد (Mailing Engine):** **Nodemailer** مدمج ومتصل مباشرة بحساب بريد **Hostinger SMTP**.
- **إشعارات الاجتماعات الفورية:** Webhook مدمج لـ **Calendly / Cal.com** يولد ملف إحاطة استراتيجي ويرسله فوراً إلى **Telegram**.
- **النشر والاستضافة:** حاوية Docker جاهزة ومعدة بملف `docker-compose.yml` للنشر السريع على **Hostinger VPS**.

---

## 📁 هيكلية المشروع (Project Structure)

```text
├── app/
│   ├── api/
│   │   ├── analytics/          # إحصائيات لوحة التحكم ومعدل التحويل
│   │   ├── scraper/youtube/    # محرك جلب القنوات وفحص الإيميلات
│   │   ├── ai/generate-pitch/  # توليد العروض الترويجية المخصصة عبر Gemini
│   │   ├── ai/batch-generate/  # توليد العروض الجماعي
│   │   ├── email/send/         # إرسال البريد عبر Nodemailer + SMTP
│   │   ├── email/batch-send/   # إرسال الحملات البريدية مع حماية Spam
│   │   ├── leads/              # إدارة العملاء ومسار المبيعات
│   │   ├── webhooks/calendly/  # استلام حجوزات الاجتماعات وتنبيه تليجرام
│   │   ├── briefs/             # ملفات الإحاطة الاستراتيجية للاجتماعات
│   │   └── settings/           # إعدادات النظام وفحص الاتصال
│   ├── scraper/                # صفحة صائد عملاء يوتيوب
│   ├── crm/                    # صفحة جدول الـ CRM التفاعلي
│   ├── pitches/                # استوديو صياغة واختبار عروض AI
│   ├── meetings/               # صفحة الاجتماعات وملفات الإحاطة
│   ├── settings/               # صفحة إدارة المفاتيح والربط
│   ├── globals.css             # التنسيقات العامة والخطوط العربية
│   └── page.tsx                # لوحة التحكم والمؤشرات الرئيسية
├── components/                 # مكونات الواجهة (Modal, Badges, Sidebar, Navbar)
├── lib/                        # المحركات البرمجية (Gemini, YouTube, Mailer, Prisma)
├── prisma/
│   ├── schema.prisma           # مخطط قاعدة بيانات SQLite
│   └── seed.js                 # بذر البيانات التجريبية والإعدادات الأولية
├── Dockerfile                  # ملف البناء الإنتاجي للحاوية
├── docker-compose.yml          # تشغيل النظام بأمر واحد مع تخزين دائم
└── .env.example                # نموذج المتغيرات البيئية
```

---

## 🔑 كيفية الحصول على المفاتيح المجانية (Free API Keys)

### 1. مفتاح Google Gemini API المجاني:
1. ادخل إلى [Google AI Studio](https://aistudio.google.com/app/apikey).
2. أنشئ مفتاح جديد مجاناً (Free Tier API Key).
3. ضعه في صفحة الإعدادات أو ملف `.env` تحت `GEMINI_API_KEY`.

### 2. مفتاح YouTube Data API v3:
1. ادخل إلى [Google Cloud Console](https://console.cloud.google.com/).
2. أنشئ مشروعاً جديداً وقم بتفعيل **YouTube Data API v3**.
3. توجّه إلى **Credentials** وأنشئ **API Key**.

### 3. بريد Hostinger SMTP:
1. من لوحة تحكم Hostinger (hPanel)، افتح قسم **Emails**.
2. أنشئ بريداً جديداً (مثل `outreach@yourdomain.com`).
3. استخدم الإعدادات التالية:
   - **Host:** `smtp.hostinger.com`
   - **Port:** `465` (SSL)
   - **User:** بريدك الإلكتروني
   - **Pass:** كلمة مرور البريد

---

## 🛠️ التشغيل المحلي (Local Development)

```bash
# 1. تثبيت الحزم
npm install

# 2. إعداد قاعدة بيانات SQLite
npx prisma generate
npx prisma db push
node prisma/seed.js

# 3. تشغيل خادم التطوير
npm run dev
```

افتح المتصفح على: `http://localhost:3000`

---

## 🚢 خطوات النشر على سيرفر Hostinger VPS عبر Docker

### الخطوة 1: تجهيز السيرفر
ادخل عبر SSH إلى سيرفر Hostinger الخاص بك وتأكد من تثبيت Docker و Docker Compose:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose git
```

### الخطوة 2: رفع المشروع
انسخ ملفات المشروع إلى السيرفر في مسار `/var/www/ai-sales-crm`:

```bash
cd /var/www/ai-sales-crm
cp .env.example .env
nano .env # ضع مفاتيحك وبيانات SMTP
```

### الخطوة 3: تشغيل النظام بحاوية Docker
```bash
docker-compose up -d --build
```

سيعمل النظام فوراً على المنفذ `3000` مع قاعدة بيانات SQLite محفوظة بشكل دائم في Volume مستقل.

### الخطوة 4: ربط الدومين مع شهادة SSL مجانية (Nginx + Certbot)
أنشئ ملف إعداد Nginx:
```bash
sudo nano /etc/nginx/sites-available/crm.yourdomain.com
```

أضف الإعداد التالي:
```nginx
server {
    server_name crm.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

قم بتفعيل الموقع وتثبيت شهادة SSL مجانية من Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/crm.yourdomain.com /etc/nginx/sites-enabled/
sudo systemctl reload nginx
sudo certbot --nginx -d crm.yourdomain.com
```

---

## 📅 ربط Webhook لحجوزات Calendly أو Cal.com

1. توجّه إلى لوحة تحكم Calendly أو Cal.com -> **Integrations** -> **Webhooks**.
2. أضف رابط الويب هوك الخاص بنظامك:
   `https://crm.yourdomain.com/api/webhooks/calendly`
3. اختر الاشتراك في حدث `Invitee Created` أو `Booking Created`.
4. فور حجز أي عميل لمكالمة، سيقوم النظام تلقائياً بـ:
   - تحديث حالة العميل إلى `meeting_booked`.
   - توليد ملف إحاطة استراتيجي بالذكاء الاصطناعي.
   - إرسال تنبيه فوري إلى قناة/بوت تليجرام الخاص بك.
