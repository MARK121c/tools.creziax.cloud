import { prisma } from './prisma';
import { YouTubeScrapeResult } from '@/types';
import { getYoutubeApiKeys } from './token-pool';

const EMAIL_REGEX = /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi;

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  Instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9_.-]+/gi,
  TikTok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.-]+/gi,
  Twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_.-]+/gi,
  LinkedIn: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_.-]+/gi,
  Telegram: /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_.-]+/gi,
};

export interface ScrapeStats {
  totalChecked: number;
  qualified: number;
  skippedLowSubscribers: number;
  skippedFaceless: number;
  skippedNonArabic: number;
  keysInPool?: number;
}

// Comprehensive list of common Arabic real human first names (Male & Female)
const ARABIC_FIRST_NAMES = new Set([
  // أسماء ذكور شائعة
  'محمد', 'محمود', 'احمد', 'أحمد', 'إبراهيم', 'ابراهيم', 'علي', 'مصطفى', 'مصطفي', 'عمر', 'عمرو', 'يوسف',
  'خالد', 'طارق', 'حسن', 'حسين', 'عبدالله', 'عبدالرحمن', 'عبدالعزيز', 'عبد', 'كريم', 'شريف', 'وليد',
  'ماجد', 'هاني', 'حسام', 'تامر', 'وائل', 'رامي', 'سامح', 'باسل', 'زياد', 'حمزة', 'بلال', 'أنس', 'انس',
  'أسامة', 'اسامة', 'عمار', 'معاذ', 'إسلام', 'اسلام', 'هشام', 'أشرف', 'اشرف', 'مجدي', 'سعيد', 'سمير',
  'نبيل', 'فادي', 'شادي', 'علاء', 'ضياء', 'بهاء', 'مازن', 'مروان', 'سيف', 'فهد', 'سعود', 'نايف', 'راكان',
  'سلطان', 'تركي', 'فيصل', 'بندر', 'مشعل', 'بدر', 'سلمان', 'حاتم', 'هيثم', 'ريان', 'غيث', 'جمال', 'كمال',
  'عادل', 'عاطف', 'سامي', 'جاد', 'صهيب', 'قتيبة', 'حازم', 'جهاد', 'عصام', 'عماد', 'رأفت', 'مدحت', 'ممدوح',
  'أيمن', 'ايمن', 'أمير', 'امير', 'ياسر', 'ياسين', 'يحيى', 'يحيي', 'زكريا', 'فارس', 'ناصر', 'منصور',
  'حميد', 'عثمان', 'شوقي', 'صبري', 'فتحي', 'فوزي', 'صبحي', 'صلاح', 'طه', 'وجدي', 'نشأت', 'نديم', 'عزيز',
  'توفيق', 'رضوان', 'مختار', 'سليمان', 'داود', 'داوود', 'يعقوب', 'إسماعيل', 'اسماعيل', 'صالح', 'موسى', 'موسي',
  'عيسى', 'عيسي', 'هارون', 'إدريس', 'ادريس', 'يونس', 'أيوب', 'ايوب', 'شعيب', 'زبير', 'سعد', 'سعيد',
  'حذيفة', 'بلال', 'معاوية', 'يزيد', 'جعفر', 'حميدو', 'ميدو', 'بودي',
  // أسماء إناث شائعة
  'سارة', 'ساره', 'مريم', 'نورهان', 'فاطمة', 'فاطمه', 'ياسمين', 'هبة', 'هبه', 'منى', 'مني', 'آية', 'ايه',
  'رنا', 'داليا', 'ندى', 'ندي', 'نور', 'فرح', 'هنا', 'مروة', 'مروه', 'رضوى', 'رضوي', 'دينا', 'إيناس', 'ايناس',
  'أميرة', 'اميره', 'ريهام', 'هاجر', 'إسراء', 'اسراء', 'أسماء', 'اسماء', 'أروى', 'اروي', 'لبنى', 'لبني', 'لمياء',
  'شروق', 'شهد', 'تسنيم', 'خديجة', 'خديجه', 'عائشة', 'عائشه', 'زينب', 'سلمى', 'سلمي', 'ليلى', 'ليلي', 'ريم',
  'رزان', 'جود', 'لجين', 'لين', 'لانا', 'رغد', 'شذى', 'شذي', 'حنان', 'منال', 'سهام', 'إلهام', 'الهام', 'هدى', 'هدي',
  'وفاء', 'دعاء', 'شيماء', 'شروق', 'عبير', 'نرمين', 'مي', 'ميس', 'يارا', 'روان', 'ريناد', 'تالا', 'مايا'
]);

