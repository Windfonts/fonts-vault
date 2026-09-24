#!/usr/bin/env node
/**
 * Register OSS batch1 fonts into vault prod.db from oss-batch1-map.json.
 * Copy map + this script into container /app then:
 *   docker exec fonts-vault node /app/register-oss-batch1.js
 * Optional CHAR_JSON='{"Hcdzt":{"Regular":{"chars":123}}}'
 * Optional WAVE=chilltype
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
const fs = require('fs');

const WEIGHT_NUM = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  DemiLight: 350,
  Regular: 400,
  Normal: 400,
  Medium: 500,
  Demi: 600,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Ultra: 800,
  Black: 900,
  Heavy: 900,
};

(async () => {
  const mapPath = fs.existsSync('/app/oss-batch1-map.json')
    ? '/app/oss-batch1-map.json'
    : process.argv[2] || 'oss-batch1-map.json';
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const chars = process.env.CHAR_JSON ? JSON.parse(process.env.CHAR_JSON) : {};
  const wave = process.env.WAVE || '';
  const only = process.env.ONLY
    ? new Set(process.env.ONLY.split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const now = Math.floor(Date.now() / 1000);
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const fam of map.families) {
    if (fam.skip) continue;
    if (wave && fam.wave !== wave) continue;
    if (only && !only.has(fam.norm) && !only.has(fam.family)) continue;

    const ex = await c.execute({
      sql: 'select font_family from fonts where font_family=? or normalized_name=?',
      args: [fam.family, fam.norm],
    });
    if (ex.rows.length) {
      console.log('skip exists', fam.family);
      skipped++;
      continue;
    }

    const brandId = map.brands[fam.brand];
    if (!brandId) {
      console.error('missing brand', fam.brand, fam.family);
      failed++;
      continue;
    }
    const cat = map.categories[fam.cat] || map.categories.other;

    // Discover weights from CHAR_JSON or default Regular
    const metaWeights = chars[fam.norm] || {};
    let weightNames = Object.keys(metaWeights);
    if (!weightNames.length) weightNames = ['Regular'];

    const weights = {};
    for (const w of weightNames) {
      const meta = metaWeights[w] || {};
      weights[w] = {
        font_family: w === 'Regular' || w === 'Normal' ? fam.family : `${fam.family}-${w}`,
        weight_name: w,
        font_weight: WEIGHT_NUM[w] || 400,
        versions: {
          original: {
            file: `${w}.ttf`,
            char_count: meta.chars || 10000,
            glyph_count: meta.glyphs || meta.chars || 10000,
            subfamily_name: w === 'Regular' || w === 'Normal' ? 'Regular' : w,
          },
        },
      };
    }

    try {
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
          'OSS ingest batch1 2026-09-23',
          `Copyright ${fam.designer || fam.foundry || fam.brand}`,
          fam.desc || '',
          fam.designer || fam.foundry || '',
          fam.foundry || fam.designer || '',
          2024,
          cat.name,
          cat.id,
          brandId,
          JSON.stringify(['开源', 'OFL', fam.wave || fam.brand]),
          JSON.stringify([]),
          JSON.stringify(['简体中文', '繁体中文', '英语']),
          JSON.stringify(['正文', '标题', '屏幕阅读']),
          fam.license || 'SIL Open Font License 1.1',
          '免费商用',
          `/fonts-packages/${fam.norm}`,
          0,
          0,
          0,
          now,
          now,
          'published',
        ],
      });
      console.log('inserted', fam.family, weightNames.join(','));
      inserted++;
    } catch (e) {
      console.error('fail', fam.family, e.message || e);
      failed++;
    }
  }
  console.log(JSON.stringify({ inserted, skipped, failed }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
