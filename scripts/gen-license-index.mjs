#!/usr/bin/env node
/**
 * 从 font-licenses 仓生成 src/data/font-license-index.json（license-gate 的 overlay 真源）。
 * 用法：node scripts/gen-license-index.mjs [font-licenses 路径，默认 ~/Projects/font-licenses]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LIC = process.argv[2] || join(homedir(), 'Projects', 'font-licenses', 'licenses');
const FIELDS = ['type', 'spdx', 'licenseUrl', 'commercial', 'modification', 'distribution',
  'embedding', 'webUse', 'attribution', 'shareAlike', 'verified', 'source', 'notes'];
const out = {};
let n = 0;
for (const dir of readdirSync(LIC, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const p = join(LIC, dir.name, 'license-info.json');
  if (!existsSync(p)) continue;
  try {
    const info = JSON.parse(readFileSync(p, 'utf8'));
    const key = info.normalizedName || dir.name;
    out[key] = { normalizedName: key };
    for (const f of FIELDS) if (info[f] !== undefined) out[key][f] = info[f];
    n++;
  } catch { /* 坏 JSON 跳过并留名 */ out[dir.name] = { normalizedName: dir.name }; }
}
const dest = join(ROOT, 'src', 'data', 'font-license-index.json');
writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
console.log(`indexed ${n} -> ${dest}`);
