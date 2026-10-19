// Embedded default credentials with environment override
const DEFAULT_NOTION_TOKEN = Buffer.from('bnRuXzM2MzQ3MDE1Nzc0OWlNZEIxWGtzazJ3bHhPeTV3bTQ2dk5jZmJxVEdUWmw2YVI=', 'base64').toString('utf-8');
const DEFAULT_NOTION_DB_ID = '3fe87673725e80c484affadee8f672d1';

export async function getNotionConfig() {
  const token = process.env.NOTION_TOKEN || DEFAULT_NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID || DEFAULT_NOTION_DB_ID;
  return { token, databaseId };
}

export interface NotionLeadPayload {
  channelName: string;
  channelUrl: string;
  email?: string | null;
  socialLinks?: string[];
  subscribers?: number;
  niche?: string;
  description?: string;
}

/**
 * Pushes a single lead into the Notion database: 'العملاء - متابعة CRM'
 */
export async function pushLeadToNotion(lead: NotionLeadPayload, targetNiche: string = 'عام') {
  const { token, databaseId } = await getNotionConfig();

  if (!token || !databaseId) {
    throw new Error('Notion Token or Database ID is missing');
  }

  const contactParts: string[] = [];
  if (lead.email) {
    contactParts.push(`📧 إيميل: ${lead.email}`);
  }
  if (lead.socialLinks && lead.socialLinks.length > 0) {
    contactParts.push(`🌐 تواصل: ${lead.socialLinks.join(' | ')}`);
  }
  if (lead.channelUrl) contactParts.push(`🔗 القناة: ${lead.channelUrl}`);
  if (lead.subscribers) contactParts.push(`👥 المشتركين: ${Number(lead.subscribers).toLocaleString()}`);

  const contactText = contactParts.length > 0 ? contactParts.join('\n') : lead.channelUrl || '';
  const nowIso = new Date().toISOString();

  const properties: Record<string, any> = {
    'اسم العميل': {
      title: [
        {
          text: {
            content: (lead.channelName || 'عميل بدون اسم').slice(0, 100),
          },
        },
      ],
    },
    'بيانات التواصل': {
      rich_text: [
        {
          text: {
            content: contactText.slice(0, 2000),
          },
        },
      ],
    },
    'نتش العميل': {
      select: {
        name: (lead.niche || targetNiche || 'عام').slice(0, 100),
      },
    },
    'حالة العميل': {
      status: {
        name: 'جديد',
      },
    },
    'تاريخ الإضافة': {
      date: {
        start: nowIso,
      },
    },
  };

  const payload = {
    parent: { database_id: databaseId },
    properties,
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  let res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  // Fallback if status property is actually a select in the user's Notion table
  if (res.status === 400) {
    const errorBody = await res.text();
    if (errorBody.toLowerCase().includes('status')) {
      properties['حالة العميل'] = { select: { name: 'جديد' } };
      payload.properties = properties;
      res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion API Error (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Checks existing lead titles in Notion to prevent duplicates
 */
export async function getExistingNotionLeadNames(): Promise<Set<string>> {
  const { token, databaseId } = await getNotionConfig();
  const existing = new Set<string>();

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 100 }),
    });

    if (!res.ok) return existing;

    const data = await res.json();
    for (const page of data.results || []) {
      const titleProp = page.properties?.['اسم العميل']?.title;
      if (Array.isArray(titleProp) && titleProp.length > 0) {
        const text = titleProp[0]?.text?.content?.trim()?.toLowerCase();
        if (text) existing.add(text);
      }
    }
  } catch (err) {
    console.warn('Could not query Notion existing leads:', err);
  }

  return existing;
}
