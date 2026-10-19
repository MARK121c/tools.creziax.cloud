import { getSetting, setSetting } from './settings';

export const DEFAULT_YOUTUBE_API_KEY = 'AIzaSyCODGyufGj8T907zHv6mgT7-9xXMDQlS2E';

export async function getYoutubeApiKeys(): Promise<string[]> {
  try {
    const raw = await getSetting('youtube_api_keys_pool');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.map((k) => String(k).trim()).filter(Boolean);
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch (err) {
    console.error('Error reading youtube_api_keys_pool:', err);
  }

  const single = process.env.YOUTUBE_API_KEY || DEFAULT_YOUTUBE_API_KEY;
  return [single];
}

export async function saveYoutubeApiKeys(keys: string[]): Promise<string[]> {
  const cleaned = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
  if (cleaned.length === 0) {
    cleaned.push(DEFAULT_YOUTUBE_API_KEY);
  }
  await setSetting('youtube_api_keys_pool', JSON.stringify(cleaned), 'Pool of YouTube Data API v3 Keys');
  return cleaned;
}

export async function addYoutubeApiKey(newKey: string): Promise<string[]> {
  const trimmed = newKey.trim();
  if (!trimmed) throw new Error('يرجى إدخال مفتاح صالح');
  const current = await getYoutubeApiKeys();
  if (current.includes(trimmed)) {
    return current;
  }
  const updated = [...current, trimmed];
  return await saveYoutubeApiKeys(updated);
}

export async function removeYoutubeApiKey(keyToRemove: string): Promise<string[]> {
  const current = await getYoutubeApiKeys();
  const updated = current.filter((k) => k !== keyToRemove.trim());
  return await saveYoutubeApiKeys(updated);
}
