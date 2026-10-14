import crypto from 'crypto';

export interface CloudResource {
  resource_id: string;
  quality: string;
  format: string;
  type: string;
  size: number;
  resource_content: string;
  download_url?: string;
  has_audio?: boolean;
}

export interface CloudParseResult {
  title: string;
  thumbnail: string;
  duration: number;
  resources: CloudResource[];
}

const AES_KEYS = [
  '4c9b7d2e'.repeat(3) + '4c9b7d21', // 32 bytes (AES-256)
  'rz18efAXUbdiaO7k',                 // 16 bytes (AES-128)
];

/**
 * Decrypts AES-CBC ZeroPadding payloads from vidssave / contentsite API
 */
export function decryptCloudPayload(ciphertextB64: string): any {
  if (!ciphertextB64 || typeof ciphertextB64 !== 'string') return null;

  const ciphertext = Buffer.from(ciphertextB64.trim(), 'base64');
  if (ciphertext.length === 0) return null;

  for (const k of AES_KEYS) {
    try {
      const keyBuf = Buffer.from(k, 'utf-8');
      const ivBuf = keyBuf.subarray(0, 16);
      const algorithm = keyBuf.length === 32 ? 'aes-256-cbc' : 'aes-128-cbc';

      const decipher = crypto.createDecipheriv(algorithm, keyBuf, ivBuf);
      decipher.setAutoPadding(false);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      // Strip trailing null bytes
      let end = decrypted.length;
      while (end > 0 && decrypted[end - 1] === 0) {
        end--;
      }

      const text = decrypted.subarray(0, end).toString('utf-8');
      return JSON.parse(text);
    } catch {
      // try next key
    }
  }

  return null;
}

/**
 * Resolves video info via high-speed cloud resolver (bypasses YouTube/Facebook/Instagram bot blocks)
 */
export async function parseCloudMedia(url: string): Promise<CloudParseResult | null> {
  try {
    const postData = new URLSearchParams({
      hostname: 'ar.vidssave.com',
      auth: '4c9b7d21',
      domain: 'api-ak.vidssave.com',
      origin: 'source',
      link: url.trim(),
    }).toString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('https://api.vidssave.com/api/contentsite_api/media/parse', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://ar.vidssave.com/',
        Origin: 'https://ar.vidssave.com',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 1 || !json.data) return null;

    let parsedData = json.data;
    if (typeof parsedData === 'string') {
      parsedData = decryptCloudPayload(parsedData);
    }

    if (!parsedData || !parsedData.title) return null;

    return {
      title: parsedData.title,
      thumbnail: parsedData.thumbnail || '',
      duration: parsedData.duration || 0,
      resources: parsedData.resources || [],
    };
  } catch (err) {
    console.warn('Cloud media parse failed:', err);
    return null;
  }
}

/**
 * Initiates cloud download task and queries the final direct download link
 */
export async function getCloudDirectDownloadLink(resourceContent: string): Promise<string | null> {
  try {
    const downloadPayload = new URLSearchParams({
      hostname: 'ar.vidssave.com',
      auth: '4c9b7d21',
      domain: 'api-ak.vidssave.com',
      request: resourceContent,
      no_encrypt: '1',
    }).toString();

    const dlRes = await fetch('https://api.vidssave.com/api/contentsite_api/media/download', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://ar.vidssave.com/',
        Origin: 'https://ar.vidssave.com',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: downloadPayload,
    });

    if (!dlRes.ok) return null;

    const dlJson = await dlRes.json();
    if (dlJson.status !== 1 || !dlJson.data) return null;

    let decData = dlJson.data;
    if (typeof decData === 'string') {
      decData = decryptCloudPayload(decData);
    }

    const taskId = decData?.task_id;
    if (!taskId) return null;

    // Query task via SSE / download_query
    const queryUrl = `https://api.vidssave.com/sse/contentsite_api/media/download_query?task_id=${encodeURIComponent(
      taskId
    )}&download_domain=vidssave.com&origin=content_site&auth=20250901majwlqo&domain=api-ak.vidssave.com`;

    const controller = new AbortController();
    const queryTimeout = setTimeout(() => controller.abort(), 20000);

    const qRes = await fetch(queryUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/event-stream',
        Referer: 'https://ar.vidssave.com/',
      },
      signal: controller.signal,
    });

    clearTimeout(queryTimeout);

    if (!qRes.ok || !qRes.body) return null;

    const reader = qRes.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      accumulated += decoder.decode(value, { stream: true });
      const lines = accumulated.split('\n');
      accumulated = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const raw = line.replace('data:', '').trim();
          try {
            const dataObj = JSON.parse(raw);
            if (dataObj.status === 'success' && dataObj.download_link) {
              reader.cancel();
              return dataObj.download_link;
            }
          } catch {
            // ignore non-json SSE lines
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.error('getCloudDirectDownloadLink failed:', err);
    return null;
  }
}
