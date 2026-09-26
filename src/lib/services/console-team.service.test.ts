import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { consoleTeamService } from '@/lib/services/console-team.service';

describe('console-team.service', () => {
  let root: string;
  let orig: () => string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'team-'));
    orig = (consoleTeamService as unknown as { rootDir: () => string }).rootDir;
    (consoleTeamService as unknown as { rootDir: () => string }).rootDir = () => root;
  });

  afterEach(() => {
    (consoleTeamService as unknown as { rootDir: () => string }).rootDir = orig;
    rmSync(root, { recursive: true, force: true });
  });

  it('invite / setRole / remove', () => {
    const m = consoleTeamService.invite('key-a', { email: 'a@example.com', role: 'editor' });
    expect(m.email).toBe('a@example.com');
    expect(consoleTeamService.list('key-a').members).toHaveLength(1);
    const updated = consoleTeamService.setRole('key-a', m.id, 'viewer');
    expect(updated.role).toBe('viewer');
    expect(consoleTeamService.remove('key-a', m.id)).toEqual({ ok: true });
    expect(consoleTeamService.list('key-a').members).toHaveLength(0);
  });

  it('rejects duplicate and owner invite', () => {
    consoleTeamService.invite('key-b', { email: 'b@example.com' });
    expect(() => consoleTeamService.invite('key-b', { email: 'b@example.com' })).toThrow(/已在团队/);
    expect(() => consoleTeamService.invite('key-b', { email: 'c@example.com', role: 'owner' })).toThrow(
      /所有者/
    );
  });
});
