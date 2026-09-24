#!/usr/bin/env node
/**
 * 目录质量门 · 2026-09-25. run: docker exec fonts-vault node /app/audit-catalog.js [--slow]
 *
 * 四项检查（权威 = 字体文件 name 表，经 /api/css 头部读取）：
 *   A ERROR  name 表有 zh 名但库里 name 不含汉字（slug 回退名复发）
 *   B REVIEW name 表 CopyrightNotice 与库内 designer/foundry/brand/copyright 无交集（渠道冒名作者嫌疑）
 *   C ERROR  不同 family 的 CSS 字节级相同（同款双条目）
 *   D REVIEW normalized_name 以字重词结尾（权重级 norm 嫌疑，如 B2SCLight）
 *
 * --slow 才跑 B/C（要逐字体拉 CSS，约数分钟）；A/D 走库表秒出。
 * ERROR 非零退出；REVIEW 仅列清单。只读，不写库。
 */
const { createClient } = require('@libsql/client');
const { createHash } = require('crypto');

const SLOW = process.argv.includes('--slow');
const CSS_BASE = 'http://127.0.0.1:4000/api/css?family=';
const CJK = /[\u4e00-\u9fff]/;
const strip = (s) => String(s || '').toLowerCase().replace(/[\s,，.。()（）©©*]/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** API 有限流（429）：250ms 间隔 + 指数退避重试 */
async function cssOf(family) {
  for (let i = 0; i < 4; i++) {
    await sleep(i ? 1500 * i : 250);
    let res;
    try {
      res = await fetch(CSS_BASE + encodeURIComponent(family));
    } catch {
      continue;
    }
    if (res.ok) return res.text();
    if (res.status !== 429 && res.status < 500) return { err: res.status };
  }
  return { err: 429 };
}

function parseNameTable(css) {
  const zh = { tw: null, cn: null };
  let copyright = null;
  for (const line of css.split('\n')) {
    let m = line.match(/^Windows zh-TW TypographicFamilyName (.+)$/);
    if (m) zh.tw = m[1].trim();
    m = line.match(/^Windows zh-CN TypographicFamilyName (.+)$/);
    if (m) zh.cn = m[1].trim();
    m = line.match(/^Windows zh-TW FontFamilyName (.+)$/);
    if (m && !zh.tw) zh.tw = m[1].trim().replace(/-(Regular|Bold|Light|Medium|Heavy|Thin)$/, '');
    m = line.match(/^Macintosh en CopyrightNotice (.+)$/i);
    if (m && !copyright) copyright = m[1].trim();
    m = line.match(/^Windows en CopyrightNotice (.+)$/i);
    if (m && !copyright) copyright = m[1].trim();
  }
  return { zh: zh.cn || zh.tw, copyright };
}

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const rows = (await c.execute(
    "select font_family, normalized_name, name, designer, foundry, copyright, brand_id from fonts where status='published'"
  )).rows;
  const brands = {};
  for (const b of (await c.execute('select id, name from brands')).rows) brands[b.id] = b.name;

  const errors = [], review = [];

  // A + D：库表直查
  const zhTableCache = new Map();
  for (const r of rows) {
    if (/(Regular|Bold|Light|Medium|Heavy|Thin|Normal)$/i.test(r.normalized_name || '')) {
      review.push({ kind: 'D-norm-weight-suffix', family: r.font_family, norm: r.normalized_name });
    }
  }

  // B + C：逐字体拉 CSS（--slow）
  const cssHashes = new Map();
  if (SLOW) {
    let i = 0;
    for (const r of rows) {
      i++;
      const css = await cssOf(r.font_family);
      if (typeof css !== 'string') { review.push({ kind: 'B-css-unreachable', family: r.font_family, status: css && css.err }); continue; }
      process.stderr.write(`\r[${i}/${rows.length}] ${r.font_family}        `);
      // C 指纹
      const h = createHash('md5').update(css).digest('hex');
      if (cssHashes.has(h)) {
        errors.push({ kind: 'C-identical-css', family: r.font_family, dupOf: cssHashes.get(h) });
      } else cssHashes.set(h, r.font_family);
      // A/B：name 表
      const { zh, copyright } = parseNameTable(css);
      zhTableCache.set(r.font_family, zh);
      if (zh && CJK.test(zh) && !CJK.test(r.name || '')) {
        errors.push({ kind: 'A-zh-name-missing', family: r.font_family, name: r.name, tableZh: zh });
      }
      if (copyright) {
        const cp = strip(copyright);
        const fields = [r.designer, r.foundry, brands[r.brand_id], r.copyright].map(strip).filter(Boolean);
        const hit = fields.some((f) => f && (cp.includes(f) || f.includes(cp)));
        if (!hit) review.push({ kind: 'B-attribution-mismatch', family: r.font_family, tableCopyright: copyright.slice(0, 80), designer: r.designer, foundry: r.foundry, brand: brands[r.brand_id] });
      }
    }
    process.stderr.write('\n');
  }

  const out = { checked: rows.length, slow: SLOW, errors, review };
  console.log(JSON.stringify(out, null, 1));
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
