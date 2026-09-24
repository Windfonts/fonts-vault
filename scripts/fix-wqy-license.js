#!/usr/bin/env node
/**
 * 文泉驿授权修正 · 2026-09-25. run: docker exec fonts-vault node /app/fix-wqy-license.js
 * 依据官方发行包：正黑系（正黑/等宽/点阵宋）=GPLv2+字体例外；微米黑系=Apache2.0 或 GPLv3+FE 双许可。
 * 修正：wqydkzh 误记 Apache/GPLv3 → GPL-2.0-with-font-exception；wqys 漏字体例外标注 + 占位版权行。
 * 备份：prod.db.bak-20260925-wqy-license
 */
const { createClient } = require('@libsql/client');
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  await c.execute({ sql: `update fonts set license='GPL-2.0-with-font-exception',
    license_description='GPLv2 与字体嵌入例外条款（正黑包 README 声明，原文已核）：可商用可修改可再分发，再分发须随附许可与源；嵌入文档不使文档染 GPL。',
    updated_at=strftime('%s','now') where font_family in ('wenfeng-wqyzh','wenfeng-wqydkzh','wenfeng-wqys')` });
  await c.execute({ sql: `update fonts set copyright='Copyright (C) 2004-2010 Qianqian Fang and The WenQuanYi Project Board of Trustees (Zen Hei)',
    updated_at=strftime('%s','now') where font_family='wenfeng-wqys'` });
  await c.execute({ sql: `update fonts set license_description='双许可：Apache 2.0（承 Droid Sans Fallback）或 GPLv3+字体嵌入例外，任选其一（微米黑包 README 声明，原文已核）。',
    updated_at=strftime('%s','now') where font_family in ('wenfeng-wqywmh','wenfeng-wqydkwmh')` });
  const r = await c.execute(`select font_family, license from fonts where font_family like 'wenfeng-wqy%'`);
  console.log(r.rows.map((x) => `${x.font_family}|${x.license}`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
