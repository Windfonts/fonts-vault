import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ProjectService } from '@/lib/services/project.service';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import type { ProjectManifest } from '@/lib/services/validation';

const base = (domains: string[]): ProjectManifest => ({
  slug: 'demo',
  version: 1,
  domains,
  fonts: [{ family: 'wenfeng-ibmps', weights: ['regular'], subset: 'full', source: 'catalog' }],
});

describe('ProjectService.isHostAllowed', () => {
  const svc = new ProjectService();

  it('allows all when domains empty', () => {
    expect(svc.isHostAllowed(base([]), 'evil.example')).toBe(true);
  });

  it('always allows localhost', () => {
    expect(svc.isHostAllowed(base(['example.com']), 'localhost')).toBe(true);
    expect(svc.isHostAllowed(base(['example.com']), '127.0.0.1')).toBe(true);
  });

  it('matches exact and wildcard', () => {
    const m = base(['example.com', '*.cdn.example.com']);
    expect(svc.isHostAllowed(m, 'example.com')).toBe(true);
    expect(svc.isHostAllowed(m, 'a.cdn.example.com')).toBe(true);
    expect(svc.isHostAllowed(m, 'cdn.example.com')).toBe(false);
    expect(svc.isHostAllowed(m, 'other.com')).toBe(false);
  });
});

describe('ProjectService.bakeUploadFaces', () => {
  it('emits @font-face pointing at /api/uploads/.../files?p=', async () => {
    const upRoot = mkdtempSync(path.join(tmpdir(), 'console-up-'));
    const svc = new ProjectService();
    process.env.UPLOAD_OSS_SKIP = '1';
    process.env.UPLOAD_WOFF2_SKIP = '1';
    process.env.UPLOAD_SPLIT_SKIP = '1';
    process.env.NEXTAUTH_URL = 'https://app.windfonts.com';

    const origRoot = (consoleUploadsService as unknown as { rootDir: () => string }).rootDir;
    (consoleUploadsService as unknown as { rootDir: () => string }).rootDir = () => upRoot;

    try {
      const init = consoleUploadsService.init(
        'key-proj',
        {
          name: '项目自有体',
          family: 'my-custom',
          license: 'ofl',
          files: [{ filename: 'a.ttf', size: 12, weight: 'Regular' }],
        },
        'https://app.windfonts.com'
      );
      const token = init.uploadUrls[0]?.headers?.['X-Upload-Token'] || '';
      consoleUploadsService.putFile({
        uploadId: init.id,
        part: 'Regular',
        token,
        bytes: Buffer.from('font-bytes!!'),
      });
      consoleUploadsService.complete('key-proj', init.id);
      await consoleUploadsService.review(init.id, { status: 'approved' });

      const manifest: ProjectManifest = {
        slug: 'acme',
        version: 1,
        domains: [],
        display: 'swap',
        fonts: [
          {
            family: 'my-custom',
            weights: ['400'],
            subset: 'full',
            source: 'upload',
            uploadId: init.id,
          },
        ],
      };

      const { css } = await svc.bakeCss(manifest);
      expect(css).toContain('@font-face');
      expect(css).toContain('my-custom');
      expect(css).toContain(`/api/uploads/${init.id}/files/Regular?p=acme`);
      expect(css).toContain('font-weight:400');
      expect(svc.projectUsesUpload(manifest, init.id)).toBe(true);
    } finally {
      (consoleUploadsService as unknown as { rootDir: () => string }).rootDir = origRoot;
      rmSync(upRoot, { recursive: true, force: true });
    }
  });

  it('bakes text subset shards with t= query when fixture exists', async () => {
    const fixtureCandidates = [
      path.join(
        process.env.HOME || '',
        'Projects/fonts-packages/_upstream-src/RocknRollOne-Regular.ttf'
      ),
      '/System/Library/Fonts/Supplemental/Arial.ttf',
    ];
    const fixture = fixtureCandidates.find((p) => p && existsSync(p));
    if (!fixture) return;

    const upRoot = mkdtempSync(path.join(tmpdir(), 'console-up-text-'));
    const svc = new ProjectService();
    process.env.UPLOAD_OSS_SKIP = '1';
    process.env.UPLOAD_WOFF2_SKIP = '1';
    process.env.UPLOAD_SPLIT_SKIP = '1';
    process.env.NEXTAUTH_URL = 'https://app.windfonts.com';

    const origRoot = (consoleUploadsService as unknown as { rootDir: () => string }).rootDir;
    (consoleUploadsService as unknown as { rootDir: () => string }).rootDir = () => upRoot;

    try {
      const bytes = readFileSync(fixture);
      const init = consoleUploadsService.init(
        'key-text',
        {
          name: 'Text Subset',
          family: 'text-face',
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
      consoleUploadsService.complete('key-text', init.id);
      await consoleUploadsService.review(init.id, { status: 'approved' });

      const manifest: ProjectManifest = {
        slug: 'texty',
        version: 1,
        domains: [],
        display: 'swap',
        fonts: [
          {
            family: 'text-face',
            weights: ['Regular'],
            subset: 'full',
            source: 'upload',
            uploadId: init.id,
            text: 'Hi文风',
          },
        ],
      };

      const { css } = await svc.bakeCss(manifest);
      expect(css).toContain('@font-face');
      expect(css).toContain('text-face');
      expect(css).toMatch(/\/shards\/[^"'?\s]+\.woff2\?p=texty&t=[a-f0-9]+/i);
      expect(css).toContain(' · text');
    } finally {
      (consoleUploadsService as unknown as { rootDir: () => string }).rootDir = origRoot;
      rmSync(upRoot, { recursive: true, force: true });
    }
  }, 180_000);
});
