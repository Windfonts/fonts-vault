import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export type SplitResult = {
  outDir: string;
  cssFile: string;
  shardCount: number;
};

/**
 * Run cn-font-split into outDir. Writes result.css + N.woff2 shards.
 * Caller supplies a TTF/OTF buffer (not a single whole-font woff2).
 */
export async function splitFontToDir(
  input: Buffer,
  outDir: string,
  opts: { family: string; weightCss?: number; chunkKb?: number }
): Promise<SplitResult> {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(outDir)) {
    fs.rmSync(path.join(outDir, name), { recursive: true, force: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fontSplit } = require('cn-font-split') as {
    fontSplit: (options: Record<string, unknown>) => Promise<void>;
  };

  const chunkKb = opts.chunkKb && opts.chunkKb > 0 ? opts.chunkKb : 70;
  const weight = opts.weightCss && opts.weightCss > 0 ? String(opts.weightCss) : '400';

  await fontSplit({
    input,
    outDir,
    chunkSize: chunkKb * 1024,
    testHtml: false,
    reporter: false,
    languageAreas: true,
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
  opts: { family: string; weightCss?: number; label?: string; chunkKb?: number }
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
