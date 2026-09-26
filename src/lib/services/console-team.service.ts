import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const MAX_MEMBERS = 5;
const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];

const memberSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  role: z.enum(ROLES),
  status: z.enum(['active', 'pending']).default('pending'),
  invitedAt: z.string().min(1).max(40),
});

export type ConsoleTeamMember = z.infer<typeof memberSchema>;

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  members: ConsoleTeamMember[];
};

function keyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

function normalizeMembers(raw: unknown): ConsoleTeamMember[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ConsoleTeamMember[] = [];
  for (const row of raw) {
    if (out.length >= MAX_MEMBERS) break;
    try {
      const m = memberSchema.parse(row);
      const email = m.email.toLowerCase();
      if (seen.has(email)) continue;
      seen.add(email);
      out.push({ ...m, email });
    } catch {
      /* skip */
    }
  }
  return out;
}

export class ConsoleTeamService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'console-team');
  }

  private filePath(hash: string): string {
    return path.join(this.rootDir(), `${hash}.json`);
  }

  ownerHash(apiKeyRaw: string): string {
    return keyHash(apiKeyRaw);
  }

  private readStore(hash: string): StoreFile {
    const file = this.filePath(hash);
    if (!fs.existsSync(file)) {
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), members: [] };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
      return {
        ownerKeyHash: hash,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        members: normalizeMembers(raw.members),
      };
    } catch (error) {
      logger.error('[ConsoleTeamService] store corrupt', { hash, error });
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), members: [] };
    }
  }

  private writeStore(store: StoreFile): void {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath(store.ownerKeyHash), JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  list(apiKeyRaw: string): { members: ConsoleTeamMember[]; updatedAt: string } {
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    return { members: store.members.slice(), updatedAt: store.updatedAt };
  }

  put(apiKeyRaw: string, body: { members?: unknown }): { members: ConsoleTeamMember[]; updatedAt: string } {
    if (body.members !== undefined && !Array.isArray(body.members)) {
      throw Object.assign(new Error('members 须为数组'), { status: 422, code: 'validation_error' });
    }
    if (Array.isArray(body.members) && body.members.length > MAX_MEMBERS) {
      throw Object.assign(new Error(`团队最多 ${MAX_MEMBERS} 人`), {
        status: 422,
        code: 'quota_exceeded',
      });
    }
    const hash = this.ownerHash(apiKeyRaw);
    const members = normalizeMembers(body.members);
    const owners = members.filter((m) => m.role === 'owner');
    if (owners.length > 1) {
      throw Object.assign(new Error('只能有一位所有者'), { status: 422, code: 'validation_error' });
    }
    const store: StoreFile = {
      ownerKeyHash: hash,
      updatedAt: new Date().toISOString(),
      members,
    };
    this.writeStore(store);
    return { members: store.members.slice(), updatedAt: store.updatedAt };
  }

  invite(
    apiKeyRaw: string,
    body: { email?: unknown; role?: unknown; name?: unknown }
  ): ConsoleTeamMember {
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@')) {
      throw Object.assign(new Error('邮箱无效'), { status: 422, code: 'validation_error' });
    }
    let role = String(body.role || 'editor').trim() as Role;
    if (role === 'owner') {
      throw Object.assign(new Error('不能直接邀请为所有者'), {
        status: 422,
        code: 'validation_error',
      });
    }
    if (!ROLES.includes(role) || role === 'owner') role = 'editor';
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    if (store.members.length >= MAX_MEMBERS) {
      throw Object.assign(new Error(`席位已满，最多 ${MAX_MEMBERS} 人`), {
        status: 422,
        code: 'quota_exceeded',
      });
    }
    if (store.members.some((m) => m.email === email)) {
      throw Object.assign(new Error('该邮箱已在团队中'), { status: 409, code: 'conflict' });
    }
    const member: ConsoleTeamMember = {
      id: 'm-' + randomBytes(5).toString('hex'),
      name: String(body.name || email.split('@')[0] || 'member').slice(0, 120),
      email,
      role,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };
    store.members.push(member);
    this.writeStore(store);
    return member;
  }

  setRole(apiKeyRaw: string, id: string, roleRaw: unknown): ConsoleTeamMember {
    const role = String(roleRaw || '').trim() as Role;
    if (!ROLES.includes(role)) {
      throw Object.assign(new Error('角色无效'), { status: 422, code: 'validation_error' });
    }
    if (role === 'owner') {
      throw Object.assign(new Error('不能直接设为所有者'), {
        status: 422,
        code: 'validation_error',
      });
    }
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    const member = store.members.find((m) => m.id === id);
    if (!member) {
      throw Object.assign(new Error('成员不存在'), { status: 404, code: 'not_found' });
    }
    if (member.role === 'owner') {
      throw Object.assign(new Error('不能变更所有者角色'), { status: 403, code: 'forbidden' });
    }
    member.role = role;
    this.writeStore(store);
    return { ...member };
  }

  remove(apiKeyRaw: string, id: string): { ok: true } {
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    const member = store.members.find((m) => m.id === id);
    if (!member) {
      throw Object.assign(new Error('成员不存在'), { status: 404, code: 'not_found' });
    }
    if (member.role === 'owner') {
      throw Object.assign(new Error('无法移除所有者'), { status: 403, code: 'forbidden' });
    }
    store.members = store.members.filter((m) => m.id !== id);
    this.writeStore(store);
    return { ok: true };
  }
}

export const consoleTeamService = new ConsoleTeamService();
