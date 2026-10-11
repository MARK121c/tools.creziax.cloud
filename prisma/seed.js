const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial configuration and sample leads...');

  const defaultSettings = [
    {
      key: 'agency_name',
      value: 'Apex Media & Growth Studio',
      description: 'اسم وكالة الإنتاج وصناعة المحتوى',
    },
    {
      key: 'agency_tagline',
      value: 'وكالة إنتاج إعلامي متخصصة في صناعة الفيديوهات الاحترافية وتكبير القنوات',
      description: 'وصف وهوية الوكالة',
    },
    {
      key: 'booking_link',
      value: 'https://calendly.com/your-agency/15min',
      description: 'رابط حجز موعد مكالمة الاستكشاف',
    },
    {
      key: 'gemini_api_key',
      value: process.env.GEMINI_API_KEY || '',
      description: 'مفتاح Google Gemini API المجاني',
    },
    {
      key: 'youtube_api_key',
      value: process.env.YOUTUBE_API_KEY || '',
      description: 'مفتاح YouTube Data API v3 المجاني',
    },
    {
      key: 'smtp_host',
      value: process.env.SMTP_HOST || 'smtp.hostinger.com',
      description: 'خادم البريد SMTP',
    },
    {
      key: 'smtp_port',
      value: process.env.SMTP_PORT || '465',
      description: 'منفذ خادم البريد SMTP (465 SSL أو 587 TLS)',
    },
    {
      key: 'smtp_user',
      value: process.env.SMTP_USER || '',
      description: 'بريد الإرسال الرسمي',
    },
    {
      key: 'smtp_pass',
      value: process.env.SMTP_PASS || '',
      description: 'كلمة مرور بريد الإرسال',
    },
    {
      key: 'smtp_sender_name',
      value: 'فريق المبيعات والشراكات | Apex Media',
      description: 'اسم المرسل الظاهر في البريد',
    },
    {
      key: 'telegram_bot_token',
      value: process.env.TELEGRAM_BOT_TOKEN || '',
      description: 'توكن بوت تليجرام للتنبيهات الفورية',
    },
    {
      key: 'telegram_chat_id',
      value: process.env.TELEGRAM_CHAT_ID || '',
      description: 'معرف الشات / القناة على تليجرام',
    },
    {
      key: 'ai_pitch_prompt_template',
      value: `أنت خبير إغلاق مبيعات B2B واستراتيجي محتوى لوكالة إنتاج إعلامي رائدة متخصصة في (المونتاج السينمائي، تصاميم الصور المصغرة ذات الـ CTR المرتفع، وخطط تنمية القنوات).
المهمة: كتابة بريد إلكتروني ترويجي بارد (Cold Outreach Pitch) فائق التخصيص والاحترافية باللغة العربية موجه لصاحب القناة التالي:

بيانات القناة:
- اسم القناة: {channelName}
- وصف القناة ومجالها: {description}
- أحدث مواضيع الفيديوهات: {recentVideos}
- عدد المشتركين: {subscriberCount}

شروط البريد المقترح:
1. البداية: تحية راقية مع إشادة حقيقية بآخر فيديو أو أسلوب القناة الفريد لتوضيح أننا تابعنا عمله بجدية.
2. الثغرة / فرصة النمو: تحديد نقطة محددة يمكن تطويرها (مثل سرعة المونتاج، الـ Hook في أول 30 ثانية، أو أسلوب الـ Thumbnails لرفع الـ CTR).
3. عرض القيمة (Value Proposition): شرح كيف يمكننا توفير وقته ومضاعفة مشاهداته باحترافية وبدون أي مجهود منه.
4. الدعوة للإجراء (CTA): دعوة قصيرة وودية لمكالمة استكشافية سريعة 15 دقيقة، وتضمين رابط الحجز التالي بشكل جذاب: {bookingLink}
5. النبرة: احترافية، راقية، غير متطفلة (Non-spammy)، باللغة العربية الفصحى المبسطة أو اللهجة البيضاء المعاصرة.

المطلوب إرجاع الناتج بصيغة JSON بالتنسيق التالي:
{
  "subject": "عنوان جذاب ومشوق للبريد",
  "body": "نص البريد الكامل ومنسق بفقرات واضحة",
  "personalizedStrategy": "ملاحظة سريعة للفريق الداخلي عن الاستراتيجية المقترحة لهذا العميل"
}`,
      description: 'قالب برومبت الذكاء الاصطناعي لتوليد العروض المخصصة',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { description: setting.description },
      create: setting,
    });
  }

  // Check if sample leads already exist
  const count = await prisma.lead.count();
  if (count === 0) {
    console.log('Adding demo qualified leads...');
    const demoLeads = [
      {
        channelId: 'UC_demo_tech_arabic_1',
        channelName: 'عالم التقنية والذكاء الاصطناعي',
        channelUrl: 'https://youtube.com/@tech_arabic_demo',
        avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        email: 'creator.tech@example.com',
        subscriberCount: 84500,
        videoCount: 142,
        viewCount: '4,200,000',
        description: 'قناة متخصصة في شرح أحدث أدوات الذكاء الاصطناعي والبرمجة والتقنيات الحديثة لصناع المحتوى والشركات.',
        recentVideos: JSON.stringify([
          'أفضل 5 أدوات ذكاء اصطناعي لعام 2026',
          'كيف تبني مشروعك الرقمي بالكامل بدون كتابة كود',
          'مراجعة شاملة لتحديثات البرمجة التوليدية'
        ]),
        niche: 'التقنية والذكاء الاصطناعي',
        status: 'pitch_ready',
        score: 92,
        notes: 'محتوى ممتاز وجودة الصوت عالية، يحتاج تحسين الـ Thumbnails والمونتاج السريع للـ Shorts.',
      },
      {
        channelId: 'UC_demo_business_arabic_2',
        channelName: 'رواد الأعمال والمال | بزنس برو',
        channelUrl: 'https://youtube.com/@business_pro_demo',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        email: 'contact@businesspro-arabic.com',
        subscriberCount: 128000,
        videoCount: 210,
        viewCount: '9,800,000',
        description: 'بودكاست وفيديوهات أسبوعية تناقش ريادة الأعمال والاستثمار وأسرار النجاح المالي للشباب.',
        recentVideos: JSON.stringify([
          'بودكاست: كيف تبدأ وكالة تسويق رقمي من الصفر',
          'أهم أسرار الاستثمار للمبتدئين في 2026',
          'مقابلة خاصة مع رائد أعمال حقق المليون الأول'
        ]),
        niche: 'بزنس وريادة أعمال',
        status: 'email_sent',
        score: 95,
        notes: 'تم إرسال العرض المخصص، العميل مناسب جداً لحزمة البودكاست الشاملة.',
      },
      {
        channelId: 'UC_demo_fitness_arabic_3',
        channelName: 'كوتش أحمد | فورمة وتغذية',
        channelUrl: 'https://youtube.com/@fitness_coach_demo',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        email: 'coach.ahmed@example.com',
        subscriberCount: 45000,
        videoCount: 95,
        viewCount: '2,100,000',
        description: 'تمارين رياضية منزلية، برامج غذائية، وتحفيز يومي لحياة صحية أفضل بدون حرمان.',
        recentVideos: JSON.stringify([
          'تحدي حرق الدهون في 15 دقيقة يومياً',
          'وجبات صحية وسريعة بأقل تكلفة للرياضيين',
          'أخطاء شائعة في الجيم توقف بناء العضلات'
        ]),
        niche: 'فيتنس وصحة',
        status: 'lead_captured',
        score: 85,
        notes: 'قناة نامية بمعدل تفاعل مرتفع، جاهز لتوليد العرض الترويجي.',
      }
    ];

    for (const lead of demoLeads) {
      const createdLead = await prisma.lead.create({
        data: lead,
      });

      if (lead.status === 'pitch_ready' || lead.status === 'email_sent') {
        const pitch = await prisma.pitch.create({
          data: {
            leadId: createdLead.id,
            subject: `فرصة تطوير بصرية لقناة ${lead.channelName} 🚀`,
            body: `مرحباً أستاذي العزيز،\n\nأتابع محتواك المميز على قناة "${lead.channelName}" بشغف، لا سيما الفيديو الأخير عن "${JSON.parse(lead.recentVideos)[0]}"، وشدني جداً عمق الطرح وقيمة المعلومات المقدمة.\n\nكفريق إنتاج إعلامي متخصص في نمو قنوات يوتيوب، لاحظنا فرصة ذهبية لمضاعفة نسبة النقر للظهور (CTR) عبر هوية بصرية مخصصة للـ Thumbnails، بالإضافة إلى مونتاج سينمائي تفاعلي يزيد من متوسط مدة المشاهدة (Retention Rate).\n\nيسعدنا أن نقدم لك عينة مونتاج مجانية لأحد مقاطعك القادمة لنبرهن لك جودة العمل عملياً.\n\nهل يناسبك موعد سريع لمدة 10 دقائق هذا الأسبوع لاستعراض الأفكار؟\nرابط حجز الموعد المباشر:\nhttps://calendly.com/your-agency/15min\n\nتحياتي وتقديري،\nفريق Apex Media`,
            personalizedStrategy: 'التركيز على عينات مونتاج مجانية وتحسين الـ Thumbnails لرفع المشاهدات بنسبة 35%',
            status: lead.status === 'email_sent' ? 'sent' : 'approved',
            sentAt: lead.status === 'email_sent' ? new Date() : null,
          }
        });

        if (lead.status === 'email_sent') {
          await prisma.outreachLog.create({
            data: {
              leadId: createdLead.id,
              pitchId: pitch.id,
              status: 'sent',
              sentAt: new Date(),
            }
          });
        }
      }
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
