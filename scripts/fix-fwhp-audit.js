#!/usr/bin/env node
/**
 * FWHP（花乐）批审计修正 · 2026-09-25. run: docker exec fonts-vault node /app/fix-fwhp-audit.js
 * 依据 fonts.name 表版权行：
 *   混菜写楷 = Klee+LXGW文楷+iansui+FWHP 多层衍生；宅在家三款 = FWHP 以 OFL 再发布天天宅在家（starlove0425）；
 *   汲古明体ABC = 源流明体（ButTaiwan genryu）衍生；繁多全四款 = 台湾数位发展部全字库双授权（OGD-1.0/OFL-1.1）衍生。
 * 处置：copyright 换 name 表版权行；繁多全 license_description 记双授权；宅在家记原作声明链。只读谱系在 front 侧修。
 * 备份：prod.db.bak-20260925-fwhp-audit
 */
const { createClient } = require('@libsql/client');
const CP = {
  'wenfeng-hxwk': 'Copyright 2020 The Klee Project Authors. Copyright 2021-2023 LXGW (LxgwWenKai). Copyright 2022 But Ko (iansui). Copyright 2023 FWHP (Mixed-VsWeKai)',
  'wenfeng-zzmk': 'Copyright 2019-2022 天天宅在家 starlove0425 (FULLY FREE to USE). Copyright 2023 FWHP (Star-Love-Font, OFL 1.1)',
  'wenfeng-zzzd': 'Copyright 2019-2022 天天宅在家 starlove0425 (FULLY FREE to USE). Copyright 2023 FWHP (Star-Love-Font, OFL 1.1)',
  'wenfeng-zzft': 'Copyright 2019-2022 天天宅在家 starlove0425 (FULLY FREE to USE). Copyright 2023 FWHP (Star-Love-Font, OFL 1.1)',
  'wenfeng-jgma': 'Copyright 2023 FWHP (JiGu-Ming). Copyright 2020 ButTaiwan (genryu-font). Copyright (c) 2020 Lingdong Huang',
  'wenfeng-jgmb': 'Copyright 2023 FWHP (JiGu-Ming). Copyright 2020 ButTaiwan (genryu-font). Copyright (c) 2020 Lingdong Huang',
  'wenfeng-jgmc': 'Copyright 2023 FWHP (JiGu-Ming). Copyright 2020 ButTaiwan (genryu-font). Copyright (c) 2020 Lingdong Huang',
  'wenfeng-mtk1': 'Copyright 2023 FWHP (MoTc-TwFl). (c) 2022 台湾数位发展部（双授权：政府资料开放授权 1.0 或 OFL 1.1）',
  'wenfeng-mtk2': 'Copyright 2023 FWHP (MoTc-TwFl). (c) 2022 台湾数位发展部（双授权：政府资料开放授权 1.0 或 OFL 1.1）',
  'wenfeng-mts1': 'Copyright 2023 FWHP (MoTc-TwFl). (c) 2022 台湾数位发展部（双授权：政府资料开放授权 1.0 或 OFL 1.1）',
  'wenfeng-mts2': 'Copyright 2023 FWHP (MoTc-TwFl). (c) 2022 台湾数位发展部（双授权：政府资料开放授权 1.0 或 OFL 1.1）',
};
const DESC = {
  zz: '原作「天天宅在家」系列（starlove0425，作者声明完全免费使用），FWHP 修改后以 SIL OFL 1.1 再发布（Star-Love-Font 仓 LICENSE.txt 原文已核对）。',
  mt: '衍生自台湾数位发展部全字库字型，沿用其双授权：政府资料开放授权条款 1.0 或 SIL OFL 1.1 任选其一（声明内嵌于字体 name 表，已核对）。',
};
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  for (const [fam, cp] of Object.entries(CP)) {
    const desc = fam.includes('zz') ? DESC.zz : (/mt[ks]/.test(fam) ? DESC.mt : null);
    await c.execute({
      sql: 'update fonts set copyright=?, license_description=coalesce(?, license_description), updated_at=strftime(\'%s\',\'now\') where font_family=?',
      args: [cp, desc, fam],
    });
  }
  const r = await c.execute({
    sql: `select font_family, substr(copyright,1,40) from fonts where font_family in (${Object.keys(CP).map(() => '?').join(',')})`,
    args: Object.keys(CP),
  });
  console.log(r.rows.map((x) => `${x.font_family}|${x[1]}`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
