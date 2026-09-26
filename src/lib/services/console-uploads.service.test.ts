import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConsoleUploadsService } from '@/lib/services/console-uploads.service';

describe('ConsoleUploadsService', () => {
  it('init → putFile → complete stays processing until review', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-uploads-'));
    const svc = new ConsoleUploadsService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    const prevSkip = process.env.UPLOAD_OSS_SKIP;
    process.env.UPLOAD_OSS_SKIP = '1';
    process.env.UPLOAD_WOFF2_SKIP = '1';
    try {
      const init = svc.init(
        'key-a',
        {
          name: '测试体',
          family: 'custom-test',
          license: 'ofl',
          files: [{ filename: 'a.ttf', size: 12, weight: 'Regular' }],
        },
        'https://app.windfonts.com'
      );
      expect(init.id).toMatch(/^up-/);
      expect(init.uploadUrls).toHaveLength(1);
      const token = init.uploadUrls[0]?.headers?.['X-Upload-Token'] || '';
      expect(token).toBeTruthy();

      svc.putFile({
        uploadId: init.id,
        part: 'Regular',
        token,
        bytes: Buffer.from('font-bytes!!'),
      });

      const done = svc.complete('key-a', init.id);
      expect(done.status).toBe('processing');

      const queued = svc.get('key-a', init.id);
      expect(queued.status).toBe('processing');
      expect(queued.review.state).toBe('queued');

      const listed = svc.listAll({ status: 'queued' });
      expect(listed.some((r) => r.id === init.id)).toBe(true);

      const reviewed = await svc.review(init.id, { status: 'approved', reviewNote: 'ok' }, {
        email: 'ops@example.com',
      });
      expect(reviewed.upload.status).toBe('ready');
      expect(reviewed.upload.review.state).toBe('approved');
      expect(reviewed.ossPushed).toBe(false);

      const row = svc.get('key-a', init.id);
      expect(row.status).toBe('ready');
    } finally {
      if (prevSkip === undefined) delete process.env.UPLOAD_OSS_SKIP;
      else process.env.UPLOAD_OSS_SKIP = prevSkip;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reject leaves status rejected', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-uploads-rej-'));
    const svc = new ConsoleUploadsService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    process.env.UPLOAD_OSS_SKIP = '1';
    process.env.UPLOAD_WOFF2_SKIP = '1';
    try {
      const init = svc.init(
        'key-b',
        {
          name: '拒字体',
          family: 'reject-me',
          license: 'ofl',
          files: [{ filename: 'b.otf', size: 4, weight: 'Bold' }],
        },
        'https://app.windfonts.com'
      );
      const token = init.uploadUrls[0]?.headers?.['X-Upload-Token'] || '';
      svc.putFile({
        uploadId: init.id,
        part: 'Bold',
        token,
        bytes: Buffer.from('otf!'),
      });
      svc.complete('key-b', init.id);
      const reviewed = await svc.review(init.id, { status: 'rejected', reviewNote: '缺证明' });
      expect(reviewed.upload.status).toBe('rejected');
      expect(svc.get('key-b', init.id).status).toBe('rejected');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
