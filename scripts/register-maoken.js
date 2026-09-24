#!/usr/bin/env node
/**
 * Register maoken batch (github.com/maoken-fonts) into vault prod.db.
 * 2026-09-24 · run: docker exec fonts-vault node /app/register-maoken.js
 *
 * 五条：械黑 Frexsans / 荆南麦圆 Jnmy / 猫啃硬笔楷书 Mkybkjs / 猫啃扛重族黑 Mkkzh / 猫啃扛重族宋 Mkkzs
 * 品牌：械黑计划 frex-sans（本脚本自建）；荆南字坊 jingnan、猫啃网 maoken 用现有行
 * 备份点：prod.db.bak-20260924-maoken
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');

const BRAND = {
  id: null, // 运行时生成或取现有
  name: '械黑计划 (Frex Sans Project)',
  slug: 'frex-sans',
  description: '修复 IBM Plex Sans SC 简中字形并补齐字重的开源字体计划，出品械黑（Frex Sans）。',
  website: 'https://github.com/maoken-fonts/frex-sans',
};

const BRAND_MAOKEN = '075a1a85-d192-4b78-94e5-e9d46c66b50c'; // 猫啃网 (Maoken)，同 Mksjh
const BRAND_JINGNAN = '2158e5d1-f18c-56ec-a586-1d56b7c4201a'; // 荆南字坊 (Kingnam Typography)，同 Jnymt
const CAT_SANS = '34a366d5-8fce-4372-9621-c77161d1947c'; // 无衬线字体
const CAT_SONG = 'f08be474-1b71-4a22-95cd-7a9963ba3dcd'; // 宋体
const CAT_HAND = 'e7413c1c-60db-4970-8007-43ca466034aa'; // 手写体

function weightsMap(family, list) {
  const out = {};
  for (const [num, name, chars, glyphs, sub] of list) {
    out[name] = {
      font_family: name === 'Regular' || name === 'Normal' ? family : `${family}-${name}`,
      weight_name: name,
      font_weight: num,
      versions: { original: { file: `${name}.ttf`, char_count: chars, glyph_count: glyphs, subfamily_name: sub } },
    };
  }
  return JSON.stringify(out);
}

const FONTS = [
  {
    normalized_name: 'Frexsans',
    name: '械黑', english_name: 'Frex Sans GB', chinese_name: '械黑',
    font_family: 'wenfeng-frexsans',
    weights: weightsMap('wenfeng-frexsans', [
      [100, 'Thin', 13056, 13114, 'Regular'], [200, 'ExtraLight', 13056, 13114, 'Regular'],
      [300, 'Light', 13056, 13114, 'Regular'], [400, 'Text', 13056, 13114, 'Regular'],
      [400, 'Regular', 13056, 13114, 'Regular'], [500, 'Medium', 13056, 13114, 'Regular'],
      [600, 'SemiBold', 13056, 13114, 'Bold'], [700, 'Bold', 13056, 13114, 'Bold'],
    ]),
    version: 'v1.100',
    copyright: 'Copyright © 2025 The Flex Sans GB Project Authors (https://gitee.com/NightFurySL2001/flex-sc). Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"',
    description: '修复 IBM Plex Sans SC 简中字形并补齐字重的开源黑体，保留 Plex 特有的油墨陷阱设计。本包为 GB 版，Thin 至 Bold 共 8 档字重，另有可变字体随上游发布。',
    designer: '械黑计划 Frex Sans Project',
    foundry: '械黑计划 (Frex Sans Project)',
    release_year: 2025,
    font_category: '无衬线字体', category_id: CAT_SANS, brand_id: 'FREX',
    tags: ['开源', 'OFL', '黑体'],
    use_cases: ['正文', '标题', '界面'],
  },
  {
    normalized_name: 'Jnmy',
    name: '荆南麦圆', english_name: 'KNMaiyuan', chinese_name: '荆南麦圆',
    font_family: 'wenfeng-jnmy',
    weights: weightsMap('wenfeng-jnmy', [[400, 'Regular', 17491, 17491, 'Regular']]),
    version: 'v1.20',
    copyright: 'Copyright 2020-2022 The Maiyuan Project Authors (https://github.com/NightFurySL2001/KNMaiyuan)',
    description: '荆南字坊出品的手写风格圆体，笔画圆润、重心平稳，覆盖一万七千余字，适合品牌标识与包装文案。',
    designer: '荆南字坊 Kingnam Type Foundry',
    foundry: '荆南字坊 (Kingnam Typography)',
    release_year: 2022,
    font_category: '手写体', category_id: CAT_HAND, brand_id: BRAND_JINGNAN,
    tags: ['开源', 'OFL', '手写', '圆体'],
    use_cases: ['品牌标识', '包装', '标题'],
  },
  {
    normalized_name: 'Mkybkjs',
    name: '猫啃硬笔楷书', english_name: 'Maoken YingBi KaiShu', chinese_name: '猫啃硬笔楷书',
    font_family: 'wenfeng-mkybkjs',
    weights: weightsMap('wenfeng-mkybkjs', [[400, 'Regular', 7638, 7672, 'Regular']]),
    version: '0.20',
    copyright: 'Copyright 2025 Luke036（https://github.com/scott0107000） and Contributors：ZERO子（https://github.com/Skr-ZERO）',
    description: '猫啃网社区出品的硬笔楷书，基于随峰体 Plus 改作，笔画硬朗利落，收录简体常用字七千余。',
    designer: 'Luke036 × ZERO子',
    foundry: '猫啃网 (Maoken)',
    release_year: 2025,
    font_category: '手写体', category_id: CAT_HAND, brand_id: BRAND_MAOKEN,
    tags: ['开源', 'OFL', '楷书'],
    use_cases: ['正文', '标题', '书刊'],
  },
  {
    normalized_name: 'Mkkzh',
    name: '猫啃扛重族黑', english_name: 'Maoken Heavy Labourer Gothic SC', chinese_name: '猫啃扛重族黑',
    font_family: 'wenfeng-mkkzh',
    weights: weightsMap('wenfeng-mkkzh', [[400, 'Regular', 11363, 11557, 'Regular']]),
    version: 'v1.001',
    copyright: '版权 2021 猫啃网，夜煞之乐 2001。基于 Source Han Sans CN Heavy（Copyright 2014-2021 Adobe）再制。',
    description: '基于思源黑体 Heavy 加重再制的超重展示黑体，猫啃网以 SIL OFL 1.1 重新发布，适合大号标题与海报。',
    designer: '夜煞之乐2001 (NightFurySL2001)',
    foundry: '猫啃网 (Maoken)',
    release_year: 2021,
    font_category: '无衬线字体', category_id: CAT_SANS, brand_id: BRAND_MAOKEN,
    tags: ['开源', 'OFL', '黑体', '标题'],
    use_cases: ['标题', '海报'],
  },
  {
    normalized_name: 'Mkkzs',
    name: '猫啃扛重族宋', english_name: 'Maoken Heavy Labourer Ming SC', chinese_name: '猫啃扛重族宋',
    font_family: 'wenfeng-mkkzs',
    weights: weightsMap('wenfeng-mkkzs', [[400, 'Regular', 11331, 11461, 'Regular']]),
    version: 'v1.001',
    copyright: '版权 2021 猫啃网，夜煞之乐 2001。基于 Source Han Serif CN Heavy（Copyright 2014-2021 Adobe）再制。',
    description: '基于思源宋体 Heavy 加重再制的超重展示宋体，与扛重族黑同族配套，适合大号标题与复古排版。',
    designer: '夜煞之乐2001 (NightFurySL2001)',
    foundry: '猫啃网 (Maoken)',
    release_year: 2021,
    font_category: '宋体', category_id: CAT_SONG, brand_id: BRAND_MAOKEN,
    tags: ['开源', 'OFL', '宋体', '标题'],
    use_cases: ['标题', '海报'],
  },
];

const LICENSE_DESC = (repo) =>
  `SIL Open Font License 1.1，原文随上游仓库携带（github.com/maoken-fonts/${repo}），已核对原文并抄录至 font-licenses 仓。`;

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const now = Math.floor(Date.now() / 1000);

  // brand: frex-sans（不存在则建）
  let frexId = null;
  const exBrand = await c.execute({ sql: 'select id from brands where slug=?', args: [BRAND.slug] });
  if (exBrand.rows.length) {
    frexId = exBrand.rows[0].id;
    console.log('brand exists', BRAND.slug, frexId);
  } else {
    frexId = randomUUID();
    await c.execute({
      sql: `insert into brands (id, name, slug, description, website, status, created_at, updated_at)
            values (?,?,?,?,?,?,?,?)`,
      args: [frexId, BRAND.name, BRAND.slug, BRAND.description, BRAND.website, 'published', now, now],
    });
    console.log('brand inserted', BRAND.slug, frexId);
  }

  let inserted = 0, skipped = 0, failed = 0;
  for (const f of FONTS) {
    const ex = await c.execute({
      sql: 'select font_family from fonts where font_family=? or normalized_name=?',
      args: [f.font_family, f.normalized_name],
    });
    if (ex.rows.length) { console.log('skip exists', f.font_family); skipped++; continue; }
    const brandId = f.brand_id === 'FREX' ? frexId : f.brand_id;
    try {
      await c.execute({
        sql: `insert into fonts (
          id, normalized_name, name, english_name, chinese_name, font_family, original_name,
          weights, version, copyright, description, designer, foundry, release_year,
          font_category, category_id, brand_id, tags, font_tags, languages, use_cases,
          license, license_type, license_description, oss_path,
          view_count, download_count, api_call_count, created_at, updated_at, status
        ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          randomUUID(), f.normalized_name, f.name, f.english_name, f.chinese_name, f.font_family, f.normalized_name,
          f.weights, f.version, f.copyright, f.description, f.designer, f.foundry, f.release_year,
          f.font_category, f.category_id, brandId,
          JSON.stringify(f.tags), JSON.stringify([]),
          JSON.stringify(['简体中文', '英语']), JSON.stringify(f.use_cases),
          'SIL Open Font License 1.1', '免费商用',
          LICENSE_DESC(f.normalized_name === 'Frexsans' ? 'frex-sans' : f.normalized_name === 'Jnmy' ? 'KNMaiyuan' : f.normalized_name === 'Mkybkjs' ? 'MaokenYingBiKaiShuJ' : 'maoken-heavy-labourer'),
          `/fonts-packages/${f.normalized_name}`,
          0, 0, 0, now, now, 'published',
        ],
      });
      console.log('inserted', f.font_family);
      inserted++;
    } catch (e) {
      console.error('fail', f.font_family, e.message || e);
      failed++;
    }
  }
  console.log(JSON.stringify({ inserted, skipped, failed }));
})().catch((e) => { console.error(e); process.exit(1); });
