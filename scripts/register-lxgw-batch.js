#!/usr/bin/env node
/**
 * Register LXGW batch fonts into vault prod.db from lxgw-batch-map.json + local mapping.
 * Run: docker exec fonts-vault node /app/register-lxgw-batch.js
 * Expects /app/lxgw-batch-map.json and char counts passed via env CHAR_JSON or defaults.
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
const fs = require('fs');

const WEIGHT_NUM = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900,
  Heavy: 900,
  Italic: 400,
  LightItalic: 300,
  MediumItalic: 500,
  ExtraLightItalic: 200,
};

const BRAND = '51686ef7-69ef-4d5a-8bb2-e8b4aa93f97e';

(async () => {
  const map = JSON.parse(fs.readFileSync('/app/lxgw-batch-map.json', 'utf8'));
  const chars = process.env.CHAR_JSON
    ? JSON.parse(process.env.CHAR_JSON)
    : {};
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const now = Math.floor(Date.now() / 1000);
  let inserted = 0;
  let skipped = 0;

  for (const fam of map.families) {
    const ex = await c.execute({
      sql: 'select font_family from fonts where font_family=?',
      args: [fam.family],
    });
    if (ex.rows.length) {
      console.log('skip', fam.family);
      skipped++;
      continue;
    }
    const weights = {};
    for (const w of Object.keys(fam.files)) {
      const meta = (chars[fam.norm] && chars[fam.norm][w]) || {};
      weights[w] = {
        font_family: w === 'Regular' ? `wenfeng-${fam.norm}` : `wenfeng-${fam.norm}-${w}`,
        weight_name: w,
        font_weight: WEIGHT_NUM[w] || 400,
        versions: {
          original: {
            file: `${w}.ttf`,
            char_count: meta.chars || 20000,
            glyph_count: meta.glyphs || 20000,
            subfamily_name: 'Regular',
            typographic_subfamily: w === 'Regular' ? undefined : w,
          },
        },
      };
    }
    await c.execute({
      sql: `insert into fonts (
        id, normalized_name, name, english_name, chinese_name, font_family, original_name,
        weights, version, copyright, description, designer, foundry, release_year,
        font_category, category_id, brand_id, tags, font_tags, languages, use_cases,
        license, license_type, oss_path, view_count, download_count, api_call_count,
        created_at, updated_at, status
      ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        randomUUID(),
        fam.norm,
        fam.name,
        fam.en,
        fam.name,
        fam.family,
        fam.norm,
        JSON.stringify(weights),
        'LXGW ingest 2026-09-23',
        'Copyright LXGW',
        fam.desc,
        'LXGW',
        'LXGW',
        2021,
        fam.cat,
        fam.catId,
        BRAND,
        JSON.stringify(['开源', 'OFL', 'LXGW']),
        JSON.stringify([]),
        JSON.stringify(['简体中文', '繁体中文', '英语']),
        JSON.stringify(['正文', '标题', '屏幕阅读']),
        'SIL Open Font License 1.1',
        '免费商用',
        `/font-packages/${fam.norm}`,
        0,
        0,
        0,
        now,
        now,
        'published',
      ],
    });
    console.log('inserted', fam.family);
    inserted++;
  }
  console.log(JSON.stringify({ inserted, skipped }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
