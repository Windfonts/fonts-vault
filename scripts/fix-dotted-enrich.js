#!/usr/bin/env node
/**
 * 点点像素正主增补 · 2026-09-25. run: docker exec fonts-vault node /app/fix-dotted-enrich.js
 * 上游 github.com/wixette/dotted-chinese-fonts（v0.1，GPL-2.0，衍自文泉驿点阵宋体）。
 * ddxty 老行补版权/版本/英文名；en 名统一。备份：prod.db.bak-20260925-dotted
 */
const { createClient } = require('@libsql/client');
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  await c.execute({ sql: `update fonts set version='0.1', copyright='Copyright (C) 2020 wixette (github.com/wixette/dotted-chinese-fonts). Derived from WenQuanYi Bitmap Song.',
    english_name='Dotted Songti Circle', updated_at=strftime('%s','now') where font_family='wenfeng-ddxty'` });
  await c.execute({ sql: `update fonts set license='GPL-2.0', license_type='免费商用',
    license_description='GPL 2.0（wixette dotted-chinese-fonts）。衍自文泉驿点阵宋体（GPL-2.0+FE），README 明示派生链。', updated_at=strftime('%s','now')
    where font_family in ('wenfeng-ddxty','wenfeng-ddxstyx','wenfeng-ddxstlx','wenfeng-ddxstfx')` });
  const r = await c.execute(`select font_family, name, version, license from fonts where font_family like 'wenfeng-dd%'`);
  console.log(r.rows.map((x) => `${x.font_family}|${x.name}|${x.version}|${x.license}`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
