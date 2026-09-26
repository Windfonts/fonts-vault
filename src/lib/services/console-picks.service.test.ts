import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConsolePicksService } from '@/lib/services/console-picks.service';

describe('ConsolePicksService', () => {
  it('get/put isolates by api key hash', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-picks-'));
    const svc = new ConsolePicksService();
    const orig = (svc as unknown as { rootDir: () => string }).rootDir.bind(svc);
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;

    try {
      expect(svc.get('wf_live_aaaaaaaaaaaaaaaa_AAAA').items).toEqual([]);
      const saved = svc.put('key-a', [
        { id: 'font-1', name: '一号' },
        { id: 'font-1', name: '重复应去重' },
        { id: 'font-2', name: '二号' },
      ]);
      expect(saved.items).toHaveLength(2);
      expect(saved.items[0]?.id).toBe('font-1');

      expect(svc.get('key-a').items.map((x) => x.id)).toEqual(['font-1', 'font-2']);
      expect(svc.get('key-b').items).toEqual([]);

      const hash = svc.ownerHash('key-a');
      const file = path.join(root, `${hash}.json`);
      expect(JSON.parse(readFileSync(file, 'utf8')).items).toHaveLength(2);
    } finally {
      (svc as unknown as { rootDir: () => string }).rootDir = orig;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects oversized payload via normalize cap', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-picks-'));
    mkdirSync(root, { recursive: true });
    const svc = new ConsolePicksService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    try {
      const many = Array.from({ length: 201 }, (_, i) => ({ id: `f${i}`, name: `n${i}` }));
      expect(() => svc.put('k', many)).toThrow(/最多/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips corrupt store rows', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-picks-'));
    const svc = new ConsolePicksService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    try {
      const hash = svc.ownerHash('k');
      writeFileSync(
        path.join(root, `${hash}.json`),
        JSON.stringify({ ownerKeyHash: hash, updatedAt: 'x', items: [{ id: 'ok' }, { bad: true }] }),
        'utf8'
      );
      expect(svc.get('k').items).toEqual([{ id: 'ok', name: 'ok', addedAt: expect.any(String) }]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
