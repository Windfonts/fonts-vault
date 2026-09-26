#!/usr/bin/env node
/**
 * Bundle cn-font-split + runtime deps into ./split-runtime for Docker COPY.
 * Also ensures the native libffi binary exists (alpine often lacks curl / misdetects musl).
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';

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
const host = process.env.CN_FONT_SPLIT_GH_HOST || 'https://ik.imagekit.io/github';

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
      /* next */
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
  fs.cpSync(src, path.join(out, name), { recursive: true, dereference: true });
  console.log('[pack]', name);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} → ${res.statusCode}`));
          res.resume();
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', reject);
  });
}

function detectTargets() {
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  // Prefer musl on alpine; also try gnu as fallback
  const isLinux = process.platform === 'linux';
  if (!isLinux) {
    if (process.platform === 'darwin') {
      return [`${arch}-apple-darwin`];
    }
    return [];
  }
  let musl = false;
  try {
    musl = fs.readFileSync('/usr/bin/ldd', 'utf8').includes('musl');
  } catch {
    /* */
  }
  if (!musl && fs.existsSync('/etc/alpine-release')) musl = true;
  if (musl) return [`${arch}-unknown-linux-musl`, `${arch}-unknown-linux-gnu`];
  return [`${arch}-unknown-linux-gnu`, `${arch}-unknown-linux-musl`];
}

async function ensureNativeBin(splitRoot) {
  const dist = path.join(splitRoot, 'dist');
  const existing = fs.readdirSync(dist).filter((n) => n.startsWith('libffi-'));
  const wantMusl = fs.existsSync('/etc/alpine-release');
  if (existing.length) {
    const preferred = wantMusl
      ? existing.find((n) => n.includes('musl')) || null
      : existing.find((n) => !n.includes('musl')) || existing[0];
    if (preferred) {
      console.log('[pack] native already', preferred);
      return path.join(dist, preferred);
    }
    console.log('[pack] have', existing.join(','), 'but need musl — will download');
  }
  // version folder under dist/version or package
  let ver = '';
  const verFile = path.join(dist, 'version');
  if (fs.existsSync(verFile)) {
    ver = fs.readFileSync(verFile, 'utf8').trim();
    if (ver.includes('@')) ver = ver.split('@').pop() || ver;
  }
  if (!ver) {
    try {
      ver = JSON.parse(fs.readFileSync(path.join(splitRoot, 'package.json'), 'utf8')).version;
    } catch {
      ver = '7.6.8';
    }
  }
  // npm package 7.4.3 often ships with newer ffi releases — try a few
  const versions = [ver, '7.6.8', '7.6.7', '7.4.3'].filter(
    (v, i, a) => v && a.indexOf(v) === i
  );
  const targets = detectTargets();
  for (const v of versions) {
    for (const target of targets) {
      const name = `libffi-${target}.so`;
      // darwin uses .dylib
      const file =
        target.includes('darwin') ? `libffi-${target}.dylib` : name;
      const url = `${host}/KonghaYao/cn-font-split/releases/download/${v}/${file}`;
      const dest = path.join(dist, file);
      try {
        console.log('[pack] download', url);
        await download(url, dest);
        if (fs.statSync(dest).size < 1000) {
          fs.unlinkSync(dest);
          continue;
        }
        console.log('[pack] native ok', file, fs.statSync(dest).size);
        return dest;
      } catch (e) {
        console.warn('[pack] download fail', file, e.message || e);
        try {
          fs.unlinkSync(dest);
        } catch {
          /* */
        }
      }
    }
  }
  throw new Error('failed to download cn-font-split native binary');
}

for (const n of names) copyPkg(n);

const packedSplit = path.join(out, 'cn-font-split');
await ensureNativeBin(packedSplit);
// also ensure source tree has it for local probe resolution
await ensureNativeBin(realSplit);

const bin = fs
  .readdirSync(path.join(packedSplit, 'dist'))
  .find((n) => n.startsWith('libffi-'));
const binPath = path.join(packedSplit, 'dist', bin);

const probe = `
const Module = require('module');
const path = require('path');
const out = path.resolve(${JSON.stringify(out)});
process.env.NODE_PATH = out;
process.env.CN_FONT_SPLIT_BIN = ${JSON.stringify(binPath)};
Module._initPaths();
const { fontSplit } = require('cn-font-split');
if (typeof fontSplit !== 'function') process.exit(2);
console.log('[pack] probe ok', process.env.CN_FONT_SPLIT_BIN);
`;
fs.writeFileSync(path.join(out, '_probe.cjs'), probe);
const r = spawnSync(process.execPath, [path.join(out, '_probe.cjs')], {
  env: { ...process.env, NODE_PATH: out, CN_FONT_SPLIT_BIN: binPath },
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
