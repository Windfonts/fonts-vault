#!/usr/bin/env node
/**
 * 何某手写体去重 · 2026-09-24。run: docker exec fonts-vault node /app/fix-nani-hmsx-dedupe.js
 * 依据：两行字体文件 name 表同为 Copyright (c) 2016-2020, Nanigashitei；
 *       nani(何某手写)=v1.046 新版但归属误记 Aqua；hmsx(何某手写体)=v1.036 旧版归属正确。
 * 处置：留新版 nani、归属/版权改回 Nanigashitei、名称统一「何某手写体」；hmsx → archived。
 * 备份点：prod.db.bak-20260924-dedupe-hmsx
 */
const { createClient } = require('@libsql/client');
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  await c.execute({
    sql: `update fonts set name='何某手写体', chinese_name='何某手写体', english_name='NaniFont',
          designer='Nanigashitei', foundry='Nanigashitei', brand_id='7c1e9a20-4b6d-4e8a-9f31-2a8c5d0e11b4',
          copyright='Copyright (c) 2016-2020, Nanigashitei.', version='1.046',
          updated_at=strftime('%s','now') where font_family='wenfeng-nani'`,
  });
  await c.execute({
    sql: `update fonts set status='archived', updated_at=strftime('%s','now')
          where font_family='wenfeng-hmsx'`,
  });
  for (const fam of ['wenfeng-nani', 'wenfeng-hmsx']) {
    const r = await c.execute({ sql: 'select font_family,name,designer,brand_id,status from fonts where font_family=?', args: [fam] });
    console.log(JSON.stringify(r.rows[0]));
  }
})().catch((e) => { console.error(e); process.exit(1); });
