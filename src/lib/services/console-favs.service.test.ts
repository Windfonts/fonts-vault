import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConsoleFavsService } from '@/lib/services/console-favs.service';

describe('ConsoleFavsService', () => {
  it('get/put isolates by api key and buckets', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-favs-'));
    const svc = new ConsoleFavsService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    try {
      expect(svc.get('key-a').fonts).toEqual([]);
      const saved = svc.put('key-a', {
        fonts: [
          { id: 'f1', name: '一' },
          { id: 'f1', name: '重复' },
        ],
        authors: [{ id: 'a1', name: '厂' }],
      });
      expect(saved.fonts).toHaveLength(1);
      expect(saved.authors).toHaveLength(1);
      expect(svc.get('key-b').fonts).toEqual([]);
      const hash = svc.ownerHash('key-a');
      expect(JSON.parse(readFileSync(path.join(root, `${hash}.json`), 'utf8')).fonts).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects oversized fonts bucket', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-favs-'));
    const svc = new ConsoleFavsService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    try {
      const many = Array.from({ length: 501 }, (_, i) => ({ id: `f${i}` }));
      expect(() => svc.put('k', { fonts: many, authors: [] })).toThrow(/最多/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
