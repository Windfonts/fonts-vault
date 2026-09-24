const { createClient } = require('@libsql/client');
const fixes = require('/tmp/swei-fixes.json'); // 通过 docker cp 一起放进容器
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  let upd = 0, same = 0, miss = 0;
  for (const [fam, v] of Object.entries(fixes)) {
    const ex = await c.execute({ sql: 'select name, english_name from fonts where font_family=?', args: [fam] });
    if (!ex.rows.length) { console.log('missing', fam); miss++; continue; }
    if (ex.rows[0].name === v.name && ex.rows[0].english_name === v.en) { same++; continue; }
    await c.execute({
      sql: 'update fonts set name=?, chinese_name=?, english_name=?, updated_at=strftime(\'%s\',\'now\') where font_family=?',
      args: [v.name, v.name, v.en, fam],
    });
    console.log('fixed', fam, '->', v.name, '|', v.en);
    upd++;
  }
  console.log(JSON.stringify({ upd, same, miss }));
})().catch((e) => { console.error(e); process.exit(1); });
