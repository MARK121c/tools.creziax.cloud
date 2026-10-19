import { prisma } from './prisma';
import { getSetting } from './settings';
import { YouTubeScrapeResult } from '@/types';

const DEFAULT_YOUTUBE_API_KEY = 'AIzaSyCODGyufGj8T907zHv6mgT7-9xXMDQlS2E';

const EMAIL_REGEX = /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi;

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  Instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9_.-]+/gi,
  TikTok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.-]+/gi,
  Twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_.-]+/gi,
  LinkedIn: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_.-]+/gi,
  Telegram: /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_.-]+/gi,
};

export async function searchYouTubeChannels(
  query: string,
  maxResults: number = 10
): Promise<YouTubeScrapeResult[]> {
  const customKey = await getSetting('youtube_api_key');
  const apiKey = process.env.YOUTUBE_API_KEY || customKey || DEFAULT_YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('يرجى ضبط مفتاح YouTube Data API v3 أولاً');
  }

  try {
    // 1. Search for channels
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
      query
    )}&maxResults=${Math.min(maxResults, 50)}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const errorData = await searchRes.json().catch(() => ({}));
      console.error('YouTube search API error:', errorData);
      throw new Error(errorData.error?.message || `YouTube API request failed (HTTP ${searchRes.status})`);
    }

    const searchData = await searchRes.json();
    const channelIds = (searchData.items || []).map((item: any) => item.snippet?.channelId).filter(Boolean);

    if (channelIds.length === 0) {
      return [];
    }

    // 2. Fetch channel details and statistics
    const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelIds.join(
      ','
    )}&key=${apiKey}`;

    const channelsRes = await fetch(channelsUrl);
    if (!channelsRes.ok) {
      throw new Error('YouTube Channels API request failed');
    }

    const channelsData = await channelsRes.json();
    const channelItems = channelsData.items || [];

    // 3. Process each channel
    const results: YouTubeScrapeResult[] = [];

    for (const ch of channelItems) {
      const id = ch.id;
      const snippet = ch.snippet || {};
      const stats = ch.statistics || {};
      const description = snippet.description || '';
      const customUrl = snippet.customUrl || '';

      // Extract email from channel description
      const emailsFound = description.match(EMAIL_REGEX) || [];
      const validEmails = emailsFound.filter(
        (e: string) => !e.toLowerCase().endsWith('.png') && !e.toLowerCase().endsWith('.jpg')
      );
      let email = validEmails.length > 0 ? validEmails[0] : null;

      // Extract social links
      const socialLinks: string[] = [];
      for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
        const matches = description.match(pattern);
        if (matches && matches.length > 0) {
          socialLinks.push(`${platform}: ${matches[0]}`);
        }
      }

      // Fetch recent 3 videos to extract email from video descriptions if not in channel description
      let recentVideos: string[] = [];
      try {
        const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylistId) {
          const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=3&key=${apiKey}`;
          const plRes = await fetch(playlistUrl);
          if (plRes.ok) {
            const plData = await plRes.json();
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
        }
      } catch (vErr) {
        console.warn(`Could not fetch videos for channel ${id}:`, vErr);
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
        subscriberCount: parseInt(stats.subscriberCount || '0', 10),
        videoCount: parseInt(stats.videoCount || '0', 10),
        viewCount: stats.viewCount ? Number(stats.viewCount).toLocaleString() : '0',
        description: description,
        email: email,
        recentVideos: recentVideos,
        isDuplicate: !!existingLead,
      });
    }

    return results;
  } catch (err: any) {
    console.error('searchYouTubeChannels error:', err);
    throw err;
  }
}