// Personal honorific titles indicating a real human creator
const PERSONAL_HONORIFICS = /^(?:دكتور|دكتورة|د\.|د\s|مهندس|مهندسة|م\.|م\s|كابتن|شيف|مستر|مس|مسز|كوتش|أستاذ|أستاذة|أ\.|أ\s|الشيخ|المحامي|المستشار|المدرب|dr\.|dr\s|coach|eng\.|mr\.|chef)/i;

// Keywords that immediately indicate an impersonal, compilation, company, or faceless channel
const FACELESS_KEYWORDS: RegExp[] = [
  /ملخص(?:ات)?/i,
  /وثائقي(?:ات)?/i,
  /حقائق/i,
  /غرائب/i,
  /عجائب/i,
  /أسرار|اسرار/i,
  /قصص|قصة/i,
  /حكايات|حكاية|حواديت/i,
  /روايات|رواية/i,
  /توب\s*\d+|top\s*\d+/i,
  /معلومات/i,
  /هل\s*تعلم/i,
  /اقتباسات|مقتطفات|حكم|خواطر/i,
  /كرتون|انمي|أنمي|anime|manga/i,
  /نغمات|موسيقى|صوتيات|lofi|relax|meditation|beats|قرآن|تلاوات/i,
  /تحفيز|تحفيزي|motivation/i,
  /منوعات|عالم\s*|كوكب\s*|فضاء\s*/i,
  /شورتس\s*مجمعة|تجميعات|تجميعة/i,
  /أهداف\s*مباريات|ملخص\s*مباريات|كورة|كرة\s*قدم/i,
  /أخبار|عاجل|نبض|حدث|صحافة|جريدة|مجلة/i,
  /سينما|أفلام|افلام|مسلسلات|دراما/i,
  /طبخ|وصفات|أكلات|مطبخ/i,
  /ثقافة|ثقف\s*نفسك/i,
  /رعب|جن|أشباح|جرائم|سفاح|غموض|ما\s*وراء\s*الطبيعة/i,
  /شاشة|محطة|منصة|قناة|شبكة|مركز|معهد/i,
  /أكاديمية|اكاديمية|شركة|مؤسسة|وكالة|فريق|تيم/i,
  /شروحات|شرح|دروس|درس|كورس|دورات|دورة/i,
  /أفكار|فكرة|خطوات|طرق|طريقة|دليل|بزنس|بيزنس/i,
  /documentar(?:y|ies)/i,
  /compilation/i,
  /recap|movie\s*recap|cinema\s*recap/i,
  /quotes/i,
  /facts/i,
  /highlights/i,
  /clips\s*hub|daily\s*clips/i,
  /shorts\s*hub/i,
  /daily\s*dose/i,
  /production|studio|official|channel|hub|network|media|agency|academy|team|center/i,
];

