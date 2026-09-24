#!/usr/bin/env node
/**
 * 1) Keep intentional dedupe archives (+ opposansb)
 * 2) Restore false-empty archives that have CDN packages; patch weights.file
 * 3) Apply P0 metadata fixes
 *
 * Usage: node /app/data/apply-audit-restore.js
 */
const { createClient } = require('@libsql/client');
const https = require('https');

const KEEP_ARCHIVED = new Set([
  'wenfeng-hxbsbt',
  'wenfeng-hzpyt',
  'wenfeng-kslmt',
  'wenfeng-myrbsxt',
  'wenfeng-qtqmt',
  'wenfeng-huxiaobokuhei',
  'wenfeng-happyzcool2016',
  'wenfeng-pmzdcst60',
  'wenfeng-opposansb', // empty shell → opsa
]);

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (r) => resolve(r.statusCode || 0));
    req.on('error', () => resolve(0));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(0);
    });
    req.end();
  });
}

function ensureWeightFiles(weights, family, norm) {
  const w = typeof weights === 'string' ? JSON.parse(weights || '{}') : weights || {};
  const keys = Object.keys(w);
  if (!keys.length) {
    w.Regular = {
      font_family: `wenfeng-${norm}`,
      weight_name: 'Regular',
      font_weight: 400,
      versions: {
        original: {
          file: 'Regular.ttf',
          char_count: 1,
          glyph_count: 1,
          subfamily_name: 'Regular',
        },
      },
    };
    return w;
  }
  for (const [wk, meta] of Object.entries(w)) {
    if (!meta || typeof meta !== 'object') continue;
    const vers = meta.versions || { original: meta };
    if (!meta.versions) {
      meta.versions = { original: { ...meta } };
    }
    for (const [vk, v] of Object.entries(meta.versions)) {
      if (!v || typeof v !== 'object') continue;
      if (!v.file) v.file = `${wk}.ttf`;
      if (!v.char_count || v.char_count === 0) v.char_count = 1;
      if (!v.glyph_count || v.glyph_count === 0) v.glyph_count = 1;
    }
    if (!meta.weight_name) meta.weight_name = wk;
    if (!meta.font_weight) meta.font_weight = 400;
    if (!meta.font_family) meta.font_family = `wenfeng-${norm}-${wk}`;
  }
  return w;
}

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });

  // P0-3 Bold
  const albb = await c.execute({
    sql: 'select weights from fonts where font_family=?',
    args: ['wenfeng-albbpht'],
  });
  if (albb.rows[0]) {
    const w =
      typeof albb.rows[0].weights === 'string'
        ? JSON.parse(albb.rows[0].weights)
        : albb.rows[0].weights || {};
    if (!w.Bold) {
      const chars = w.Regular?.versions?.original?.char_count || 28937;
      const glyphs = w.Regular?.versions?.original?.glyph_count || 28987;
      w.Bold = {
        font_family: 'wenfeng-Albbpht-Bold',
        weight_name: 'Bold',
        font_weight: 700,
        versions: {
          original: {
            file: 'Bold.ttf',
            char_count: chars,
            glyph_count: glyphs,
            subfamily_name: 'Bold',
            typographic_subfamily: 'Bold',
          },
        },
      };
      await c.execute({
        sql: 'update fonts set weights=? where font_family=?',
        args: [JSON.stringify(w), 'wenfeng-albbpht'],
      });
      console.log('P0-3 albbpht Bold added');
    }
  }

  // P0-2 stfytz
  await c.execute({
    sql: `update fonts set name=?, english_name=?, chinese_name=?, designer=?, foundry=?, description=? where font_family=?`,
    args: [
      '书体坊颜体',
      'Shutifang Yanti',
      '书体坊颜体',
      '书体坊',
      'SCF / 书体坊',
      '书体坊颜体（颜体楷书繁体）是书体坊（SCF）于2008年发布的繁体楷书。字体内部 Windows 名为「颜体楷书繁体 / 书体坊颜体」，英文名曾误登记为单字母 w。',
      'wenfeng-stfytz',
    ],
  });
  console.log('P0-2 stfytz renamed');

  // P0-1 systcnl labels (path unchanged)
  await c.execute({
    sql: `update fonts set name=?, english_name=?, chinese_name=?, description=? where font_family=?`,
    args: [
      '思源宋体 CN Light',
      'Source Han Serif CN Light',
      '思源宋体 CN Light',
      '思源宋体 CN 的 Light 字重（Source Han Serif CN Light）。短码 wenfeng-systcnl；历史 family wenfeng-light 经别名指向本条。CDN 路径暂为 fonts-packages/Light/Systcn/（normalizedName=Light，字重键=Systcn），待 OSS 迁移后改为 Systcnl/Light。',
      'wenfeng-systcnl',
    ],
  });
  console.log('P0-1 systcnl labels');

  // Restore false empties
  const archived = await c.execute({
    sql: 'select id, font_family, normalized_name, name, weights from fonts where status=?',
    args: ['archived'],
  });
  let restored = 0;
  let skipped = 0;
  for (const row of archived.rows) {
    if (KEEP_ARCHIVED.has(row.font_family)) {
      skipped++;
      continue;
    }
    const norm = row.normalized_name || '';
    // prefer Regular, else first key
    let w = ensureWeightFiles(row.weights, row.font_family, norm);
    const wkeys = Object.keys(w);
    let ok = false;
    for (const wk of wkeys) {
      const st = await head(
        `https://cn.windfonts.com/fonts-packages/${norm}/${wk}/full/result.css`
      );
      if (st === 200 || st === 206) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      for (const wk of ['Regular', 'Normal', 'Bold', 'Light', 'Medium', 'Systcn']) {
        const st = await head(
          `https://cn.windfonts.com/fonts-packages/${norm}/${wk}/full/result.css`
        );
        if (st === 200 || st === 206) {
          if (!w[wk]) {
            w[wk] = {
              font_family: `wenfeng-${norm}-${wk}`,
              weight_name: wk,
              font_weight: 400,
              versions: {
                original: {
                  file: `${wk}.ttf`,
                  char_count: 1,
                  glyph_count: 1,
                  subfamily_name: wk,
                },
              },
            };
          }
          ok = true;
          break;
        }
      }
    }
    if (!ok) {
      console.log('skip no CDN', row.font_family, norm);
      continue;
    }
    await c.execute({
      sql: `update fonts set status='published', weights=? where font_family=?`,
      args: [JSON.stringify(w), row.font_family],
    });
    restored++;
    console.log('restored', row.font_family, norm);
  }

  // LXGW polish
  for (const fam of [
    'wenfeng-xwmh',
    'wenfeng-xwxxh',
    'wenfeng-xwxzs',
    'wenfeng-yozai',
    'wenfeng-xiaolaisc',
    'wenfeng-xiaolaimonosc',
  ]) {
    await c.execute({
      sql: `update fonts set designer=?, foundry=? where font_family=?`,
      args: ['LXGW', 'LXGW', fam],
    });
  }
  await c.execute({
    sql: `update fonts set name=?, english_name=?, chinese_name=?, description=? where font_family=?`,
    args: [
      '悠哉字体',
      'Yozai',
      '悠哉字体',
      '悠哉字体（Yozai）由 LXGW 基于 Y.OzVox 数据整理发布，SIL OFL 1.1。圆润亲和，适合标题与轻松阅读。',
      'wenfeng-yozai',
    ],
  });
  await c.execute({
    sql: `update fonts set name=?, english_name=?, chinese_name=?, description=? where font_family=?`,
    args: [
      '小赖字体 SC',
      'Xiaolai SC',
      '小赖字体 SC',
      '小赖字体 SC（Xiaolai SC）由 LXGW 整理，源自瀬戸のぞみ「小赖字体」简体版，SIL OFL。',
      'wenfeng-xiaolaisc',
    ],
  });
  await c.execute({
    sql: `update fonts set name=?, english_name=?, chinese_name=?, description=? where font_family=?`,
    args: [
      '小赖字体等宽 SC',
      'Xiaolai Mono SC',
      '小赖字体等宽 SC',
      '小赖字体等宽 SC（Xiaolai Mono SC）为小赖字体的等宽版本，由 LXGW 整理发布。',
      'wenfeng-xiaolaimonosc',
    ],
  });

  // sypscn correct identity (not Clear Han)
  await c.execute({
    sql: `update fonts set name=?, english_name=?, chinese_name=?, designer=?, foundry=?, description=? where font_family=?`,
    args: [
      '思源屏显臻宋 CN',
      'Source Han Serif CN for Display',
      '思源屏显臻宋 CN',
      'Adobe',
      'Adobe',
      '思源屏显臻宋 CN（Source Han Serif CN for Display）为 Adobe 思源宋体系列的屏显/展示取向裁剪，与「屏显臻宋 / Clear Han Serif」(pxzs) 不是同一套字体。',
      'wenfeng-sypscn',
    ],
  });

  // ysbzt / twjybbzst
  await c.execute({
    sql: `update fonts set description=? where font_family=?`,
    args: [
      '峄山碑篆体是一款基于秦代刻石《峄山碑》风格设计的篆书字体，适用于古籍排版、文化宣传等古典庄重场景。',
      'wenfeng-ysbzt',
    ],
  });
  await c.execute({
    sql: `update fonts set designer=COALESCE(NULLIF(designer,''), ?), foundry=COALESCE(NULLIF(foundry,''), ?) where font_family=?`,
    args: ['教育部字形 / 社群', 'MOESongUN', 'wenfeng-twjybbzst'],
  });

  const counts = await c.execute('select status, count(*) n from fonts group by status');
  console.log({ restored, skippedKeep: skipped, counts: counts.rows });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
