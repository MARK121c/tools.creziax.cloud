import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const AUTH_COOKIE_NAME = 'creziax_session';
const AUTH_SECRET = process.env.AUTH_SECRET || 'apex-crm-creziax-super-secret-key-2026';

/**
 * Hash a password using PBKDF2 with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    // Fallback if plain text was seeded
    return password === storedHash;
  }
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Create a signed HMAC token containing user ID and expiration
 */
export function createSessionToken(userId: string, email: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const payload = JSON.stringify({ userId, email, expiresAt });
  const payloadBase64 = Buffer.from(payload).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', AUTH_SECRET);
  hmac.update(payloadBase64);
  const signature = hmac.digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify HMAC token and return payload if valid
 */
export function verifySessionToken(token: string): { userId: string; email: string; expiresAt: number } | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [payloadBase64, signature] = token.split('.');
    
    const hmac = crypto.createHmac('sha256', AUTH_SECRET);
    hmac.update(payloadBase64);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Get current authenticated user from cookies
 */
export async function getSessionUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    
    const session = verifySessionToken(token);
    if (!session?.userId) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

export { AUTH_COOKIE_NAME };
