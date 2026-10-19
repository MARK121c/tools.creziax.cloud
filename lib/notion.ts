// Embedded default credentials with environment override
const DEFAULT_NOTION_TOKEN = Buffer.from('bnRuXzM2MzQ3MDE1Nzc0OWlNZEIxWGtzazJ3bHhPeTV3bTQ2dk5jZmJxVEdUWmw2YVI=', 'base64').toString('utf-8');
const DEFAULT_NOTION_DB_ID = '26e87673725e82e1ace2013a9d100c99';

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

  // Matching exact Notion DB schema:
  // - "بيانات التواصل" is the title property
  // - "اسم العميل " is rich_text (contains trailing space in Notion DB)
  // - "نتش العميل" is rich_text
  // - "حالة العميل" is status (initial option: "العرض قيد الانشاء")
  // - "تاريخ الإضافة" is auto-managed created_time (read-only)
  const properties: Record<string, any> = {
    'بيانات التواصل': {
      title: [
        {
          text: {
            content: contactText.slice(0, 2000),
          },
        },
      ],
    },
    'اسم العميل ': {
      rich_text: [
        {
          text: {
            content: (lead.channelName || 'عميل بدون اسم').slice(0, 100),
          },
        },
      ],
    },
    'نتش العميل': {
      rich_text: [
        {
          text: {
            content: (lead.niche || targetNiche || 'عام').slice(0, 100),
          },
        },
      ],
    },
    'حالة العميل': {
      status: {
        name: 'العرض قيد الانشاء',
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

  // Fallback in case "اسم العميل " was renamed to "اسم العميل" without trailing space
  if (res.status === 400) {
    const errorBody = await res.text();
    if (errorBody.includes('اسم العميل')) {
      delete properties['اسم العميل '];
      properties['اسم العميل'] = {
        rich_text: [
          {
            text: {
              content: (lead.channelName || 'عميل بدون اسم').slice(0, 100),
            },
          },
        ],
      };
      payload.properties = properties;
      res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } else {
      throw new Error(`Notion API Error (400): ${errorBody}`);
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
      const nameProp = page.properties?.['اسم العميل ']?.rich_text || page.properties?.['اسم العميل']?.rich_text;
      if (Array.isArray(nameProp) && nameProp.length > 0) {
        const text = nameProp[0]?.text?.content?.trim()?.toLowerCase();
        if (text) existing.add(text);
      }
      const titleProp = page.properties?.['بيانات التواصل']?.title;
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
