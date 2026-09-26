import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

/** 按文字子集：去重码点上限（防滥用 / 超长切包） */
export const MAX_TEXT_CODEPOINTS = 2000;
/** 原始 text 字段长度上限 */
export const MAX_TEXT_CHARS = 8000;

function ensureCnFontSplitBin(): void {
  if (process.env.CN_FONT_SPLIT_BIN && fs.existsSync(process.env.CN_FONT_SPLIT_BIN)) return;
  try {
    const pkg = path.dirname(require.resolve('cn-font-split/package.json'));
    const dist = path.join(pkg, 'dist');
    if (!fs.existsSync(dist)) return;
    const hit = fs.readdirSync(dist).find((n) => n.startsWith('libffi-'));
    if (hit) process.env.CN_FONT_SPLIT_BIN = path.join(dist, hit);
  } catch {
    /* optional */
  }
}

/**
 * 从正文抽出去重 Unicode 码点（跳过空白），升序。
 * 超限抛 validation_error。
 */
export function codePointsFromText(text: string): number[] {
  const raw = String(text || '');
  if (raw.length > MAX_TEXT_CHARS) {
    throw Object.assign(new Error(`按文字最多 ${MAX_TEXT_CHARS} 字符`), {
      status: 422,
      code: 'validation_error',
    });
  }
  const seen = new Set<number>();
  const out: number[] = [];
  for (const ch of raw) {
    if (/\s/u.test(ch)) continue;
    const cp = ch.codePointAt(0);
    if (cp === undefined || seen.has(cp)) continue;
    seen.add(cp);
    out.push(cp);
    if (out.length > MAX_TEXT_CODEPOINTS) {
      throw Object.assign(new Error(`按文字最多 ${MAX_TEXT_CODEPOINTS} 个不重复字符`), {
        status: 422,
        code: 'validation_error',
      });
    }
  }
  out.sort((a, b) => a - b);
  return out;
}

/** 稳定短哈希，用作 text-subset/{key}/ 目录名 */
export function textSubsetKey(codePoints: number[]): string {
  return createHash('sha256').update(codePoints.join(',')).digest('hex').slice(0, 16);
}

export type SplitResult = {
  outDir: string;
  cssFile: string;
  shardCount: number;
};

export type SplitFontOpts = {
  family: string;
  weightCss?: number;
  chunkKb?: number;
  /**
   * 按文字：仅保留这些码点（cn-font-split subsets + subsetRemainChars:false）。
   * 缺省走语言分区全切。
   */
  codePoints?: number[];
};

/**
 * Run cn-font-split into outDir. Writes result.css + N.woff2 shards.
 * Caller supplies a TTF/OTF buffer (not a single whole-font woff2).
 */
export async function splitFontToDir(
  input: Buffer,
  outDir: string,
  opts: SplitFontOpts
): Promise<SplitResult> {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(outDir)) {
    fs.rmSync(path.join(outDir, name), { recursive: true, force: true });
  }

  ensureCnFontSplitBin();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fontSplit } = require('cn-font-split') as {
    fontSplit: (options: Record<string, unknown>) => Promise<void>;
  };

  const chunkKb = opts.chunkKb && opts.chunkKb > 0 ? opts.chunkKb : 70;
  const weight = opts.weightCss && opts.weightCss > 0 ? String(opts.weightCss) : '400';
  const cps = Array.isArray(opts.codePoints) ? opts.codePoints.filter((n) => Number.isFinite(n)) : [];
  const textMode = cps.length > 0;

  await fontSplit({
    input,
    outDir,
    chunkSize: chunkKb * 1024,
    testHtml: false,
    reporter: false,
    languageAreas: !textMode,
    ...(textMode
      ? {
          subsets: [cps],
          subsetRemainChars: false,
        }
      : {}),
    renameOutputFont: '[index].[ext]',
    silent: true,
    css: {
      fontFamily: opts.family,
      localFamily: opts.family,
      fontWeight: weight,
      fontStyle: 'normal',
      fontDisplay: 'swap',
    },
  });

  const cssFile = path.join(outDir, 'result.css');
  if (!fs.existsSync(cssFile)) {
    throw new Error('cn-font-split 未生成 result.css');
  }
  const shardCount = fs
    .readdirSync(outDir)
    .filter((n) => /\.woff2$/i.test(n)).length;
  if (!shardCount) {
    throw new Error('cn-font-split 未生成 woff2 分片');
  }
  return { outDir, cssFile, shardCount };
}

export async function trySplitFontToDir(
  input: Buffer,
  outDir: string,
  opts: SplitFontOpts & { label?: string }
): Promise<SplitResult | null> {
  try {
    return await splitFontToDir(input, outDir, opts);
  } catch (error) {
    logger.warn('[trySplitFontToDir] skipped', {
      label: opts.label || outDir,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Rewrite cn-font-split result.css for project bake:
 * absolute shard URLs, drop local(), force family/display/weight.
 */
export function rewriteSplitCss(
  css: string,
  opts: {
    family: string;
    display: string;
    weightCss: number;
    shardBaseUrl: string;
    /** e.g. ?p=slug — appended after shard filename */
    urlQuery?: string;
  }
): string {
  let out = css;
  const q = opts.urlQuery || '';
  out = out.replace(
    /url\(\s*(['"]?)(?:\.\/)?([^)'"\s]+?\.(?:woff2|woff|ttf|otf))\1\s*\)/gi,
    (_m, _q, file: string) => {
      const name = String(file).split(/[\\/]/).pop() || file;
      const abs =
        `${opts.shardBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(name)}` + q;
      return `url(${JSON.stringify(abs)})`;
    }
  );
  out = out.replace(/src:\s*(?:local\([^)]*\)\s*,\s*)+/gi, 'src:');
  out = out.replace(/font-family:\s*[^;{]+;/gi, `font-family:${JSON.stringify(opts.family)};`);
  out = out.replace(/font-display:\s*[^;{]+;/gi, `font-display:${opts.display};`);
  out = out.replace(/font-weight:\s*[^;{]+;/gi, `font-weight:${opts.weightCss};`);
  return out;
}
