import { createHash } from 'crypto';
import { and, eq, gte, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { apiKeys, apiUsageDaily } from '@/lib/db/schema';
import { consoleProjectService, type ConsoleProject } from '@/lib/services/console-project.service';

export type UsageRangeDays = 7 | 30 | 90;

export type UsageDayPoint = { day: string; requests: number; bytes: number };

export type UsageOverview = {
  totals: { requests: number; bytes: number; blocked: number; quotaGB: number };
  series: { from: string; to: string; requests: UsageDayPoint[] };
  byFont: unknown[];
  byDomain: Array<{
    key: string;
    label: string;
    requests: number;
    bytes: number;
    projectId?: string;
    projectName?: string;
  }>;
  status: { '200': number; '304': number; '403': number };
  groups: Array<{
    key: string;
    label: string;
    requests: number;
    bytes: number;
    hitRate: number;
  }>;
  perf: unknown[];
  /** 请求计数来自 api_usage_daily；字节/字体/状态码尚未采集 */
  dimensions: {
    requests: true;
    bytes: false;
    byFont: false;
    status: false;
  };
  stub: false;
};

function sha256Hex(value: string): string {
  return createHash('sha256').update(String(value || '').trim()).digest('hex');
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function normalizeHost(host: string): string {
  return String(host || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

/** 与 ProjectService.isHostAllowed 同口径的单规则匹配（不含「空名单放行」）。 */
export function hostMatchesRule(host: string, rule: string): boolean {
  const h = normalizeHost(host);
  const r = normalizeHost(rule);
  if (!h || !r) return false;
  if (r === h) return true;
  if (r.startsWith('*.')) {
    const suffix = r.slice(1); // .example.com
    return h.endsWith(suffix) && h !== r.slice(2);
  }
  return false;
}

export function findProjectForHost(
  projects: ConsoleProject[],
  host: string
): ConsoleProject | null {
  const h = normalizeHost(host);
  if (!h) return null;
  for (const p of projects) {
    for (const d of p.domains || []) {
      if (hostMatchesRule(h, d.host)) return p;
    }
  }
  return null;
}

export function emptySeries(from: Date, to: Date, range: number): UsageDayPoint[] {
  const series: UsageDayPoint[] = [];
  for (let i = 0; i < range; i += 1) {
    const d = new Date(from.getTime() + i * 864e5);
    series.push({ day: ymd(d), requests: 0, bytes: 0 });
  }
  // 修正末日本地时区漂移：用 to 对齐最后一天
  if (series.length) series[series.length - 1].day = ymd(to);
  return series;
}

export function buildUsageOverview(opts: {
  range: number;
  from: Date;
  to: Date;
  rows: Array<{ day: string; domain: string; count: number }>;
  projects: ConsoleProject[];
  projectId?: string;
}): UsageOverview {
  const { range, from, to, rows, projects, projectId } = opts;
  const scopedProjects = projectId
    ? projects.filter((p) => p.id === projectId)
    : projects;

  const dayMap = new Map<string, number>();
  const domainMap = new Map<string, number>();
  const projectReq = new Map<string, number>();

  for (const row of rows) {
    const host = normalizeHost(row.domain);
    const project = findProjectForHost(projects, host);
    // SQL 已按 Key / 白名单域名收窄；此处仅按 projectId 再滤一层
    if (projectId && (!project || project.id !== projectId)) continue;

    const n = Number(row.count) || 0;
    if (n <= 0) continue;
    dayMap.set(row.day, (dayMap.get(row.day) || 0) + n);
    if (host) domainMap.set(host, (domainMap.get(host) || 0) + n);
    if (project) {
      projectReq.set(project.id, (projectReq.get(project.id) || 0) + n);
    }
  }

  const series = emptySeries(from, to, range).map((p) => ({
    ...p,
    requests: dayMap.get(p.day) || 0,
  }));
  const requests = series.reduce((a, p) => a + p.requests, 0);

  const byDomain = Array.from(domainMap.entries())
    .map(([host, req]) => {
      const project = findProjectForHost(projects, host);
      return {
        key: host,
        label: host,
        requests: req,
        bytes: 0,
        projectId: project?.id,
        projectName: project?.name,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  const groups = (projectId ? scopedProjects : projects)
    .map((p) => ({
      key: p.id,
      label: p.name,
      requests: projectReq.get(p.id) || 0,
      bytes: 0,
      hitRate: 0,
    }))
    .sort((a, b) => b.requests - a.requests);

  return {
    totals: { requests, bytes: 0, blocked: 0, quotaGB: 200 },
    series: { from: ymd(from), to: ymd(to), requests: series },
    byFont: [],
    byDomain,
    status: { '200': requests, '304': 0, '403': 0 },
    groups,
    perf: [],
    dimensions: { requests: true, bytes: false, byFont: false, status: false },
    stub: false,
  };
}

async function resolveKeyId(apiKeyRaw: string): Promise<string | null> {
  const keyHash = sha256Hex(apiKeyRaw);
  if (!keyHash) return null;
  const row = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);
  return row[0]?.id ?? null;
}

function rangeWindow(rangeRaw: number): { range: number; from: Date; to: Date } {
  const range = Math.min(90, Math.max(1, Number(rangeRaw) || 30));
  const to = new Date();
  const from = new Date(to.getTime() - (range - 1) * 864e5);
  return { range, from, to };
}

class ConsoleUsageService {
  async overview(
    apiKeyRaw: string,
    params: { range?: number; projectId?: string } = {}
  ): Promise<UsageOverview> {
    const { range, from, to } = rangeWindow(params.range ?? 30);
    const projects = consoleProjectService.list(apiKeyRaw);
    const keyId = await resolveKeyId(apiKeyRaw);
    const hosts = new Set<string>();
    for (const p of projects) {
      for (const d of p.domains || []) {
        const h = normalizeHost(d.host);
        if (h) hosts.add(h);
      }
    }

    const dayFrom = ymd(from);
    const dayTo = ymd(to);
    const filters: SQL[] = [gte(apiUsageDaily.day, dayFrom), lte(apiUsageDaily.day, dayTo)];

    const scope: SQL[] = [];
    if (keyId) {
      scope.push(eq(apiUsageDaily.subject, keyId));
      scope.push(eq(apiUsageDaily.keyId, keyId));
    }
    // 精确域名；通配在内存二次过滤（行量可控）
    const exactHosts = Array.from(hosts).filter((h) => !h.startsWith('*.'));
    if (exactHosts.length) {
      scope.push(inArray(apiUsageDaily.domain, exactHosts));
    }
    const wildSuffixes = Array.from(hosts)
      .filter((h) => h.startsWith('*.'))
      .map((h) => h.slice(1)); // .example.com
    for (const suffix of wildSuffixes) {
      scope.push(sql`${apiUsageDaily.domain} like ${'%' + suffix}`);
    }

    if (!scope.length) {
      return buildUsageOverview({
        range,
        from,
        to,
        rows: [],
        projects,
        projectId: params.projectId,
      });
    }

    filters.push(or(...scope)!);

    const raw = await db
      .select({
        day: apiUsageDaily.day,
        domain: apiUsageDaily.domain,
        count: sql<number>`coalesce(sum(${apiUsageDaily.count}), 0)`,
      })
      .from(apiUsageDaily)
      .where(and(...filters))
      .groupBy(apiUsageDaily.day, apiUsageDaily.domain);

    const rows = raw.map((r) => ({
      day: String(r.day),
      domain: String(r.domain || ''),
      count: Number(r.count) || 0,
    }));

    return buildUsageOverview({
      range,
      from,
      to,
      rows,
      projects,
      projectId: params.projectId,
    });
  }

  async series(apiKeyRaw: string, params: { range?: number; projectId?: string } = {}) {
    const overview = await this.overview(apiKeyRaw, params);
    return {
      from: overview.series.from,
      to: overview.series.to,
      requests: overview.series.requests,
      stub: false as const,
    };
  }
}

export const consoleUsageService = new ConsoleUsageService();
