import { describe, expect, it } from 'vitest';
import { ProjectService } from '@/lib/services/project.service';
import type { ProjectManifest } from '@/lib/services/validation';

const base = (domains: string[]): ProjectManifest => ({
  slug: 'demo',
  version: 1,
  domains,
  fonts: [{ family: 'wenfeng-ibmps', weights: ['regular'], subset: 'full' }],
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
