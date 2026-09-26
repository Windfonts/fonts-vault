import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConsoleFontCertsService } from '@/lib/services/console-font-certs.service';

describe('ConsoleFontCertsService', () => {
  it('create → approve → hasApprovedGrant', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'font-certs-'));
    const cwd = mkdtempSync(path.join(tmpdir(), 'font-certs-cwd-'));
    const prev = process.cwd();
    process.chdir(cwd);
    const svc = new ConsoleFontCertsService() as unknown as {
      rootDir: () => string;
      create: ConsoleFontCertsService['create'];
      review: ConsoleFontCertsService['review'];
      hasApprovedGrant: ConsoleFontCertsService['hasApprovedGrant'];
      listApprovedKeys: ConsoleFontCertsService['listApprovedKeys'];
      putFile: ConsoleFontCertsService['putFile'];
    };
    const orig = (ConsoleFontCertsService.prototype as unknown as { rootDir: () => string }).rootDir;
    (svc as unknown as { rootDir: () => string }).rootDir = () => root;
    // patch instance via prototype temporarily
    (ConsoleFontCertsService.prototype as unknown as { rootDir: () => string }).rootDir = () => root;
    try {
      const created = new ConsoleFontCertsService().create('wf_test_key_aaaaaaaaaaaaaaaaaaaaaa', {
        fontKey: 'Jlyhmht',
        name: '吉利银河美好体',
        fileName: 'license.pdf',
        fileSize: 12,
        mime: 'application/pdf',
      });
      expect(created.status).toBe('pending');
      expect(created.fontKey).toBe('jlyhmht');
      new ConsoleFontCertsService().putFile({
        apiKeyRaw: 'wf_test_key_aaaaaaaaaaaaaaaaaaaaaa',
        id: created.id,
        bytes: Buffer.from('%PDF-1.4 demo'),
        filename: 'license.pdf',
        contentType: 'application/pdf',
      });
      const reviewed = new ConsoleFontCertsService().review(created.id, { status: 'approved' });
      expect(reviewed.cert.status).toBe('approved');
      const svc2 = new ConsoleFontCertsService();
      expect(svc2.hasApprovedGrant('wf_test_key_aaaaaaaaaaaaaaaaaaaaaa', 'wenfeng-jlyhmht')).toBe(true);
      expect(svc2.hasApprovedGrant('wf_test_key_aaaaaaaaaaaaaaaaaaaaaa', 'shmgt')).toBe(false);
      expect(svc2.listApprovedKeys('wf_test_key_aaaaaaaaaaaaaaaaaaaaaa')).toContain('jlyhmht');
    } finally {
      (ConsoleFontCertsService.prototype as unknown as { rootDir: () => string }).rootDir = orig;
      process.chdir(prev);
      rmSync(root, { recursive: true, force: true });
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
