import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { tryCompressToWoff2 } from '@/lib/upload-woff2';
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

describe('upload woff2', () => {
  it('compresses a real TTF when fixture exists', async () => {
    const fixture = findFixture();
    if (!fixture) return;
    const input = readFileSync(fixture);
    const out = await tryCompressToWoff2(input.slice(0, Math.min(input.length, 2_000_000)), 'fixture');
    // full file better
    const full = await tryCompressToWoff2(input, 'fixture-full');
    expect(full).not.toBeNull();
    expect(full!.length).toBeGreaterThan(100);
    expect(full!.length).toBeLessThan(input.length);
    void out;
  }, 60_000);

  it('review stores woff2As for TTF upload', async () => {
    const fixture = findFixture();
    if (!fixture) return;
    const upRoot = mkdtempSync(path.join(tmpdir(), 'woff2-up-'));
    const origRoot = (consoleUploadsService as unknown as { rootDir: () => string }).rootDir;
    (consoleUploadsService as unknown as { rootDir: () => string }).rootDir = () => upRoot;
    const prevOss = process.env.UPLOAD_OSS_SKIP;
    const prevW = process.env.UPLOAD_WOFF2_SKIP;
    process.env.UPLOAD_OSS_SKIP = '1';
    delete process.env.UPLOAD_WOFF2_SKIP;
    try {
      const bytes = readFileSync(fixture);
      const init = consoleUploadsService.init(
        'key-woff',
        {
          name: 'Woff Test',
          family: 'woff-test',
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
      consoleUploadsService.complete('key-woff', init.id);
      const reviewed = await consoleUploadsService.review(init.id, { status: 'approved' });
      expect(reviewed.upload.status).toBe('ready');
      const slot = reviewed.upload.files[0];
      expect(slot?.woff2As).toMatch(/\.woff2$/);
      const blob = consoleUploadsService.readReadyBlob(init.id, 'Regular');
      expect(blob.contentType).toBe('font/woff2');
      expect(blob.bytes.length).toBeGreaterThan(100);
    } finally {
      (consoleUploadsService as unknown as { rootDir: () => string }).rootDir = origRoot;
      if (prevOss === undefined) delete process.env.UPLOAD_OSS_SKIP;
      else process.env.UPLOAD_OSS_SKIP = prevOss;
      if (prevW === undefined) delete process.env.UPLOAD_WOFF2_SKIP;
      else process.env.UPLOAD_WOFF2_SKIP = prevW;
      rmSync(upRoot, { recursive: true, force: true });
    }
  }, 120_000);
});
