#!/usr/bin/env node
/**
 * Tighten hot-patched findByFontFamily / findByNormalizedName:
 * never fall back to archived rows (empty shells stay dark).
 */
const fs = require('fs');

const path = process.argv[2] || '/app/.next/server/chunks/src_lib_services_464f0b45._.js';
const bak = path + '.bak-pub-only';
if (!fs.existsSync(bak)) fs.copyFileSync(path, bak);

let s = fs.readFileSync(path, 'utf8');

const oldTail = 'const _pub=_rows.filter(_f=>"published"===_f.status);return _pub.length?_pub:_rows}';
const newTail = 'return _rows.filter(_f=>"published"===_f.status)}';

if (!s.includes(oldTail)) {
  if (s.includes(newTail)) {
    console.log('already pub-only');
    process.exit(0);
  }
  console.error('findByFontFamily tail needle missing');
  process.exit(2);
}
s = s.replace(oldTail, newTail);

// findByNormalizedName: after lookup, reject archived
const oldNormEnd =
  'return(await a.db.select().from(o.fonts).where(s.sql`lower(${o.fonts.normalizedName}) = ${e}`).limit(1))[0]}';
const newNormEnd =
  'const _r=(await a.db.select().from(o.fonts).where(s.sql`lower(${o.fonts.normalizedName}) = ${e}`).limit(1))[0];return _r&&"published"===_r.status?_r:void 0}';

if (s.includes(oldNormEnd)) {
  s = s.replace(oldNormEnd, newNormEnd);
} else if (!s.includes('return _r&&"published"===_r.status?_r:void 0}')) {
  console.error('findByNormalizedName end needle missing');
  process.exit(3);
}

fs.writeFileSync(path, s);
console.log('patched pub-only ok');
