import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConsoleUploadsService } from '@/lib/services/console-uploads.service';

describe('ConsoleUploadsService', () => {
  it('init → putFile → complete → ready', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'console-uploads-'));
    const svc = new ConsoleUploadsService();
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
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

      await new Promise((r) => setTimeout(r, 1000));
      const row = svc.get('key-a', init.id);
      expect(row.status).toBe('ready');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
