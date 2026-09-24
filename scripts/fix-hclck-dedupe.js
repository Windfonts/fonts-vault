#!/usr/bin/env node
/**
 * 寒蝉龙藏楷书去重 · 2026-09-25. run: docker exec fonts-vault node /app/fix-hclck-dedupe.js
 * 依据：两行同项目同上游（fork 自 Google Fonts 龙藏体，版权行同 LongCang Project Authors）；
 *   hclck2=Version 3.520/Glyphs 3.3（新，OTF，7041 字，ExtraBold 规范 casing，文件自报名「寒蟬龍藏楷書」）
 *   hclcks=Version 3.500/Glyphs 3.1.1（旧，TTF，7038 字，Extrabold 小写）
 * 处置：留 hclck2 并按 name 表正名「寒蝉龙藏楷书」+ 补真实版本/版权；hclcks → archived。
 * 备份点：prod.db.bak-20260925-dedupe-hclcks
 */
const { createClient } = require('@libsql/client');
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  await c.execute({
    sql: `update fonts set name='寒蝉龙藏楷书', chinese_name='寒蝉龙藏楷书', english_name='ChillLongCangKaiShu',
          version='3.520', copyright='Copyright 2018 The LongCang Project Authors (https://github.com/googlefonts/longcang)',
          updated_at=strftime('%s','now') where font_family='wenfeng-hclck2'`,
  });
  await c.execute({
    sql: `update fonts set status='archived', updated_at=strftime('%s','now') where font_family='wenfeng-hclcks'`,
  });
  const r = await c.execute({
    sql: `select font_family, name, version, status from fonts where font_family in ('wenfeng-hclck2','wenfeng-hclcks')`,
  });
  console.log(r.rows.map((x) => `${x.font_family}|${x.name}|${x.version}|${x.status}`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
