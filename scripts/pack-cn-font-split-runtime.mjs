#!/usr/bin/env node
/**
 * Bundle cn-font-split + runtime deps into ./split-runtime for Docker COPY.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const root = process.cwd();
const out = path.join(root, 'split-runtime');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const link = path.join(root, 'node_modules/cn-font-split');
if (!fs.existsSync(link)) {
  console.error('cn-font-split not installed');
  process.exit(1);
}
const realSplit = fs.realpathSync(link);
const splitPkg = path.join(realSplit, 'package.json');
const req = createRequire(splitPkg);
const rootReq = createRequire(path.join(root, 'package.json'));

const names = [
  'cn-font-split',
  'koffi',
  'google-protobuf',
  'buffer',
  'commander',
  'fs-extra',
  'set-value',
  'proto-to-cli',
  'ieee754',
  'base64-js',
  'universalify',
  'graceful-fs',
  'jsonfile',
  'inherits',
  'is-plain-object',
  'isobject',
];

function resolvePkg(name) {
  if (name === 'cn-font-split') return realSplit;
  for (const r of [req, rootReq]) {
    try {
      return path.dirname(r.resolve(name + '/package.json'));
    } catch {
      /* try next */
    }
  }
  const sibling = path.join(path.dirname(realSplit), name);
  if (fs.existsSync(path.join(sibling, 'package.json'))) return sibling;
  return null;
}

function copyPkg(name) {
  const src = resolvePkg(name);
  if (!src) {
    console.warn('[pack] skip missing', name);
    return;
  }
  const dest = path.join(out, name);
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  console.log('[pack]', name);
}

for (const n of names) copyPkg(n);

// Sanity: require from packed tree only (no project node_modules)
const probe = `
const Module = require('module');
const path = require('path');
const out = path.resolve(${JSON.stringify(out)});
process.env.NODE_PATH = out;
Module._initPaths();
const { fontSplit } = require('cn-font-split');
if (typeof fontSplit !== 'function') process.exit(2);
console.log('[pack] probe ok');
`;
fs.writeFileSync(path.join(out, '_probe.cjs'), probe);
import { spawnSync } from 'child_process';
const r = spawnSync(process.execPath, [path.join(out, '_probe.cjs')], {
  env: { ...process.env, NODE_PATH: out },
  encoding: 'utf8',
});
fs.rmSync(path.join(out, '_probe.cjs'), { force: true });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.status !== 0) {
  console.error('[pack] probe failed', r.status);
  process.exit(r.status || 1);
}
console.log('[pack] done →', out);
