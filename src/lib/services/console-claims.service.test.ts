import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConsoleClaimsService } from '@/lib/services/console-claims.service';

describe('ConsoleClaimsService', () => {
  it('creates and lists claims per key', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-claims-'));
    const svc = new ConsoleClaimsService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
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
      expect(() =>
        svc.create('key-a', { slug: 'lxgw', name: '落霞孤鹜' })
      ).toThrow(/审核中/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
