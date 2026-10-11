import { prisma } from './prisma';

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    if (setting && setting.value !== '') {
      return setting.value;
    }
  } catch (error) {
    console.error(`Error reading setting ${key} from DB:`, error);
  }

  // Fallback to process.env
  const envKey = key.toUpperCase();
  return process.env[envKey] || defaultValue;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const settings = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const item of settings) {
      result[item.key] = item.value;
    }
    return result;
  } catch (error) {
    console.error('Error reading all settings from DB:', error);
    return {};
  }
}

export async function setSetting(key: string, value: string, description?: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value, ...(description ? { description } : {}) },
    create: { key, value, description },
  });
}
