import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export type ConsoleSessionKeyRecord = {
  email: string;
  keyHash: string;
  keyEnc: string;
  keyId: string;
  updatedAt: string;
};

function secretMaterial(): Buffer {
  const raw = String(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '').trim();
  if (!raw) {
    throw new Error('AUTH_SECRET / NEXTAUTH_SECRET 未配置，无法加密控制台密钥');
  }
  return createHash('sha256').update(raw).digest();
}

function emailHash(email: string): string {
  return createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');
}

function rootDir(): string {
  return path.join(process.cwd(), 'data', 'console-session-keys');
}

function filePath(email: string): string {
  return path.join(rootDir(), `${emailHash(email)}.json`);
}

/** AES-256-GCM；格式 iv:tag:cipher（均 base64url） */
export function encryptConsoleKey(plaintext: string): string {
  const key = secretMaterial();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64url')).join(':');
}

export function decryptConsoleKey(blob: string): string {
  const parts = String(blob || '').split(':');
  if (parts.length !== 3) throw new Error('密钥密文损坏');
  const [ivB, tagB, encB] = parts;
  const key = secretMaterial();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encB, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function readConsoleSessionKey(email: string): ConsoleSessionKeyRecord | null {
  const file = filePath(email);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as ConsoleSessionKeyRecord;
    if (!raw?.keyEnc || !raw?.keyHash) return null;
    return raw;
  } catch (error) {
    logger.error('[console-session-key] read corrupt', { email, error });
    return null;
  }
}

export function writeConsoleSessionKey(rec: ConsoleSessionKeyRecord): void {
  const dir = rootDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath(rec.email), JSON.stringify(rec, null, 2) + '\n', 'utf8');
}

export function deleteConsoleSessionKey(email: string): void {
  const file = filePath(email);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
