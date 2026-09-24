#!/usr/bin/env node
/**
 * Register 淘宝买菜体 (Tbmct) into vault prod.db + pre-export license sync.
 * 2026-09-24 · run: docker exec fonts-vault node /app/register-maicai.js
 *
 * Part A: sync fonts.license / fonts.license_type for rows whose catalog value
 *         (data/fonts.json, ratified in HANDOFF §16/§17/§19) differs from DB.
 *         Without this the next export reverts the catalog (§19 warning).
 * Part B: insert exactly ONE new font row: wenfeng-tbmct 淘宝买菜体.
 *         license        = 淘宝买菜体授权协议   (§11 naming rule)
 *         license_type   = 免费商用             (tier)
 *         brand          = Alibaba Design (existing row, per albbpht)
 */
const { createClient } = require('@libsql/client');
const fs = require('fs');

const SYNC_JSON = '/app/maicai-license-sync.json';
const FONT = {
  normalized_name: 'Tbmct',
  name: '淘宝买菜体',
  english_name: 'TaoBaoMaiCaiTi',
  chinese_name: '淘宝买菜体',
  font_family: 'wenfeng-tbmct',
  original_name: 'Tbmct',
  weights: JSON.stringify({
    Regular: {
      font_family: 'wenfeng-tbmct',
      weight_name: 'Regular',
      font_weight: 400,
      versions: {
        original: {
          file: 'Regular.ttf',
          char_count: 7271,
          glyph_count: 7284,
          subfamily_name: 'Regular',
        },
      },
    },
  }),
  version: '1.0',
  copyright: 'Copyright © 淘宝（中国）软件有限公司.',
  description:
    '淘宝买菜携手通义锦书，倾力打造的一款独具匠心的AI个性化字体。覆盖GB2312标准，包含超过6974个汉字，通过智能AI技术赋予字体独特的质感和生命力。官方声明：现这款字体向所有个人和组织开放，永久免费商用。',
  designer: '淘宝买菜 × 通义锦书',
  foundry: 'Alibaba Design',
  release_year: 2024,
  font_category: '无衬线字体',
  category_id: '34a366d5-8fce-4372-9621-c77161d1947c',
  brand_id: 'fd8cac88-fce9-455e-86b6-40e6d6731add',
  tags: JSON.stringify(['免费商用', '阿里巴巴', 'AI生成', '黑体']),
  font_tags: JSON.stringify([]),
  languages: JSON.stringify(['简体中文', '英语']),
  use_cases: JSON.stringify(['标题', '电商设计', '品牌宣传', '广告海报']),
  license: '淘宝买菜体授权协议',
  license_type: '免费商用',
  license_description:
    '官方（fonts.alibabadesign.com / www.alibabafonts.com）声明原文摘录：「现这款字体向所有个人和组织开放，永久免费商用。这不仅是对创新精神的致敬，也是我们对普惠理念的坚持。」name 表内中文名为「淘宝买菜营销体」（nameID 9/16/19），官方产品名为「淘宝买菜体」。',
  oss_path: '/fonts-packages/Tbmct',
  status: 'published',
};

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });

  const before = await c.execute('select count(*) n from fonts');
  const n0 = Number(before.rows[0][0]);
  console.log('fonts rows before:', n0);

  // ---------- Part A: license sync ----------
  const sync = JSON.parse(fs.readFileSync(SYNC_JSON, 'utf8'));
  let synced = 0;
  for (const row of sync) {
    const sets = [];
    const args = [];
    if (row.license !== undefined) { sets.push('license=?'); args.push(row.license); }
    if (row.license_type !== undefined) { sets.push('license_type=?'); args.push(row.license_type); }
    if (!sets.length) continue;
    args.push(row.family);
    const r = await c.execute({
      sql: `update fonts set ${sets.join(', ')}, updated_at=strftime('%s','now') where font_family=?`,
      args,
    });
    if (r.rowsAffected !== 1) { console.error('sync miss', row.family, r.rowsAffected); process.exit(1); }
    synced++;
  }
  console.log('license synced rows:', synced);

  // ---------- Part B: insert Tbmct ----------
  const dup = await c.execute({
    sql: "select font_family, status from fonts where font_family=? or normalized_name=? or name=? or chinese_name=?",
    args: [FONT.font_family, FONT.normalized_name, '淘宝买菜体', '淘宝买菜营销体'],
  });
  if (dup.rows.length) {
    console.error('DUP FOUND — aborting insert:', JSON.stringify(dup.rows));
    process.exit(1);
  }
  const cols = Object.keys(FONT);
  await c.execute({
    sql: `insert into fonts (id, ${cols.join(', ')}, created_at, updated_at) values (?, ${cols.map(() => '?').join(', ')}, strftime('%s','now'), strftime('%s','now'))`,
    args: [require('crypto').randomUUID(), ...cols.map((k) => FONT[k])],
  });
  console.log('inserted', FONT.font_family);

  const after = await c.execute('select count(*) n from fonts');
  const n1 = Number(after.rows[0][0]);
  console.log('fonts rows after:', n1, '(delta', n1 - n0, ')');
  const chk = await c.execute({
    sql: 'select font_family, name, license, license_type, brand_id, status, oss_path from fonts where font_family=?',
    args: [FONT.font_family],
  });
  console.log('VERIFY:', JSON.stringify(chk.rows[0]));
  if (n1 - n0 !== 1 || synced !== sync.length) { console.error('COUNT MISMATCH'); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
