import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSetting } from './settings';

export interface GeneratePitchInput {
  channelName: string;
  description?: string | null;
  recentVideos?: string[] | null;
  subscriberCount?: number;
  niche?: string | null;
  customInstructions?: string;
}

export interface GeneratedPitchResult {
  subject: string;
  body: string;
  personalizedStrategy: string;
}

export async function generateAIPitch(input: GeneratePitchInput): Promise<GeneratedPitchResult> {
  const apiKey = await getSetting('gemini_api_key');
  const bookingLink = await getSetting('booking_link', 'https://calendly.com/your-agency/15min');
  const agencyName = await getSetting('agency_name', 'Apex Media & Growth Studio');
  const promptTemplate = await getSetting('ai_pitch_prompt_template');

  const recentVideosText = input.recentVideos && input.recentVideos.length > 0 
    ? input.recentVideos.join(' | ') 
    : 'فيديوهات عامة في المجال';

  const defaultPrompt = `أنت خبير مبيعات B2B واستراتيجي محتوى محترف لوكالة الإنتاج الإعلامي "${agencyName}".
المهمة: كتابة بريد إلكتروني ترويجي بارد (Cold Outreach Pitch) فائق التخصيص والاحترافية باللغة العربية موجه لصاحب القناة التالي:

بيانات القناة:
- اسم القناة: ${input.channelName}
- المجال/النيش: ${input.niche || 'صناعة المحتوى'}
- وصف القناة: ${input.description || 'صانع محتوى متميز'}
- أحدث عناوين الفيديوهات: ${recentVideosText}
- عدد المشتركين: ${input.subscriberCount ? input.subscriberCount.toLocaleString() : 'غير محدد'}

تعليمات إضافية: ${input.customInstructions || 'ركز على تحسين المونتاج الديناميكي، رفع متوسط المشاهدة وتصميم صور مصغرة ذات CTR مرتفع'}

المطلوب بدقة:
1. صياغة بريد عربي احترافي غير متطفل (Non-spammy) يبدأ بإشادة حقيقية بآخر أعماله.
2. توضيح فرصة نمو حقيقية ملموسة لقناته.
3. تقديم عرض قيمة لا يقاوم (مثل عينة مونتاج تجريبية مجانية لآخر فيديو).
4. إضافة رابط الحجز المباشر التالي: ${bookingLink}
5. الرد يجب أن يكون حصراً بصيغة JSON صالحة بالشكل التالي:
{
  "subject": "عنوان مشوق ومخصص للبريد",
  "body": "نص البريد الكامل ومنسق بأسلوب مهني",
  "personalizedStrategy": "ملخص سريع للاستراتيجية المقترحة لهذا العميل ليرشد الفريق الداخلي"
}`;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      const response = await model.generateContent(defaultPrompt);
      const text = response.response.text();
      
      const parsed = JSON.parse(text);
      if (parsed.subject && parsed.body) {
        return {
          subject: parsed.subject,
          body: parsed.body,
          personalizedStrategy: parsed.personalizedStrategy || 'استراتيجية مخصصة لرفع التفاعل وجودة الإنتاج',
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed or rate limited, falling back to smart dynamic template engine:', err);
    }
  }

  // Smart dynamic template engine (Zero-failure fallback when key is not provided yet or quota hit)
  const firstVideo = input.recentVideos && input.recentVideos[0] ? `"${input.recentVideos[0]}"` : 'مقاطعك الأخيرة';
  
  return {
    subject: `فرصة حصرية لتطوير الهوية البصرية لقناة ${input.channelName} 🚀`,
    body: `مرحباً أستاذي العزيز،\n\nأتابع باهتمام كبير المحتوى المتميز والمجهود الرائع الذي تقدمه في قناة "${input.channelName}"، وتحديداً الفيديو المميز عن ${firstVideo}، والذي احتوى على نقاط قيّمة ومفيدة جداً للمتابعين.\n\nنحن في "${agencyName}" متخصصون في صناعة الفيديو السينمائي وتكبير القنوات عبر رفع معدل النقر (CTR) وزيادة وقت الاحتفاظ بالمشاهد (Audience Retention).\n\nبعد مراجعة سريعة لقناتك، حددنا 3 نقاط رئيسية يمكن عبرها مضاعفة سرعة نمو القناة والوصول لجمهور أوسع عبر هوية بصرية مخصصة ومونتاج تفاعلي حديث.\n\nيسرنا أن نقدم لك (عينة مونتاج مجانية بالكامل) لأحد فيديوهاتك القادمة لترى الفارق بنفسك وبدون أي التزام مالي.\n\nإذا كنت ترغب بالاطلاع على التفاصيل، يسعدني دعوتك لمكالمة استكشافية سريعة لمدة 10 دقائق عبر الرابط التالي:\n🔗 ${bookingLink}\n\nأتمنى لك دوام التوفيق والنجاح،\nفريق النمو والشراكات | ${agencyName}`,
    personalizedStrategy: `تقديم عينة مونتاج مجانية لفيديو من فئة ${input.niche || 'المحتوى العام'} والتركيز على تحسين الـ Hook في أول 15 ثانية وتصميم صورة مصغرة احترافية لرفع نسبة النقر للظهور.`,
  };
}

