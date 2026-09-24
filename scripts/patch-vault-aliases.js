#!/usr/bin/env node
/**
 * Hot-patch fonts-vault findByFontFamily / findByNormalizedName
 * to honor /app/data/family-aliases.json (dedup A-group).
 *
 * Usage (inside container):
 *   node scripts/patch-vault-aliases.js [/path/to/chunk.js]
 */
const fs = require('fs');

const path = process.argv[2] || '/app/.next/server/chunks/src_lib_services_464f0b45._.js';
const bak = path + '.bak-dedup-a';
if (!fs.existsSync(bak)) fs.copyFileSync(path, bak);

let s = fs.readFileSync(path, 'utf8');

const oldFam =
  'async findByFontFamily(t){let e=t.trim().toLowerCase();return await a.db.select().from(o.fonts).where(s.sql`lower(${o.fonts.fontFamily}) = ${e}`)}';

const newFam =
  'async findByFontFamily(t){let e=t.trim().toLowerCase();try{const _fs=require("fs"),_j=JSON.parse(_fs.readFileSync("/app/data/family-aliases.json","utf8")),_A=_j.aliases||{};if(_A[e])e=_A[e];else{const _k=e.replace(/^wenfeng-/,"");if(_A[_k])e=_A[_k];else if(_A["wenfeng-"+_k])e=_A["wenfeng-"+_k]}}catch(_e){}let _rows=await a.db.select().from(o.fonts).where(s.sql`lower(${o.fonts.fontFamily}) = ${e}`);if(!_rows.length&&!e.startsWith("wenfeng-")){_rows=await a.db.select().from(o.fonts).where(s.sql`lower(${o.fonts.fontFamily}) = ${"wenfeng-"+e}`)}const _pub=_rows.filter(_f=>"published"===_f.status);return _pub.length?_pub:_rows}';

const oldNorm =
  'async findByNormalizedName(t){let e=t.trim().toLowerCase();return(await a.db.select().from(o.fonts).where(s.sql`lower(${o.fonts.normalizedName}) = ${e}`).limit(1))[0]}';

const newNorm =
  'async findByNormalizedName(t){let e=t.trim().toLowerCase();try{const _fs=require("fs"),_j=JSON.parse(_fs.readFileSync("/app/data/family-aliases.json","utf8")),_A=_j.aliases||{};if(_A[e])e=_A[e];else{const _k=e.replace(/^wenfeng-/,"");if(_A[_k])e=_A[_k];else if(_A["wenfeng-"+_k])e=_A["wenfeng-"+_k]}}catch(_e){}if(e.startsWith("wenfeng-")){const _by=await this.findByFontFamily(e);if(_by&&_by[0])return _by[0];e=e.slice(8)}return(await a.db.select().from(o.fonts).where(s.sql`lower(${o.fonts.normalizedName}) = ${e}`).limit(1))[0]}';

if (s.includes('family-aliases.json') && s.includes('findByFontFamily(t){let e=t.trim().toLowerCase();try{')) {
  console.log('already patched');
  process.exit(0);
}

if (!s.includes(oldFam)) {
  console.error('findByFontFamily needle not found');
  process.exit(2);
}
if (!s.includes(oldNorm)) {
  console.error('findByNormalizedName needle not found');
  process.exit(3);
}

s = s.replace(oldFam, newFam).replace(oldNorm, newNorm);
fs.writeFileSync(path, s);
console.log('patched ok:', path);
console.log('aliases marker:', s.includes('family-aliases.json'));
