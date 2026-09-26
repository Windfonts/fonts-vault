import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import {
  codePointsFromText,
  rewriteSplitCss,
  textSubsetKey,
  trySplitFontToDir,
} from '@/lib/upload-split';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';

const FIXTURE_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  path.join(
    process.env.HOME || '',
    'Projects/fonts-packages/_upstream-src/RocknRollOne-Regular.ttf'
  ),
];

function findFixture(): string | null {
  for (const p of FIXTURE_CANDIDATES) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

describe('upload-split rewrite', () => {
  it('rewrites relative urls and strips local()', () => {
    const css =
      '@font-face{font-family:"X";src:local("a"),local("b"),url("./0.woff2")format("woff2");font-weight:400;font-display:auto;}';
    const out = rewriteSplitCss(css, {
      family: 'my-family',
      display: 'swap',
      weightCss: 700,
      shardBaseUrl: 'https://app.example/shards',
      urlQuery: '?p=demo',
    });
    expect(out).toContain('font-family:"my-family"');
    expect(out).toContain('font-weight:700');
    expect(out).toContain('font-display:swap');
    expect(out).not.toMatch(/local\(/);
    expect(out).toContain('https://app.example/shards/0.woff2?p=demo');
  });
});

describe('codePointsFromText', () => {
  it('dedupes and skips whitespace', () => {
    const cps = codePointsFromText('啊 啊ab\n文');
    expect(cps).toEqual([97, 98, 21834, 25991]);
    expect(textSubsetKey(cps)).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('upload-split fontSplit', () => {
  it('splits a real TTF when fixture exists', async () => {
    const fixture = findFixture();
    if (!fixture) return;
    const outDir = mkdtempSync(path.join(tmpdir(), 'split-'));
    try {
      const result = await trySplitFontToDir(readFileSync(fixture), outDir, {
        family: 'split-test',
        weightCss: 400,
        label: 'fixture',
      });
      expect(result).not.toBeNull();
      expect(result!.shardCount).toBeGreaterThan(0);
      expect(existsSync(path.join(outDir, 'result.css'))).toBe(true);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 120_000);

  it('text subset yields few shards', async () => {
    const fixture = findFixture();
    if (!fixture) return;
    const outDir = mkdtempSync(path.join(tmpdir(), 'split-text-'));
    try {
      const cps = codePointsFromText('Hello文风123');
      const result = await trySplitFontToDir(readFileSync(fixture), outDir, {
        family: 'text-test',
        weightCss: 400,
        codePoints: cps,
        label: 'text-fixture',
        chunkKb: 200,
      });
      expect(result).not.toBeNull();
      expect(result!.shardCount).toBeLessThanOrEqual(3);
      expect(existsSync(path.join(outDir, 'result.css'))).toBe(true);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 120_000);

  it('review stores splitAs for TTF upload', async () => {
    const fixture = findFixture();
    if (!fixture) return;
    const upRoot = mkdtempSync(path.join(tmpdir(), 'split-up-'));
    const svc = consoleUploadsService as unknown as { rootDir: () => string };
    const origRoot = svc.rootDir;
    svc.rootDir = () => upRoot;
    const prevOss = process.env.UPLOAD_OSS_SKIP;
    const prevW = process.env.UPLOAD_WOFF2_SKIP;
    const prevS = process.env.UPLOAD_SPLIT_SKIP;
    process.env.UPLOAD_OSS_SKIP = '1';
    delete process.env.UPLOAD_WOFF2_SKIP;
    delete process.env.UPLOAD_SPLIT_SKIP;
    try {
      const bytes = readFileSync(fixture);
      const init = consoleUploadsService.init(
        'key-split',
        {
          name: 'Split Test',
          family: 'split-test',
          license: 'ofl',
          files: [{ filename: 'a.ttf', size: bytes.length, weight: 'Regular' }],
        },
        'https://app.windfonts.com'
      );
      const token = init.uploadUrls[0]?.headers?.['X-Upload-Token'] || '';
      consoleUploadsService.putFile({
        uploadId: init.id,
        part: 'Regular',
        token,
        bytes,
        contentType: 'font/ttf',
      });
      consoleUploadsService.complete('key-split', init.id);
      const reviewed = await consoleUploadsService.review(init.id, { status: 'approved' });
      expect(reviewed.upload.status).toBe('ready');
      const slot = reviewed.upload.files[0];
      expect(slot?.splitAs).toMatch(/^split\//);
      expect(slot?.splitShards).toBeGreaterThan(0);
      const shard = consoleUploadsService.readSplitShard(init.id, 'Regular', '0.woff2');
      expect(shard.contentType).toBe('font/woff2');
      expect(shard.bytes.length).toBeGreaterThan(100);

      const cps = codePointsFromText('Hi文');
      const key = textSubsetKey(cps);
      const built = await consoleUploadsService.ensureTextSubset({
        uploadId: init.id,
        weight: 'Regular',
        textKey: key,
        codePoints: cps,
        family: 'split-test',
      });
      expect(built.shardCount).toBeGreaterThan(0);
      expect(built.rel).toContain(key);
      const tShard = consoleUploadsService.readTextSubsetShard(init.id, 'Regular', key, '0.woff2');
      expect(tShard.bytes.length).toBeGreaterThan(50);
    } finally {
      svc.rootDir = origRoot;
      if (prevOss === undefined) delete process.env.UPLOAD_OSS_SKIP;
      else process.env.UPLOAD_OSS_SKIP = prevOss;
      if (prevW === undefined) delete process.env.UPLOAD_WOFF2_SKIP;
      else process.env.UPLOAD_WOFF2_SKIP = prevW;
      if (prevS === undefined) delete process.env.UPLOAD_SPLIT_SKIP;
      else process.env.UPLOAD_SPLIT_SKIP = prevS;
      rmSync(upRoot, { recursive: true, force: true });
    }
  }, 180_000);
});
