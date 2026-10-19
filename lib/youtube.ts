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
  keysInPool?: number;
}

// Patterns typical of faceless/compilation/recap channels
const FACELESS_PATTERNS: RegExp[] = [
  /ملخص(?:ات)?/i,
  /وثائقي(?:ات)?/i,
  /حقائق/i,
  /غرائب/i,
  /قصص\s*وروايات|قصص\s*رعب|أغرب\s*القصص/i,
  /توب\s*10|توب\s*5|توب\s*تن|top\s*10|top\s*5/i,
  /معلومات\s*عامة|معلومات\s*مفيدة/i,
  /هل\s*تعلم/i,
  /اقتباسات|مقتطفات/i,
  /كرتون|انمي|أنمي|anime/i,
  /نغمات|موسيقى|صوتيات|lofi|relax|meditation/i,
  /تحفيز|تحفيزي/i,
  /منوعات|عالم\s*الغرائب/i,
  /شورتس\s*مجمعة|تجميعات/i,
  /أهداف\s*مباريات|ملخص\s*مباريات/i,
  /documentar(?:y|ies)/i,
  /compilation/i,
  /recap|movie\s*recap|cinema\s*recap/i,
  /quotes/i,
  /facts/i,
  /highlights/i,
  /clips\s*hub|daily\s*clips/i,
  /shorts\s*hub/i,
  /daily\s*dose/i,
];

export function isFacelessChannel(
  channelTitle: string,
  description: string,
  recentVideos: string[] = []
): boolean {
  for (const pat of FACELESS_PATTERNS) {
    if (pat.test(channelTitle)) return true;
  }

  const descLower = description.toLowerCase();
  if (
    descLower.includes('قناة مخصصة لنشر ملخصات') ||
    descLower.includes('نقدم لكم حقائق') ||
    descLower.includes('أفضل المقاطع واللقطات') ||
    descLower.includes('movie recaps') ||
    descLower.includes('compilation of')
  ) {
    return true;
  }

  if (recentVideos.length >= 2) {
    let facelessMatches = 0;
    for (const vTitle of recentVideos) {
      for (const pat of FACELESS_PATTERNS) {
        if (pat.test(vTitle)) {
          facelessMatches++;
          break;
        }
      }
    }
    if (facelessMatches >= 2) return true;
  }

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

export async function searchYouTubeChannels(
  query: string,
  maxResults: number = 20,
  minSubscribers: number = 1000,
  filterFaceless: boolean = true
): Promise<{ channels: YouTubeScrapeResult[]; stats: ScrapeStats }> {
  const keys = await getYoutubeApiKeys();
  if (keys.length === 0) {
    throw new Error('لا يوجد أي مفتاح YouTube API مسجل في النظام');
  }

  const stats: ScrapeStats = {
    totalChecked: 0,
    qualified: 0,
    skippedLowSubscribers: 0,
    skippedFaceless: 0,
    keysInPool: keys.length,
  };

  try {
    // 1. Search for channels with automatic token failover
    const fetchLimit = Math.min(Math.max(maxResults * 2, 30), 50);
    const { data: searchData } = await fetchYouTubeWithFailover((key) =>
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
        query
      )}&maxResults=${fetchLimit}&key=${key}`
    );

    const channelIds = (searchData.items || []).map((item: any) => item.snippet?.channelId).filter(Boolean);

    if (channelIds.length === 0) {
      return { channels: [], stats };
    }

    // 2. Fetch channel details and statistics with failover
    const { data: channelsData } = await fetchYouTubeWithFailover((key) =>
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelIds.join(
        ','
      )}&key=${key}`
    );

    const channelItems = channelsData.items || [];
    stats.totalChecked = channelItems.length;

    // 3. Process each channel
    const results: YouTubeScrapeResult[] = [];

    for (const ch of channelItems) {
      if (results.length >= maxResults) break;

      const id = ch.id;
      const snippet = ch.snippet || {};
      const chStats = ch.statistics || {};
      const description = snippet.description || '';
      const customUrl = snippet.customUrl || '';
      const subCount = parseInt(chStats.subscriberCount || '0', 10);

      // Rule 1: Skip if less than minimum subscribers (default: 1,000)
      if (subCount < minSubscribers) {
        stats.skippedLowSubscribers++;
        continue;
      }

      // Fetch recent 3 videos for email and faceless detection
      let recentVideos: string[] = [];
      let email: string | null = null;

      // Extract email from channel description first
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
      } catch (vErr) {
        console.warn(`Could not fetch videos for channel ${id}:`, vErr);
      }

      // Rule 2: Skip if faceless channel filter is active
      if (filterFaceless && isFacelessChannel(snippet.title || '', description, recentVideos)) {
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

    stats.qualified = results.length;
    return { channels: results, stats };
  } catch (err: any) {
    console.error('searchYouTubeChannels error:', err);
    throw err;
  }
}
