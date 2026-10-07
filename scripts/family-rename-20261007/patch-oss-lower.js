#!/usr/bin/env node
/**
 * Hot-patch compiled CSSService.fetchOSSCSS to lowercase OSS dirs.
 * Production bucket only has lowercase fonts-packages/{norm}/...
 */
const fs = require('fs');

const path = process.argv[2] || '/app/.next/server/chunks/src_lib_eb2ebd0d._.js';
const needle = 'fonts-packages/${e.normalizedName}';
const repl = 'fonts-packages/${e.normalizedName.toLowerCase()}';
if (!fs.existsSync(path)) {
  console.error('missing', path);
  process.exit(2);
}
let s = fs.readFileSync(path, 'utf8');
if (s.includes(repl)) {
  console.log('already patched', path);
  process.exit(0);
}
const n = s.split(needle).length - 1;
if (n < 1) {
  console.error('needle not found', needle);
  process.exit(3);
}
const bak = path + '.bak-oss-lower-20261007';
if (!fs.existsSync(bak)) fs.copyFileSync(path, bak);
s = s.split(needle).join(repl);
fs.writeFileSync(path, s);
console.log('patched', path, 'replacements', n);