// Indicators in bio that confirm an individual creator is speaking directly
const PERSONAL_BIO_SIGNALS: RegExp[] = [
  /(?:أنا\s+[أ-يa-zA-Z]+|اسمي\s+[أ-يa-zA-Z]+|معاكم\s+[أ-يa-zA-Z]+|معكم\s+[أ-يa-zA-Z]+)/i,
  /(?:أشارككم\s*رحلتي|أشارككم\s*تجربتي|فلوجاتي|يومياتي|رحلتي\s*في|تجربتي\s*في)/i,
  /(?:بودكاست\s*مع|حوار\s*مع|مقابلة\s*مع|ضيفي\s*اليوم)/i,
  /(?:صانع\s*محتوى|صانعة\s*محتوى|مقدم\s*برامج|يوتيوبر|vlogger|filmmaker|content\s*creator)/i,
];

export function isPersonalCreatorChannel(
  channelTitle: string,
  description: string,
  recentVideos: string[] = [],
  customUrl: string = '',
  strictNameOnly: boolean = false
): boolean {
  const cleanTitle = channelTitle.trim();
  const fullText = `${cleanTitle} ${description}`.toLowerCase();

  // 1. Any direct faceless keyword in title -> REJECT IMMEDIATELY
  for (const pat of FACELESS_KEYWORDS) {
    if (pat.test(cleanTitle)) {
      return false;
    }
  }

  // 2. If recent videos contain faceless/compilation topics -> REJECT
  if (recentVideos.length >= 2) {
    let facelessVideoMatches = 0;
    for (const vTitle of recentVideos) {
      for (const pat of FACELESS_KEYWORDS) {
        if (pat.test(vTitle)) {
          facelessVideoMatches++;
          break;
        }
      }
    }
    if (facelessVideoMatches >= 2) {
      return false;
    }
  }

  // 3. Check for Honorific title at the start of channel name (دكتور، مهندس، كابتن، إلخ)
  if (PERSONAL_HONORIFICS.test(cleanTitle)) {
    return true;
  }

  // 4. Exact Real Arabic First Name Check:
  // Split title by common delimiters (e.g. "أحمد عمارة - Ahmed Emara", "محمد غريب | تسويق")
  const mainPart = cleanTitle.split(/[-–|،:—]/)[0].trim();
  const titleWords = mainPart.split(/\s+/);

  if (titleWords.length >= 2 && titleWords.length <= 5) {
    const firstWord = titleWords[0].replace(/^[ال]/, ''); // handle with/without 'ال' prefix if needed
    const rawFirstWord = titleWords[0];

    // Check if the first word is a known Arabic human first name
    if (ARABIC_FIRST_NAMES.has(rawFirstWord) || ARABIC_FIRST_NAMES.has(firstWord)) {
      return true;
    }

    // Check English-letter personal names (e.g. "Ahmed Ali", "Mohamed Samir")
    const isEnglishFullName = /^[A-Z][a-z]{2,12}\s+[A-Z][a-z]{2,15}/.test(mainPart);
    if (isEnglishFullName) {
      const firstEn = titleWords[0].toLowerCase();
      const impersonalEnStarters = ['the', 'daily', 'top', 'facts', 'best', 'world', 'news', 'movie', 'clips', 'tech', 'how', 'learn'];
      if (!impersonalEnStarters.includes(firstEn)) {
        return true;
      }
    }
  }

  // 5. Check custom URL / handle (e.g. @ahmed_ali, @mohamed_ghareeb)
  if (customUrl) {
    const handleClean = customUrl.replace(/^@/, '').toLowerCase();
    const handleFirstPart = handleClean.split(/[._-]/)[0];
    if (ARABIC_FIRST_NAMES.has(handleFirstPart) || /^(ahmed|mohamed|mahmoud|ali|omar|sara|nour|karim|tarek|hassan|ibrahim|youssef|mostafa|khalid|walid)/i.test(handleClean)) {
      return true;
    }
  }

  // If strictNameOnly is requested, do not look into bio signals
  if (strictNameOnly) {
    return false;
  }

  // 6. Strong Bio Evidence: Creator explicitly introducing themselves with personal pronouns
  for (const pat of PERSONAL_BIO_SIGNALS) {
    if (pat.test(description)) {
      return true;
    }
  }

  // If no personal signals confirmed, it is considered Faceless/Impersonal
  return false;
}

