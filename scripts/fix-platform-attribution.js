#!/usr/bin/env node
/**
 * 平台冒名作者修复 + 两组重复归并 · 2026-09-24. run: docker exec fonts-vault node /app/fix-platform-attribution.js
 * 依据（fonts.name 表）：
 *   hkhlssxt 律师手写体：All rights reserved by Lawyer Huang Kaihua（个人官网 huangkaihua.com）→ 字体家只是渠道
 *   jxzk 江西拙楷体：DesignerName huang yu chen（黄煜臣）→ HelloFont/Fontree 只是渠道
 *   重复对 CSS 字节级相同：cktjgt=cktkingkong（v2.0.0），qtqmt=qtxmt（v1.00）→ 各留一条，余转 archived
 * 备份点：prod.db.bak-20260924-platform-attribution
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const now = Math.floor(Date.now() / 1000);
  async function brandId(slug, name, website, desc) {
    const ex = await c.execute({ sql: 'select id from brands where slug=?', args: [slug] });
    if (ex.rows.length) return ex.rows[0].id;
    const id = randomUUID();
    await c.execute({
      sql: `insert into brands (id,name,slug,description,website,status,created_at,updated_at) values (?,?,?,?,?,'published',?,?)`,
      args: [id, name, slug, desc, website, now, now],
    });
    console.log('brand inserted', slug, id);
    return id;
  }
  const huangkaihua = await brandId('huangkaihua', '黄凯桦', 'http://www.huangkaihua.com', '执业律师，个人手写字体「黄凯桦律师手写体」作者，免费商用。');
  const huangyuchen = await brandId('huangyuchen', '黄煜臣', 'https://www.zcool.com.cn/u/653645', '独立字体作者，「江西拙楷体」作者。');

  await c.execute({
    sql: `update fonts set foundry='黄凯桦', brand_id=?, copyright='All rights reserved by Lawyer Huang Kaihua',
          updated_at=strftime('%s','now') where font_family='wenfeng-hkhlssxt'`, args: [huangkaihua],
  });
  await c.execute({
    sql: `update fonts set foundry='黄煜臣', brand_id=?, updated_at=strftime('%s','now')
          where font_family='wenfeng-jxzk'`, args: [huangyuchen],
  });
  // 重复归并：留老目录 slug（cktjgt=2.0.0 正确、qtqmt 在先），archive 另一条
  await c.execute({ sql: `update fonts set status='archived', updated_at=strftime('%s','now') where font_family='wenfeng-cktkingkong'` });
  await c.execute({ sql: `update fonts set status='archived', updated_at=strftime('%s','now') where font_family='wenfeng-qtxmt'` });

  const r = await c.execute({
    sql: `select font_family,name,foundry,brand_id,status from fonts where font_family in
          ('wenfeng-hkhlssxt','wenfeng-jxzk','wenfeng-cktjgt','wenfeng-cktkingkong','wenfeng-qtqmt','wenfeng-qtxmt')`,
  });
  console.log(r.rows.map((x) => `${x.font_family}|${x.name}|${x.foundry}|${String(x.brand_id).slice(0,8)}|${x.status}`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