export async function generateMeetingBriefing(leadInfo: {
  channelName: string;
  niche?: string | null;
  subscriberCount?: number;
  description?: string | null;
  pitchSent?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
}): Promise<{
  briefingText: string;
  recommendedPrice: string;
  strategyNotes: string;
}> {
  const apiKey = await getSetting('gemini_api_key');
  const agencyName = await getSetting('agency_name', 'Apex Media');

  const prompt = `أنت كبير مستشاري المبيعات في وكالة الإنتاج الإعلامي "${agencyName}". تم حجز اجتماع استكشافي مع عميل محتمل.
المهمة: إعداد ملف إحاطة استراتيجي موجز (Meeting Intelligence Brief) لممثل المبيعات قبل دخول المكالمة.

بيانات العميل:
- اسم القناة/العميل: ${leadInfo.guestName || leadInfo.channelName}
- البريد الإلكتروني: ${leadInfo.guestEmail || 'غير متوفر'}
- النيش والتخصص: ${leadInfo.niche || 'صناعة محتوى'}
- عدد المشتركين: ${leadInfo.subscriberCount || 0}
- وصف القناة: ${leadInfo.description || ''}
- العرض المرسل مسبقاً: ${leadInfo.pitchSent || 'عرض تعريفي عام'}

المطلوب بدقة: إرجاع JSON صالح بالتنسيق التالي:
{
  "briefingText": "ملخص تنفيذي لنقاط القوة والضعف في القناة، ونقاط الحديث المقترحة خلال المكالمة",
  "recommendedPrice": "نطاق السعر المقترح للحزمة الشهرية (مثلاً: 800$ - 1500$ شهرياً / 4 فيديوهات سينمائية + شورتس)",
  "strategyNotes": "أهم 3 أسرار لإغلاق الصفقة (Deal Closing Triggers) مع هذا العميل بالتحديد"
}`;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const res = await model.generateContent(prompt);
      const parsed = JSON.parse(res.response.text());
      return {
        briefingText: parsed.briefingText,
        recommendedPrice: parsed.recommendedPrice || '$750 - $1,500 / شهرياً',
        strategyNotes: parsed.strategyNotes || 'التركيز على توفير وقته وضمان عائد مشاهدات أعلى',
      };
    } catch (e) {
      console.warn('Gemini briefing generation fallback:', e);
    }
  }

  return {
    briefingText: `ملف إحاطة للعميل (${leadInfo.channelName}):\n- مجال المحتوى: ${leadInfo.niche || 'عام'}\n- عدد المشتركين الحالي: ${(leadInfo.subscriberCount || 0).toLocaleString()}\n- هدف المكالمة: استعراض عينة المونتاج التجريبية وتوضيح كيف سيساهم المونتاج السريع وتصاميم الصور المصغرة في رفع الـ CTR بنسبة 30% على الأقل.\n- أسئلة مقترحة للاجتماع: ما هو أكبر تحدٍ يواجهك حالياً في جدول النشر الأسبوعي؟`,
    recommendedPrice: '$600 - $1,200 / شهرياً (حزمة 4-8 فيديوهات طويلة + مقاطع Shorts مجانية)',
    strategyNotes: 'ابدأ بعرض تحليل بصري لقناته مقارنة بأكبر المنافسين، وركز على أن الوكالة تتكفل بكل العمليات الفنية من الألف إلى الياء.',
  };
}
