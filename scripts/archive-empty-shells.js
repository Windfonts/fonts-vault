#!/usr/bin/env node
/**
 * Archive all empty-shell fonts (no file + char_count 0) and refresh aliases.
 * Run inside fonts-vault container:
 *   node /app/data/archive-empty-shells.js
 */
const fs = require('fs');
const { createClient } = require('@libsql/client');

function isEmpty(weightsRaw) {
  let chars = 0;
  let hasFile = false;
  try {
    const w = typeof weightsRaw === 'string' ? JSON.parse(weightsRaw) : weightsRaw || {};
    for (const v of Object.values(w)) {
      if (!v || typeof v !== 'object') continue;
      const vers = v.versions || { _: v };
      for (const meta of Object.values(vers)) {
        if (!meta || typeof meta !== 'object') continue;
        if (meta.char_count) chars = Math.max(chars, meta.char_count | 0);
        if (meta.file && String(meta.file).trim()) hasFile = true;
      }
      if (v.file && String(v.file).trim()) hasFile = true;
      if (v.char_count) chars = Math.max(chars, v.char_count | 0);
    }
  } catch (_) {}
  return chars === 0 && !hasFile;
}

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const r = await c.execute('select id, font_family, status, weights from fonts');
  const toArchive = [];
  for (const row of r.rows) {
    if (isEmpty(row.weights) && row.status !== 'archived') {
      toArchive.push(row.font_family);
    }
  }
  if (toArchive.length) {
    // batch update
    for (const fam of toArchive) {
      await c.execute({
        sql: "update fonts set status='archived' where font_family=?",
        args: [fam],
      });
    }
  }
  const counts = await c.execute('select status, count(*) n from fonts group by status');
  console.log('archived_now', toArchive.length);
  console.log('sample', toArchive.slice(0, 20));
  console.log('counts', JSON.stringify(counts.rows));

  // ensure opposansb alias target exists published
  const opsa = await c.execute({
    sql: "select font_family,status from fonts where font_family=?",
    args: ['wenfeng-opsa'],
  });
  console.log('opsa', JSON.stringify(opsa.rows));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
