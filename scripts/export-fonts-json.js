#!/usr/bin/env node
/**
 * Export published fonts from vault DB into fonts-front data/fonts.json shape (stdout).
 * Usage (on host with scp of result): docker exec ... node export > fonts.json
 */
const { createClient } = require('@libsql/client');

function weightKeys(weights) {
  const w = typeof weights === 'string' ? JSON.parse(weights || '{}') : weights || {};
  return Object.keys(w);
}

function maxChars(weights) {
  const w = typeof weights === 'string' ? JSON.parse(weights || '{}') : weights || {};
  let chars = 0;
  let glyphs = 0;
  for (const v of Object.values(w)) {
    if (!v || typeof v !== 'object') continue;
    const vers = v.versions || { _: v };
    for (const meta of Object.values(vers)) {
      if (meta && meta.char_count) chars = Math.max(chars, meta.char_count | 0);
      if (meta && meta.glyph_count) glyphs = Math.max(glyphs, meta.glyph_count | 0);
    }
  }
  return { chars, glyphs };
}

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const r = await c.execute({
    sql: `select id, font_family, normalized_name, name, english_name, chinese_name,
          designer, foundry, version, copyright, description, license, license_type,
          tags, languages, use_cases, release_year, category, weights, view_count,
          brand_id, status
          from fonts where status=? order by name collate nocase`,
    args: ['published'],
  });

  // brand map
  const brands = await c.execute('select id, name, slug, logo_url, website, description from brands');
  const brandById = {};
  for (const b of brands.rows) brandById[b.id] = b;

  const out = [];
  for (const row of r.rows) {
    const { chars, glyphs } = maxChars(row.weights);
    const brand = row.brand_id ? brandById[row.brand_id] : null;
    const item = {
      id: row.id,
      name: row.name || row.chinese_name || row.english_name,
      en: row.english_name || '',
      family: row.font_family,
      normalized: row.normalized_name,
      designer: row.designer || '',
      designerShort: (row.designer || '').split(/[;,，]/)[0].trim() || '—',
      category: row.category || '',
      tags: (() => {
        try {
          const t = typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : row.tags || [];
          return Array.isArray(t) ? t : [];
        } catch {
          return [];
        }
      })(),
      weights: weightKeys(row.weights),
      description: row.description || '',
      // license = 档位（免费商用/联系授权/…），供 licenseTier()；协议原文进 licenseName
      license: row.license_type || '待核实',
      licenseName: row.license || row.license_type || '',
      licenseUrl: '',
      licenseFileUrl: '',
      licenseNotes: row.license_description || '',
      licenseVerified: false,
      purchaseUrl: null,
      copyright: row.copyright || '',
      foundry: row.foundry || '',
      brand: brand
        ? {
            name: brand.name,
            slug: brand.slug,
            logoUrl: brand.logo_url || '',
            avatarUrl: '',
            website: brand.website || '',
            description: brand.description || '',
          }
        : null,
      releaseYear: row.release_year || null,
      version: row.version || '',
      languages: (() => {
        try {
          const t =
            typeof row.languages === 'string' ? JSON.parse(row.languages || '[]') : row.languages || [];
          return Array.isArray(t) ? t : [];
        } catch {
          return [];
        }
      })(),
      useCases: (() => {
        try {
          const t =
            typeof row.use_cases === 'string' ? JSON.parse(row.use_cases || '[]') : row.use_cases || [];
          return Array.isArray(t) ? t : [];
        } catch {
          return [];
        }
      })(),
      charCount: chars,
      glyphCount: glyphs,
      viewCount: row.view_count || 0,
    };
    out.push(item);
  }
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  console.error('exported', out.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