/**
 * Executes a YouTube API request with automatic token rotation upon hitting quota limits
 */
async function fetchYouTubeWithFailover(urlBuilder: (apiKey: string) => string): Promise<{ data: any; key: string }> {
  const keys = await getYoutubeApiKeys();
  let lastError: any = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const url = urlBuilder(key);

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return { data, key };
      }

      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.error?.message || `HTTP ${res.status}`;
      const isQuotaOrLimit =
        res.status === 403 ||
        res.status === 429 ||
        msg.toLowerCase().includes('quota') ||
        msg.toLowerCase().includes('limit') ||
        msg.includes('API key not valid');

      if (isQuotaOrLimit && i < keys.length - 1) {
        console.warn(`[YouTube Key #${i + 1} Limit Reached] Switching to next key in pool...`);
        continue;
      }

      lastError = new Error(msg);
    } catch (e: any) {
      if (i < keys.length - 1) {
        console.warn(`[YouTube Key #${i + 1} Request Failed] Trying next key in pool...`);
        continue;
      }
      lastError = e;
    }
  }

  throw lastError || new Error('جميع مفاتيح Google API المسجلة استنفدت الكوتا اليومية أو غير صالحة');
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function searchYouTubeChannels(
  query: string,
  maxResults: number = 20,
  minSubscribers: number = 1000,
  filterFaceless: boolean = true,
  onlyArabic: boolean = true,
  strictNameOnly: boolean = false,
  initialPageToken?: string | null
): Promise<{ channels: YouTubeScrapeResult[]; stats: ScrapeStats; nextPageToken: string | null }> {
  const keys = await getYoutubeApiKeys();
  if (keys.length === 0) {
    throw new Error('لا يوجد أي مفتاح YouTube API مسجل في النظام');
  }

  const stats: ScrapeStats = {
    totalChecked: 0,
    qualified: 0,
    skippedLowSubscribers: 0,
    skippedFaceless: 0,
    skippedNonArabic: 0,
    keysInPool: keys.length,
  };

  const results: YouTubeScrapeResult[] = [];
  const processedChannelIds = new Set<string>();
  let nextPageToken: string | null = initialPageToken || null;
  let pageIndex = 0;
  // Scan up to 5 pages (up to 250 raw channels) to fulfill the requested target channels count
  const maxPagesToScan = Math.min(Math.max(Math.ceil(maxResults / 3), 3), 6);

  try {
    while (results.length < maxResults && pageIndex < maxPagesToScan) {
      pageIndex++;

      // 1. Search YouTube Videos & Channels with automatic token failover + Arabic language priority
      const pageParam = nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : '';
      const langParam = onlyArabic ? '&relevanceLanguage=ar' : '';
      
      // We search for videos (which is the goldmine for active human creators) to guarantee high volume
      const { data: searchData } = await fetchYouTubeWithFailover((key) =>
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
          query
        )}&maxResults=50${pageParam}${langParam}&key=${key}`
      );

      nextPageToken = searchData.nextPageToken || null;
      const searchItems = searchData.items || [];
      if (searchItems.length === 0) break;

      // Extract unique channel IDs from active creators
      const rawIds: string[] = [];
      for (const it of searchItems) {
        const cid = it.snippet?.channelId;
        if (typeof cid === 'string' && cid.startsWith('UC') && !processedChannelIds.has(cid)) {
          rawIds.push(cid);
          processedChannelIds.add(cid);
        }
      }

      if (rawIds.length === 0) {
        if (!nextPageToken) break;
        continue;
      }

      // 2. Fetch channel details in safe chunks of 50 max (avoids 'The request specifies an invalid filter parameter' 400 error)
      const idChunks = chunkArray(rawIds, 50);
      const allChannelDetails: any[] = [];

      for (const chunk of idChunks) {
        const { data: channelsData } = await fetchYouTubeWithFailover((key) =>
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${chunk.join(
            ','
          )}&key=${key}`
        );
        if (channelsData.items && Array.isArray(channelsData.items)) {
          allChannelDetails.push(...channelsData.items);
        }
      }

      stats.totalChecked += allChannelDetails.length;

      // 3. Process each channel against rules and criteria
      for (const ch of allChannelDetails) {
        if (results.length >= maxResults) break;

        const id = ch.id;
        const snippet = ch.snippet || {};
        const chStats = ch.statistics || {};
        const description = snippet.description || '';
        const customUrl = snippet.customUrl || '';
        const subCount = parseInt(chStats.subscriberCount || '0', 10);

        // Rule 0: Strict Arabic Language Filter
        if (onlyArabic) {
          const arabicLetters = (snippet.title + ' ' + description).match(/[\u0600-\u06FF]/g) || [];
          if (arabicLetters.length < 5) {
            stats.skippedNonArabic++;
            continue;
          }
        }

        // Rule 1: Skip if less than minimum subscribers (default: 1,000)
        if (subCount < minSubscribers) {
          stats.skippedLowSubscribers++;
          continue;
        }

        // Fetch recent 3 videos for email and faceless detection
        let recentVideos: string[] = [];
        let email: string | null = null;

        const emailsFound = description.match(EMAIL_REGEX) || [];
        const validEmails = emailsFound.filter(
          (e: string) => !e.toLowerCase().endsWith('.png') && !e.toLowerCase().endsWith('.jpg')
        );
        if (validEmails.length > 0) email = validEmails[0];

        try {
          const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;
          if (uploadsPlaylistId) {
            const { data: plData } = await fetchYouTubeWithFailover((key) =>
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=3&key=${key}`
            );
            for (const item of plData.items || []) {
              const vTitle = item.snippet?.title;
              if (vTitle) recentVideos.push(vTitle);

              if (!email) {
                const vDesc = item.snippet?.description || '';
                const vEmails = vDesc.match(EMAIL_REGEX) || [];
                const vValid = vEmails.filter(
                  (e: string) => !e.toLowerCase().endsWith('.png') && !e.toLowerCase().endsWith('.jpg')
                );
                if (vValid.length > 0) {
                  email = vValid[0];
                }
              }
            }
          }
        } catch {
          // Ignore individual playlist failures
        }

        // Rule 2: Skip if faceless channel filter is active (Must be a personal creator with face)
        if (filterFaceless && !isPersonalCreatorChannel(snippet.title || '', description, recentVideos, customUrl, strictNameOnly)) {
          stats.skippedFaceless++;
          continue;
        }

        // Extract social links
        const socialLinks: string[] = [];
        for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
          const matches = description.match(pattern);
          if (matches && matches.length > 0) {
            socialLinks.push(`${platform}: ${matches[0]}`);
          }
        }

        // Check if channel already exists in our local database
        const existingLead = await prisma.lead.findUnique({
          where: { channelId: id },
        });

        const channelDirectUrl = customUrl
          ? `https://www.youtube.com/${customUrl}`
          : `https://www.youtube.com/channel/${id}`;

        results.push({
          channelId: id,
          channelName: snippet.title || 'قناة غير معنونة',
          channelUrl: channelDirectUrl,
          avatarUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
          subscriberCount: subCount,
          videoCount: parseInt(chStats.videoCount || '0', 10),
          viewCount: chStats.viewCount ? Number(chStats.viewCount).toLocaleString() : '0',
          description: description,
          email: email,
          socialLinks: socialLinks,
          recentVideos: recentVideos,
          isDuplicate: !!existingLead,
        });
      }

      if (!nextPageToken) break;
    }

    stats.qualified = results.length;
    return { channels: results, stats, nextPageToken };
  } catch (err: any) {
    console.error('searchYouTubeChannels error:', err);
    throw err;
  }
}
