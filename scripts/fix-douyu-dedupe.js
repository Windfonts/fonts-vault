#!/usr/bin/env node
/**
 * 斗鱼字体去重 · 2026-09-25. run: docker exec fonts-vault node /app/fix-douyu-dedupe.js
 * douyufont（DOUYU Font，2019 build，覆盖 7250，字数占位=1）与 dyzgt（斗鱼追光体，正式版 7716 字，
 * name 表版本令牌同为 DOUYUFont）为同项目两代 build。留 dyzgt，douyufont → archived。
 * 备份：prod.db.bak-20260925-dedupe-douyufont
 */
const { createClient } = require('@libsql/client');
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  await c.execute({ sql: `update fonts set status='archived', updated_at=strftime('%s','now') where font_family='wenfeng-douyufont'` });
  const r = await c.execute({ sql: `select font_family, name, status from fonts where font_family in ('wenfeng-douyufont','wenfeng-dyzgt')` });
  console.log(r.rows.map((x) => `${x.font_family}|${x.name}|${x.status}`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
