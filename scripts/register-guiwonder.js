#!/usr/bin/env node
/**
 * Register GuiWonder batch (github.com/GuiWonder) into vault prod.db.
 * 2026-09-24 · run: docker exec fonts-vault node /app/register-guiwonder.js
 *
 * 七条：尚古黑体 Sght / 尚古圆体 Sgyt / 尚古等宽 Sgdk / 合简黑体 Hjht /
 *       华英明朝 Hymc（传承体 Classic）/ 上元明朝 A Syma / 上元明朝 B Symb
 * 品牌：复用现有 guiwonder 行（6d4facbf，显示名「中文网字计划」），与尚古明体/月星楷同源
 * 备份点：prod.db.bak-20260924-guiwonder
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');

const BRAND_GUIWONDER = '6d4facbf-0fb7-4140-b51a-c896ff537e6c';
const CAT_SANS = '34a366d5-8fce-4372-9621-c77161d1947c';
const CAT_MONO = '5191ac94-e365-431a-bde2-dcfc24c14c16';
const CAT_SONG = 'f08be474-1b71-4a22-95cd-7a9963ba3dcd';

function weightsMap(family, list) {
  const out = {};
  for (const [num, name, chars, glyphs] of list) {
    out[name] = {
      font_family: name === 'Regular' || name === 'Normal' ? family : `${family}-${name}`,
      weight_name: name,
      font_weight: num,
      versions: { original: { file: `${name}.ttf`, char_count: chars, glyph_count: glyphs, subfamily_name: name } },
    };
  }
  return JSON.stringify(out);
}

const SG7 = (chars, glyphs) => [
  [200, 'ExtraLight', chars, glyphs], [300, 'Light', chars, glyphs], [400, 'Normal', chars, glyphs],
  [400, 'Regular', chars, glyphs], [500, 'Medium', chars, glyphs], [700, 'Bold', chars, glyphs],
  [900, 'Heavy', chars, glyphs],
];

const OFL = { license: 'SIL Open Font License 1.1', type: '免费商用' };

const FONTS = [
  {
    norm: 'Sght', family: 'wenfeng-sght', name: '尚古黑体', en: 'Shanggu Sans',
    weights: weightsMap('wenfeng-sght', SG7(44865, 47993)),
    version: '1.028', year: 2022, cat: CAT_SANS,
    copyright: 'Copyright 2022-2026 Shanggu Fonts.',
    desc: '基于思源黑体的传承字形（旧字形）改造，尙古系列的黑体面，七档字重，覆盖中日韩全字集。',
    tags: ['开源', 'OFL', '黑体', '传承字形'], use: ['正文', '标题', '界面'], ...OFL,
    licDesc: 'SIL OFL 1.1，原文随上游仓携带（github.com/GuiWonder/Shanggu LICENSE.txt），已核对并抄录至 font-licenses。',
  },
  {
    norm: 'Sgyt', family: 'wenfeng-sgyt', name: '尚古圆体', en: 'Shanggu Round',
    weights: weightsMap('wenfeng-sgyt', SG7(44865, 47993)),
    version: '1.028', year: 2022, cat: CAT_SANS,
    copyright: 'Copyright 2022-2026 Shanggu Fonts.',
    desc: '尙古系列的圆体面，同一套传承字形骨架的圆润处理，七档字重。',
    tags: ['开源', 'OFL', '圆体', '传承字形'], use: ['标题', '品牌标识'], ...OFL,
    licDesc: 'SIL OFL 1.1，原文随上游仓携带（github.com/GuiWonder/Shanggu LICENSE.txt），已核对并抄录至 font-licenses。',
  },
  {
    norm: 'Sgdk', family: 'wenfeng-sgdk', name: '尚古等宽', en: 'Shanggu Mono',
    weights: weightsMap('wenfeng-sgdk', SG7(44811, 47686)),
    version: '1.028', year: 2022, cat: CAT_MONO,
    copyright: 'Copyright 2022-2026 Shanggu Fonts.',
    desc: '尙古系列的等宽面，汉字与西文同宽排齐，另有斜体随上游发布，适合代码与对照排版。',
    tags: ['开源', 'OFL', '等宽', '传承字形'], use: ['代码', '正文'], ...OFL,
    licDesc: 'SIL OFL 1.1，原文随上游仓携带（github.com/GuiWonder/Shanggu LICENSE.txt），已核对并抄录至 font-licenses。',
  },
  {
    norm: 'Hjht', family: 'wenfeng-hjht', name: '合简黑体', en: 'HeSimpl Sans',
    weights: weightsMap('wenfeng-hjht', SG7(44875, 43175)),
    version: '1.007', year: 2022, cat: CAT_SANS,
    copyright: 'Copyright 2026 HeSimpl Fonts.',
    desc: '合简字体项目的黑体面，与库内合简宋体同门配套，七档字重。',
    tags: ['开源', 'OFL', '黑体'], use: ['正文', '标题'], ...OFL,
    licDesc: 'SIL OFL 1.1，原文随上游仓携带（github.com/GuiWonder/HeSimplFonts LICENSE.txt），已核对并抄录至 font-licenses。',
  },
  {
    norm: 'Hymc', family: 'wenfeng-hymc', name: '华英明朝', en: 'Huaying Mincho',
    weights: weightsMap('wenfeng-hymc', [[400, 'Regular', 59773, 65437]]),
    version: '1.017', year: 2022, cat: CAT_SONG,
    copyright: 'Copyright(c) HuayingMincho, 2022-2026. IPA Font License Agreement v1.0.',
    desc: '传承字形、旧字形风格明朝体，基于 IPAmj 明朝衍生，简体部分参考霞鹜新致宋制作，支持 IVD 异体选择器。本条目取传承体（Classic），另有旧印体、旧典体、繁体三个变体随上游发布。',
    tags: ['传承字形', '宋体', '旧字形'], use: ['书刊', '正文', '标题'],
    license: 'IPA Font License Agreement v1.0', type: '免费商用',
    licDesc: 'IPA Font License v1.0 全文随上游仓携带（github.com/GuiWonder/HuayingMincho LICENSE.txt），允许嵌入与再分发，分发须附条款，已核对并抄录至 font-licenses。',
  },
  {
    norm: 'Syma', family: 'wenfeng-syma', name: '上元明朝 A', en: 'LanternMing A',
    weights: weightsMap('wenfeng-syma', [[400, 'Regular', 65177, 65180]]),
    version: '1.04', year: 2023, cat: CAT_SONG,
    copyright: 'Copyright(c) LanternMing, 2023-2025.',
    desc: '覆盖 Unicode 17 全部 CJK 汉字的双卷字体之 A 卷（基本区与扩展 A/C/D/E/F/G/H），基于醍醐书体与花园明朝制作。',
    tags: ['旧字形', '宋体', '大字集'], use: ['书刊', '古籍排版'],
    license: 'GlyphWiki 著作权与许可协议', type: '免费商用',
    licDesc: '遵循 GlyphWiki 著作权与许可协议（与花园明朝同源同条款），出处见上游 README 授权节。',
  },
  {
    norm: 'Symb', family: 'wenfeng-symb', name: '上元明朝 B', en: 'LanternMing B',
    weights: weightsMap('wenfeng-symb', [[400, 'Regular', 48326, 48329]]),
    version: '1.04', year: 2023, cat: CAT_SONG,
    copyright: 'Copyright(c) LanternMing, 2023-2025.',
    desc: '上元明朝双卷之 B 卷（扩展 B/I/J 与兼容区），与 A 卷配合覆盖全部十万三千余汉字。',
    tags: ['旧字形', '宋体', '大字集'], use: ['书刊', '古籍排版'],
    license: 'GlyphWiki 著作权与许可协议', type: '免费商用',
    licDesc: '遵循 GlyphWiki 著作权与许可协议（与花园明朝同源同条款），出处见上游 README 授权节。',
  },
];

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const now = Math.floor(Date.now() / 1000);
  let inserted = 0, skipped = 0, failed = 0;
  for (const f of FONTS) {
    const ex = await c.execute({
      sql: 'select font_family from fonts where font_family=? or normalized_name=?',
      args: [f.family, f.norm],
    });
    if (ex.rows.length) { console.log('skip exists', f.family); skipped++; continue; }
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
          randomUUID(), f.norm, f.name, f.en, f.name, f.family, f.norm,
          f.weights, f.version, f.copyright, f.desc, 'GuiWonder', 'GuiWonder', f.year,
          f.cat === CAT_MONO ? 'Mono' : f.cat === CAT_SONG ? '宋体' : '无衬线字体',
          f.cat, BRAND_GUIWONDER,
          JSON.stringify(f.tags), JSON.stringify([]),
          JSON.stringify(['简体中文', '繁体中文', '英语']), JSON.stringify(f.use),
          f.license, f.type, f.licDesc, `/fonts-packages/${f.norm}`,
          0, 0, 0, now, now, 'published',
        ],
      });
      console.log('inserted', f.family);
      inserted++;
    } catch (e) {
      console.error('fail', f.family, e.message || e);
      failed++;
    }
  }
  console.log(JSON.stringify({ inserted, skipped, failed }));
})().catch((e) => { console.error(e); process.exit(1); });
