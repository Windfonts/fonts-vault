import { describe, expect, it } from 'vitest';
import {
  buildUsageOverview,
  findProjectForHost,
  hostMatchesRule,
  normalizeHost,
} from '@/lib/services/console-usage.service';
import type { ConsoleProject } from '@/lib/services/console-project.service';

const project = (partial: Partial<ConsoleProject> & Pick<ConsoleProject, 'id' | 'name'>): ConsoleProject => ({
  slug: partial.slug || partial.id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  fonts: [],
  domains: partial.domains || [],
  versions: [],
  ...partial,
});

describe('console-usage host matching', () => {
  it('normalizes port', () => {
    expect(normalizeHost('Example.COM:443')).toBe('example.com');
  });

  it('matches exact and wildcard', () => {
    expect(hostMatchesRule('blog.xizhiyu.com', 'blog.xizhiyu.com')).toBe(true);
    expect(hostMatchesRule('a.cdn.example.com', '*.cdn.example.com')).toBe(true);
    expect(hostMatchesRule('cdn.example.com', '*.cdn.example.com')).toBe(false);
    expect(hostMatchesRule('other.com', 'example.com')).toBe(false);
  });

  it('finds owning project', () => {
    const projects = [
      project({
        id: 'p1',
        name: 'A',
        domains: [{ host: 'blog.xizhiyu.com', verified: true, method: 'dns' }],
      }),
      project({
        id: 'p2',
        name: 'B',
        domains: [{ host: '*.erikline.top', verified: false, method: 'dns' }],
      }),
    ];
    expect(findProjectForHost(projects, 'blog.xizhiyu.com')?.id).toBe('p1');
    expect(findProjectForHost(projects, 'bead.erikline.top')?.id).toBe('p2');
    expect(findProjectForHost(projects, 'unknown.com')).toBeNull();
  });
});

describe('buildUsageOverview', () => {
  it('aggregates by day / domain / project', () => {
    const projects = [
      project({
        id: 'p1',
        name: '站点',
        domains: [{ host: 'blog.xizhiyu.com', verified: true, method: 'dns' }],
      }),
    ];
    const from = new Date('2026-09-20T12:00:00.000Z');
    const to = new Date('2026-09-22T12:00:00.000Z');
    const out = buildUsageOverview({
      range: 3,
      from,
      to,
      projects,
      rows: [
        { day: '2026-09-20', domain: 'blog.xizhiyu.com', count: 10 },
        { day: '2026-09-21', domain: 'blog.xizhiyu.com', count: 5 },
        { day: '2026-09-21', domain: 'evil.com', count: 100 },
        { day: '2026-09-22', domain: 'unknown', count: 3 },
      ],
    });
    expect(out.stub).toBe(false);
    // SQL 层已收窄；overview 汇总全部传入行（含未归属域名）
    expect(out.totals.requests).toBe(118);
    expect(out.byDomain.find((d) => d.key === 'blog.xizhiyu.com')?.requests).toBe(15);
    expect(out.groups[0]?.requests).toBe(15);
    expect(out.dimensions.bytes).toBe(false);
    expect(out.byFont).toEqual([]);
  });

  it('filters by projectId', () => {
    const projects = [
      project({
        id: 'p1',
        name: 'A',
        domains: [{ host: 'a.example', verified: true, method: 'dns' }],
      }),
      project({
        id: 'p2',
        name: 'B',
        domains: [{ host: 'b.example', verified: true, method: 'dns' }],
      }),
    ];
    const from = new Date('2026-09-20T12:00:00.000Z');
    const to = new Date('2026-09-20T12:00:00.000Z');
    const out = buildUsageOverview({
      range: 1,
      from,
      to,
      projects,
      projectId: 'p1',
      rows: [
        { day: '2026-09-20', domain: 'a.example', count: 9 },
        { day: '2026-09-20', domain: 'b.example', count: 4 },
      ],
    });
    expect(out.totals.requests).toBe(9);
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0]?.key).toBe('p1');
  });
});
