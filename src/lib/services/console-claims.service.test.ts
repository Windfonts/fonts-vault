import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConsoleClaimsService } from '@/lib/services/console-claims.service';

describe('ConsoleClaimsService', () => {
  it('creates and lists claims per key', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-claims-'));
    const cwd = mkdtempSync(path.join(tmpdir(), 'console-claims-cwd-'));
    const svc = new ConsoleClaimsService();
    const origCwd = process.cwd();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    (svc as unknown as { statusPath: () => string }).statusPath = () =>
      path.join(cwd, 'foundry-claim-status.json');
    try {
      expect(svc.list('key-a')).toEqual([]);
      const c = svc.create('key-a', {
        slug: 'lxgw',
        name: '落霞孤鹜',
        kind: 'author',
        email: 'hi@example.com',
        website: 'https://example.com',
      });
      expect(c.id).toMatch(/^cl_/);
      expect(c.status).toBe('pending');
      expect(svc.list('key-a')).toHaveLength(1);
      expect(svc.list('key-b')).toEqual([]);
      expect(() => svc.create('key-a', { slug: 'lxgw', name: '落霞孤鹜' })).toThrow(/审核中/);
    } finally {
      process.chdir(origCwd);
      rmSync(root, { recursive: true, force: true });
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('approves claim and writes status overlay + foundries.json', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-claims-'));
    const cwd = mkdtempSync(path.join(tmpdir(), 'console-claims-cwd-'));
    const foundriesPath = path.join(cwd, 'foundries.json');
    writeFileSync(
      foundriesPath,
      JSON.stringify({ foundries: [{ id: 'lxgw', name: '落霞孤鹜', claimed: false }] }, null, 2),
      'utf8'
    );
    process.env.FOUNDRIES_JSON_PATH = foundriesPath;

    const svc = new ConsoleClaimsService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    (svc as unknown as { statusPath: () => string }).statusPath = () =>
      path.join(cwd, 'foundry-claim-status.json');

    try {
      const c = svc.create('key-a', { slug: 'lxgw', name: '落霞孤鹜', email: 'a@b.com' });
      const result = svc.review(c.id, { status: 'approved' }, { email: 'admin@x' });
      expect(result.claim.status).toBe('approved');
      expect(result.foundriesPatched).toBe(true);
      expect(svc.claimStatusMap().bySlug.lxgw?.claimed).toBe(true);
      const fj = JSON.parse(readFileSync(foundriesPath, 'utf8'));
      expect(fj.foundries[0].claimed).toBe(true);
      expect(() => svc.review(c.id, { status: 'rejected' })).toThrow(/已审核/);
    } finally {
      delete process.env.FOUNDRIES_JSON_PATH;
      rmSync(root, { recursive: true, force: true });
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
