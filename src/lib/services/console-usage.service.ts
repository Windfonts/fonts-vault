import { createHash } from 'crypto';
import { and, eq, gte, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { apiKeys, apiUsageDaily, apiUsageDelivery } from '@/lib/db/schema';
import { consoleProjectService, type ConsoleProject } from '@/lib/services/console-project.service';

export type UsageDayPoint = { day: string; requests: number; bytes: number };

export type UsageByFontRow = {
  fontId: string;
  family: string;
  requests30d: number;
  bytes30d: number;
  weights: Record<string, number>;
  projects: Array<{ projectId: string; name: string; requests30d: number; bytes30d: number }>;
};

export type UsageOverview = {
  totals: { requests: number; bytes: number; blocked: number; quotaGB: number };
  series: { from: string; to: string; requests: UsageDayPoint[] };
  byFont: UsageByFontRow[];
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
  dimensions: {
    requests: true;
    bytes: boolean;
    byFont: boolean;
    status: boolean;
  };
  stub: false;
};

type DeliveryRow = {
  day: string;
  domain: string;
  family: string;
  weight: string;
  status: string;
  count: number;
  bytes: number;
};
type LegacyRow = { day: string; domain: string; count: number };

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

export function hostMatchesRule(host: string, rule: string): boolean {
  const h = normalizeHost(host);
  const r = normalizeHost(rule);
  if (!h || !r) return false;
  if (r === h) return true;
  if (r.startsWith('*.')) {
    const suffix = r.slice(1);
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
  if (series.length) series[series.length - 1].day = ymd(to);
  return series;
}

export function buildUsageOverview(opts: {
  range: number;
  from: Date;
  to: Date;
  deliveryRows: DeliveryRow[];
  legacyRows: LegacyRow[];
  projects: ConsoleProject[];
  projectId?: string;
}): UsageOverview {
  const { range, from, to, deliveryRows, legacyRows, projects, projectId } = opts;
  const useDelivery = deliveryRows.length > 0;

  const dayReq = new Map<string, number>();
  const dayBytes = new Map<string, number>();
  const domainReq = new Map<string, number>();
  const domainBytes = new Map<string, number>();
  const projectReq = new Map<string, number>();
  const projectBytes = new Map<string, number>();
  const projectHit = new Map<string, { ok: number; cached: number }>();
  const statusCounts = { '200': 0, '304': 0, '403': 0 };
  const fontAgg = new Map<
    string,
    {
      requests: number;
      bytes: number;
      weights: Record<string, number>;
      byProject: Map<string, { requests: number; bytes: number }>;
    }
  >();

  const consume = (
    day: string,
    domain: string,
    count: number,
    bytes: number,
    family?: string,
    weight?: string,
    status?: string
  ) => {
    const host = normalizeHost(domain);
    const project = findProjectForHost(projects, host);
    if (projectId && (!project || project.id !== projectId)) return;
    const n = Number(count) || 0;
    const b = Number(bytes) || 0;
    if (n <= 0 && b <= 0) return;
    dayReq.set(day, (dayReq.get(day) || 0) + n);
    dayBytes.set(day, (dayBytes.get(day) || 0) + b);
    if (host) {
      domainReq.set(host, (domainReq.get(host) || 0) + n);
      domainBytes.set(host, (domainBytes.get(host) || 0) + b);
    }
    if (project) {
      projectReq.set(project.id, (projectReq.get(project.id) || 0) + n);
      projectBytes.set(project.id, (projectBytes.get(project.id) || 0) + b);
    }
    const st = String(status || '');
    if (st === '200' || st === '304' || st === '403') {
      statusCounts[st] += n;
      if (project && (st === '200' || st === '304')) {
        const hit = projectHit.get(project.id) || { ok: 0, cached: 0 };
        if (st === '200') hit.ok += n;
        else hit.cached += n;
        projectHit.set(project.id, hit);
      }
    }
    if (family) {
      const fam = family.toLowerCase();
      let row = fontAgg.get(fam);
      if (!row) {
        row = { requests: 0, bytes: 0, weights: {}, byProject: new Map() };
        fontAgg.set(fam, row);
      }
      row.requests += n;
      row.bytes += b;
      const w = String(weight || 'regular').toLowerCase() || 'regular';
      row.weights[w] = (row.weights[w] || 0) + n;
      if (project) {
        const pr = row.byProject.get(project.id) || { requests: 0, bytes: 0 };
        pr.requests += n;
        pr.bytes += b;
        row.byProject.set(project.id, pr);
      }
    }
  };

  if (useDelivery) {
    for (const row of deliveryRows) {
      consume(row.day, row.domain, row.count, row.bytes, row.family, row.weight, row.status);
    }
  } else {
    for (const row of legacyRows) {
      consume(row.day, row.domain, row.count, 0);
    }
  }

  const series = emptySeries(from, to, range).map((p) => ({
    ...p,
    requests: dayReq.get(p.day) || 0,
    bytes: dayBytes.get(p.day) || 0,
  }));
  const requests = series.reduce((a, p) => a + p.requests, 0);
  const bytes = series.reduce((a, p) => a + p.bytes, 0);

  const byDomain = Array.from(domainReq.entries())
    .map(([host, req]) => {
      const project = findProjectForHost(projects, host);
      return {
        key: host,
        label: host,
        requests: req,
        bytes: domainBytes.get(host) || 0,
        projectId: project?.id,
        projectName: project?.name,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  const groups = (projectId ? projects.filter((p) => p.id === projectId) : projects)
    .map((p) => {
      const hit = projectHit.get(p.id) || { ok: 0, cached: 0 };
      const denom = hit.ok + hit.cached;
      return {
        key: p.id,
        label: p.name,
        requests: projectReq.get(p.id) || 0,
        bytes: projectBytes.get(p.id) || 0,
        hitRate: denom ? hit.cached / denom : 0,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const byFont: UsageByFontRow[] = Array.from(fontAgg.entries())
    .map(([family, agg]) => ({
      fontId: family,
      family,
      requests30d: agg.requests,
      bytes30d: agg.bytes,
      weights: agg.weights,
      projects: Array.from(agg.byProject.entries()).map(([pid, v]) => ({
        projectId: pid,
        name: projectName.get(pid) || pid,
        requests30d: v.requests,
        bytes30d: v.bytes,
      })),
    }))
    .sort((a, b) => b.requests30d - a.requests30d);

  const statusLive = useDelivery;
  const status = statusLive
    ? statusCounts
    : { '200': requests, '304': 0, '403': 0 };

  return {
    totals: { requests, bytes, blocked: 0, quotaGB: 200 },
    series: { from: ymd(from), to: ymd(to), requests: series },
    byFont,
    byDomain,
    status,
    groups,
    perf: [],
    dimensions: {
      requests: true,
      bytes: useDelivery,
      byFont: useDelivery,
      status: statusLive,
    },
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

function buildScope(keyId: string | null, hosts: Set<string>, table: 'daily' | 'delivery'): SQL[] {
  const scope: SQL[] = [];
  const dayCol = table === 'daily' ? apiUsageDaily : apiUsageDelivery;
  if (keyId) {
    scope.push(eq(dayCol.subject, keyId));
    scope.push(eq(dayCol.keyId, keyId));
  }
  const exactHosts = Array.from(hosts).filter((h) => !h.startsWith('*.'));
  if (exactHosts.length) {
    scope.push(inArray(dayCol.domain, exactHosts));
  }
  const wildSuffixes = Array.from(hosts)
    .filter((h) => h.startsWith('*.'))
    .map((h) => h.slice(1));
  for (const suffix of wildSuffixes) {
    scope.push(sql`${dayCol.domain} like ${'%' + suffix}`);
  }
  return scope;
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
    const empty = buildUsageOverview({
      range,
      from,
      to,
      deliveryRows: [],
      legacyRows: [],
      projects,
      projectId: params.projectId,
    });

    const deliveryScope = buildScope(keyId, hosts, 'delivery');
    if (!deliveryScope.length) return empty;

    const deliveryFilters: SQL[] = [
      gte(apiUsageDelivery.day, dayFrom),
      lte(apiUsageDelivery.day, dayTo),
      or(...deliveryScope)!,
    ];

    const deliveryRaw = await db
      .select({
        day: apiUsageDelivery.day,
        domain: apiUsageDelivery.domain,
        family: apiUsageDelivery.family,
        weight: apiUsageDelivery.weight,
        status: apiUsageDelivery.status,
        count: sql<number>`coalesce(sum(${apiUsageDelivery.count}), 0)`,
        bytes: sql<number>`coalesce(sum(${apiUsageDelivery.bytes}), 0)`,
      })
      .from(apiUsageDelivery)
      .where(and(...deliveryFilters))
      .groupBy(
        apiUsageDelivery.day,
        apiUsageDelivery.domain,
        apiUsageDelivery.family,
        apiUsageDelivery.weight,
        apiUsageDelivery.status
      );

    const deliveryRows: DeliveryRow[] = deliveryRaw.map((r) => ({
      day: String(r.day),
      domain: String(r.domain || ''),
      family: String(r.family || ''),
      weight: String(r.weight || 'regular'),
      status: String(r.status || '200'),
      count: Number(r.count) || 0,
      bytes: Number(r.bytes) || 0,
    }));

    let legacyRows: LegacyRow[] = [];
    if (!deliveryRows.length) {
      const legacyScope = buildScope(keyId, hosts, 'daily');
      if (legacyScope.length) {
        const legacyRaw = await db
          .select({
            day: apiUsageDaily.day,
            domain: apiUsageDaily.domain,
            count: sql<number>`coalesce(sum(${apiUsageDaily.count}), 0)`,
          })
          .from(apiUsageDaily)
          .where(
            and(gte(apiUsageDaily.day, dayFrom), lte(apiUsageDaily.day, dayTo), or(...legacyScope)!)
          )
          .groupBy(apiUsageDaily.day, apiUsageDaily.domain);
        legacyRows = legacyRaw.map((r) => ({
          day: String(r.day),
          domain: String(r.domain || ''),
          count: Number(r.count) || 0,
        }));
      }
    }

    return buildUsageOverview({
      range,
      from,
      to,
      deliveryRows,
      legacyRows,
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
