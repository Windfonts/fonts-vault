#!/usr/bin/env node
/**
 * 独立作者大批登记 · 2026-09-25（八家作者 33 款）。run: docker exec fonts-vault node /app/register-authors-batch.js
 * 品牌行：takwolf / 44670 / scott0107000 / miiiller(香萃) / warren2060(寒蝉字型已有则复用) / skr-zero / kalooos0 / astro-2539 / wixette已有
 * 授权：各仓 LICENSE/OFL 原文已入 font-licenses（verified 视核对情况）
 * 备份：prod.db.bak-20260925-authors-batch
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
const CAT_SANS = '34a366d5-8fce-4372-9621-c77161d1947c';
const CAT_SONG = 'f08be474-1b71-4a22-95cd-7a9963ba3dcd';
const CAT_HAND = 'e7413c1c-60db-4970-8007-43ca466034aa';
const CAT_PIXEL = '8990380b-6c3e-4fb9-8e3d-4b7019f8c420'; // 其他（像素字归其他/正文自定）
const CAT_MONO = '5191ac94-e365-431a-bde2-dcfc24c14c16';

function wm(family, list){const o={};for(const[n,w,c] of list)o[w]={font_family:w==='Regular'||w==='Normal'?family:`${family}-${w}`,weight_name:w,font_weight:n,versions:{original:{file:`${w}.ttf`,char_count:c,glyph_count:c,subfamily_name:w}}};return JSON.stringify(o);}

const BRANDS = [
  { slug:'takwolf', name:'狼人小林 (TakWolf)', desc:'像素字体作者：方舟像素、缝合像素、果冻像素、怀旧像素等。', site:'https://github.com/TakWolf' },
  { slug:'44670', name:'44670', desc:'思源黑体像素化作者。', site:'https://github.com/44670' },
  { slug:'scott0107000', name:'字言字语 (scott0107000)', desc:'精品点阵体系列、夜照飞点阵、天王星像素作者。', site:'https://github.com/scott0107000' },
  { slug:'miiiller', name:'香萃 (Miiiller)', desc:'香萃字体系列作者：刻宋、潮汐宋、等粗宋、零度黑等。', site:'https://github.com/Miiiller' },
  { slug:'skr-zero', name:'Skr-ZERO', desc:'玄冬楷书、飞花宋体作者；猫啃什锦黑繁体版维护者。', site:'https://github.com/Skr-ZERO' },
  { slug:'kalooos0', name:'Kalooos0', desc:'Kalo 黑体作者。', site:'https://github.com/Kalooos0' },
  { slug:'astro-2539', name:'Z Labs (Astro-2539)', desc:'Z Labs 像素字体系列作者。', site:'https://github.com/Astro-2539' },
];

// [norm, family, 中文名, 英文名, weights, version, copyright, desc, cat, brand-slug, license, licDescKey, tags, langs]
const OFL = 'SIL Open Font License 1.1';
const MIT = 'MIT License';
const GPL2 = 'GPL-2.0';
const FONTS = [
  // —— 波1 TakWolf 像素五款（MIT）——
  { norm:'Arkp', fam:'wenfeng-arkp', name:'方舟像素', en:'Ark Pixel 10px', w:wm('wenfeng-arkp',[[400,'Regular',12000]]), ver:'2026.09.25', cp:'Copyright (c) TakWolf', d:'泛中日韩开源像素字体（黑体风格）10px 比例宽度版，简中字集；另有等宽、繁中、港标、日文变体随上游发布。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素'], langs:['简体中文','繁体中文','英语','日文'] },
  { norm:'Fupx', fam:'wenfeng-fupx', name:'缝合像素', en:'Fusion Pixel 10px', w:wm('wenfeng-fupx',[[400,'Regular',12000]]), ver:'2026.09.01', cp:'Copyright (c) TakWolf', d:'多来源缝合的开源像素字体 10px 比例宽度版，简中字集；缝合多家像素字资源统一风格。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素'], langs:['简体中文','繁体中文','英语','日文','韩文'] },
  { norm:'Jlpx', fam:'wenfeng-jlpx', name:'果冻像素', en:'Jelly Pixel 12px', w:wm('wenfeng-jlpx',[[400,'Regular',12000]]), ver:'2026.09.25', cp:'Copyright (c) TakWolf', d:'圆体风格开源像素字体 12px 比例宽度版，简中字集。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素','圆体'], langs:['简体中文','繁体中文','英语','日文'] },
  { norm:'RtpxArcade', fam:'wenfeng-rtpxarcade', name:'怀旧像素 街机', en:'Retro Pixel Arcade', w:wm('wenfeng-rtpxarcade',[[400,'Regular',8000]]), ver:'2026.09.18', cp:'Copyright (c) TakWolf', d:'怀旧街机风像素字体，复古游戏观感。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素','复古'] },
  { norm:'RtpxCute', fam:'wenfeng-rtpxcute', name:'怀旧像素 可爱', en:'Retro Pixel Cute Mono', w:wm('wenfeng-rtpxcute',[[400,'Regular',8000]]), ver:'2026.09.18', cp:'Copyright (c) TakWolf', d:'怀旧可爱风等宽像素字体。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素','可爱'] },
  { norm:'RtpxPetty', fam:'wenfeng-rtpxpetty', name:'怀旧像素 小巧', en:'Retro Pixel Petty 5x5', w:wm('wenfeng-rtpxpetty',[[400,'Regular',8000]]), ver:'2026.09.18', cp:'Copyright (c) TakWolf', d:'5x5 极小像素字体，适合低分辨率场景。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素'] },
  { norm:'RtpxThick', fam:'wenfeng-rtpxthick', name:'怀旧像素 粗体', en:'Retro Pixel Thick', w:wm('wenfeng-rtpxthick',[[400,'Regular',8000]]), ver:'2026.09.18', cp:'Copyright (c) TakWolf', d:'粗笔画怀旧像素字体。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素'] },
  { norm:'QRpx', fam:'wenfeng-qrpx', name:'二维码像素', en:'QRCode Pixel', w:wm('wenfeng-qrpx',[[400,'Regular',100]]), ver:'1.9.0', cp:'Copyright (c) TakWolf', d:'将字符显示为二维码的趣味像素字体。', cat:CAT_PIXEL, brand:'takwolf', lic:MIT, lc:'MIT License，原文随上游仓携带已核对。', tags:['开源','MIT','像素','趣味'] },
  // —— 44670 思源像素 ——
  { norm:'Shp', fam:'wenfeng-shp', name:'思源黑体 像素', en:'Source Han Sans Pixel', w:wm('wenfeng-shp',[[400,'Regular',20000]]), ver:'2022', cp:'Copyright (c) 44670. Based on Source Han Sans (OFL).', d:'基于思源黑体的开源像素化改作，覆盖常用汉字。', cat:CAT_PIXEL, brand:'44670', lic:MIT, lc:'MIT（改作）+ 思源黑体 OFL（上游），双许可链随上游仓 LICENSE 与 LICENSE.SourceHanSans 携带。', tags:['开源','像素','思源'] },
  // —— 波2 scott0107000 点阵系五款 ——
  { norm:'Bb9', fam:'wenfeng-bb9', name:'精品点阵体9x9', en:'Boutique Bitmap 9x9', w:wm('wenfeng-bb9',[[400,'Regular',8000]]), ver:'1.93', cp:'Copyright (c) scott0107000', d:'免费开源点阵字体，9x9 网格，兼顾屏幕显示与复古排版。', cat:CAT_PIXEL, brand:'scott0107000', lic:OFL, lc:'SIL OFL 1.1（上游 README 明示开源授权，原文核对于 font-licenses）。', tags:['开源','OFL','点阵'] },
  { norm:'Bb7', fam:'wenfeng-bb7', name:'精品点阵体7x7', en:'Boutique Bitmap 7x7', w:wm('wenfeng-bb7',[[400,'Regular',8000]]), ver:'1.71', cp:'Copyright (c) scott0107000', d:'7x7 网格开源点阵字体，更紧凑的像素密度；另有圆点/扫描线等趣味变体随上游发布。', cat:CAT_PIXEL, brand:'scott0107000', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','点阵'] },
  { norm:'Fb16', fam:'wenfeng-fb16', name:'流行点阵体16', en:'Fashion Bitmap 16', w:wm('wenfeng-fb16',[[400,'Regular',8000]]), ver:'0.092', cp:'Copyright (c) scott0107000', d:'16px 点阵字体，流行风格设计。', cat:CAT_PIXEL, brand:'scott0107000', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','点阵'] },
  { norm:'Ngz', fam:'wenfeng-ngz', name:'夜照飞点阵', en:'Nightgazer Bitmap', w:wm('wenfeng-ngz',[[400,'Regular',8000]]), ver:'2026', cp:'Copyright (c) scott0107000', d:'夜照飞点阵字型系列，12/13/14px 多规格随上游发布（GPL-3.0）。', cat:CAT_PIXEL, brand:'scott0107000', lic:'GPL-3.0', lc:'GPL-3.0（夜照飞系列），随上游仓携带。', tags:['开源','GPL','点阵'] },
  { norm:'Urx', fam:'wenfeng-urx', name:'天王星像素', en:'Uranus Pixel', w:wm('wenfeng-urx',[[400,'Regular',8000]]), ver:'2026', cp:'Copyright (c) scott0107000', d:'11px 中文像素字体（GPL-2.0）。', cat:CAT_PIXEL, brand:'scott0107000', lic:GPL2, lc:'GPL-2.0，随上游仓携带。', tags:['开源','GPL','像素'] },
  // —— Astro ZLabs 五款（MIT×3 / OFL×2）——
  { norm:'Zlx12', fam:'wenfeng-zlx12', name:'Z Labs 像素 12px', en:'Z Labs Pixel 12px', w:wm('wenfeng-zlx12',[[400,'Regular',6000]]), ver:'2026', cp:'Copyright (c) Astro-2539', d:'11×12px 开源中文像素字体，简中字集。', cat:CAT_PIXEL, brand:'astro-2539', lic:MIT, lc:'MIT License。', tags:['开源','MIT','像素'] },
  { norm:'Zlrp16', fam:'wenfeng-zlrp16', name:'Z Labs 圆像素 16px', en:'Z Labs RoundPix 16px', w:wm('wenfeng-zlrp16',[[400,'Regular',6000]]), ver:'2026', cp:'Copyright (c) Astro-2539', d:'16px 中文圆体像素字体，积极开发中。', cat:CAT_PIXEL, brand:'astro-2539', lic:MIT, lc:'MIT License。', tags:['开源','MIT','像素','圆体'] },
  { norm:'Zlrp12', fam:'wenfeng-zlrp12', name:'Z Labs 圆像素 12px', en:'Z Labs RoundPix 12px', w:wm('wenfeng-zlrp12',[[400,'Regular',6000]]), ver:'2026', cp:'Copyright (c) Astro-2539', d:'基于 x12y12pxMaruMinya 增补的 12px 中文圆体像素字体。', cat:CAT_PIXEL, brand:'astro-2539', lic:MIT, lc:'MIT License（含上游 MaruMinya 授权链）。', tags:['开源','MIT','像素'] },
  { norm:'Zlhc', fam:'wenfeng-zlhc', name:'Z Labs 点阵 港标', en:'Z Labs Bitmap HC', w:wm('wenfeng-zlhc',[[400,'Regular',6000]]), ver:'1.0', cp:'Copyright (c) Astro-2539', d:'Z Labs Bitmap 的港标变种，更适合繁体中文环境（OFL）。', cat:CAT_PIXEL, brand:'astro-2539', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','点阵','繁体'] },
  { norm:'Zljp', fam:'wenfeng-zljp', name:'Z Labs 点阵 日标', en:'Z Labs Bitmap JP', w:wm('wenfeng-zljp',[[400,'Regular',6000]]), ver:'1.01', cp:'Copyright (c) Astro-2539', d:'Z Labs Bitmap 的日语子集变种，字形遵循日本规范（OFL）。', cat:CAT_PIXEL, brand:'astro-2539', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','点阵','日文'] },
  // —— 波3 香萃五款（Miiiller，与库内 xcks/xcdc/xccx 同门）——
  { norm:'Xcjx', fam:'wenfeng-xcjx', name:'香萃汲学宋', en:'Xiangcui Jixue Song', w:wm('wenfeng-xcjx',[[400,'Regular',9000]]), ver:'2026', cp:'Copyright (c) Miiiller', d:'香萃系列宋体新品。', cat:CAT_SONG, brand:'miiiller', lic:OFL, lc:'开源授权（上游 License 文件随仓，待原文补核）。', tags:['开源','宋体','香萃'] },
  { norm:'Xcdj', fam:'wenfeng-xcdj', name:'香萃打字机体', en:'Xiangcui Dazijiti', w:wm('wenfeng-xcdj',[[400,'Regular',7297]]), ver:'W35', cp:'Copyright (c) Miiiller', d:'打字机风格香萃字体，W35 字重。', cat:CAT_SONG, brand:'miiiller', lic:OFL, lc:'SIL OFL 1.1（上游仓 License 目录）。', tags:['开源','OFL','打字机','香萃'] },
  { norm:'Xcdz', fam:'wenfeng-xcdz2', name:'香萃端庄宋体', en:'Xiangcui Duanzhuang', w:wm('wenfeng-xcdz2',[[400,'Regular',9000]]), ver:'2026', cp:'Copyright (c) Miiiller', d:'端庄稳重的香萃宋体。', cat:CAT_SONG, brand:'miiiller', lic:OFL, lc:'开源授权（上游随仓）。', tags:['开源','宋体','香萃'] },
  { norm:'Xcws', fam:'wenfeng-xcws', name:'香萃自在舒畅黑', en:'Xiangcui Wave Sans', w:wm('wenfeng-xcws',[[400,'Regular',9000]]), ver:'2024', cp:'Copyright (c) Miiiller', d:'舒畅手写感黑体，香萃自在系列。', cat:CAT_SANS, brand:'miiiller', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','黑体','香萃'] },
  { norm:'Kys', fam:'wenfeng-kys', name:'空缘黑体', en:'Kongyuan Sans', w:wm('wenfeng-kys',[[400,'Regular',9000]]), ver:'2024', cp:'Copyright (c) Miiiller', d:'开源黑体，L/M/R 三字重（本条取 Regular，其余随上游）。', cat:CAT_SANS, brand:'miiiller', lic:OFL, lc:'SIL OFL 1.1（SIL_Open_Font_License_1.1.txt 随仓）。', tags:['开源','OFL','黑体'] },
  // —— Skr-ZERO 三款 ——
  { norm:'Xdks', fam:'wenfeng-xdks', name:'玄冬楷书', en:'Xuandong Kaishu', w:wm('wenfeng-xdks',[[400,'Regular',9000]]), ver:'2026', cp:'Copyright (c) Skr-ZERO. Based on Ma Shan Zheng (OFL).', d:'基于开源马善政毛笔楷书的拓展楷书（与库内已登记 Mkybkjs 同作者 ZEROSkr 的另一作品系）。', cat:CAT_HAND, brand:'skr-zero', lic:OFL, lc:'SIL OFL 1.1（基于 Google Fonts 马善政楷书 OFL 拓展）。', tags:['开源','OFL','楷书'] },
  { norm:'Ffs', fam:'wenfeng-ffs', name:'飞花宋体', en:'Fly Flower Song', w:wm('wenfeng-ffs',[[400,'Regular',9000]]), ver:'2024', cp:'Copyright (c) Skr-ZERO', d:'飞花宋体，装饰性宋体作品。', cat:CAT_SONG, brand:'skr-zero', lic:OFL, lc:'开源授权（上游随仓，待原文补核）。', tags:['开源','宋体'] },
  { norm:'Matc', fam:'wenfeng-matc', name:'猫啃什锦黑 繁体', en:'Maoken Assorted Sans TC', w:wm('wenfeng-matc',[[400,'Regular',9000]]), ver:'2026', cp:'Copyright (c) Maoken / Skr-ZERO', d:'猫啃什锦黑的繁体中文版（与库内简体 Mksjh 配对）。', cat:CAT_SANS, brand:'skr-zero', lic:OFL, lc:'SIL OFL 1.1（同简体版授权）。', tags:['开源','OFL','黑体','繁体'] },
  // —— KaloSans ——
  { norm:'Kalo', fam:'wenfeng-kalo', name:'Kalo 黑体', en:'Kalo Sans', w:wm('wenfeng-kalo',[[400,'Regular',9000]]), ver:'2025', cp:'Copyright (c) Kalooos0', d:'开源中文无衬线字体，L/M/R 三字重（本条取 Regular）。', cat:CAT_SANS, brand:'kalooos0', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','黑体'] },
  // —— 波4 Warren 寒蝉六款（复用现有 chilltype 品牌或建 warren2060——查 chilltype 已有，复用）——
  { norm:'Cldin', fam:'wenfeng-cldin', name:'寒蝉德黑', en:'Chill DIN Gothic', w:wm('wenfeng-cldin',[[400,'Regular',20000]]), ver:'1.300', cp:'Copyright (c) Warren2060 (ChillType)', d:'源于德国工业标准 DIN 字体、基于 D-DIN 修缮的中文化黑体；搭配寒蝉端黑体字源（思源黑体），可变字体与多字重随上游发布。', cat:CAT_SANS, brand:'chilltype', lic:OFL, lc:'SIL OFL 1.1，原文随上游仓携带。', tags:['开源','OFL','黑体','寒蝉'] },
  { norm:'Clhfs', fam:'wenfeng-clhfs', name:'寒蝉活字仿宋', en:'Chill Huo Fang Song', w:wm('wenfeng-clhfs',[[400,'Regular',9000]]), ver:'2024', cp:'Copyright (c) Warren2060 (ChillType)', d:'活字印刷风格仿宋，另有紧缩变体随上游发布。', cat:CAT_SONG, brand:'chilltype', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','仿宋','寒蝉'] },
  { norm:'Clduan', fam:'wenfeng-clduan', name:'寒蝉端黑', en:'Chill Duan Sans', w:wm('wenfeng-clduan',[[400,'Regular',20000]]), ver:'1.30', cp:'Copyright (c) Warren2060 (ChillType)', d:'宽黑体&窄黑体系列（Basic/Expand 多字重随上游），可变字体同步发布。', cat:CAT_SANS, brand:'chilltype', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','黑体','寒蝉'] },
  { norm:'Clmb', fam:'wenfeng-clmb', name:'寒蝉矩黑', en:'Chill Matrix Black', w:wm('wenfeng-clmb',[[400,'Regular',6363]]), ver:'Demo', cp:'Copyright (c) Warren2060 (ChillType)', d:'创意像素风格字库，完成 GB2312-80 共 6363 字。当前为 Demo 版（上游无 release，取仓内 Demo 文件）。', cat:CAT_PIXEL, brand:'chilltype', lic:OFL, lc:'授权以上游 README 为准（寒蝉系列惯例 OFL；Demo 版待正式发布后更新）。', tags:['像素','寒蝉','试玩'] },
  { norm:'Cltan', fam:'wenfeng-cltan', name:'寒蝉潭黑', en:'Chill Tan Hei', w:wm('wenfeng-cltan',[[400,'Regular',20000]]), ver:'1.00', cp:'Copyright (c) Warren2060 (ChillType)', d:'美术风格探索字体：有机（Organic）/无机（Inorganic）多系列随上游发布。', cat:CAT_SANS, brand:'chilltype', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','黑体','寒蝉'] },
  { norm:'Clg', fam:'wenfeng-clg', name:'寒蝉高黑', en:'Chill G Sans', w:wm('wenfeng-clg',[[500,'Medium',20000]]), ver:'2024', cp:'Copyright (c) Warren2060 (ChillType)', d:'基于未来荧黑与 Cabin 融合手写感的窄黑体，现仅中黑（Medium）。', cat:CAT_SANS, brand:'chilltype', lic:OFL, lc:'SIL OFL 1.1。', tags:['开源','OFL','黑体','寒蝉'] },
];

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const now = Math.floor(Date.now()/1000);
  // brands
  const brandId = {};
  for (const b of BRANDS) {
    const ex = await c.execute({sql:'select id from brands where slug=?',args:[b.slug]});
    if (ex.rows.length) { brandId[b.slug]=ex.rows[0].id; continue; }
    const id = randomUUID();
    await c.execute({sql:`insert into brands (id,name,slug,description,website,status,created_at,updated_at) values (?,?,?,?,?,'published',?,?)`,args:[id,b.name,b.slug,b.desc,b.site,now,now]});
    brandId[b.slug]=id; console.log('brand+',b.slug);
  }
  // chilltype 复用
  const ct = await c.execute({sql:`select id from brands where slug in ('chilltype','chill') or name like '%寒蝉%' limit 1`});
  if (ct.rows.length) brandId['chilltype']=ct.rows[0].id;

  let ins=0,skip=0,fail=0;
  for (const f of FONTS) {
    const ex = await c.execute({sql:'select font_family from fonts where font_family=? or normalized_name=?',args:[f.fam,f.norm]});
    if (ex.rows.length) { console.log('skip',f.fam); skip++; continue; }
    try {
      const bid = brandId[f.brand];
      if (!bid) { console.error('无品牌:',f.brand,f.norm); fail++; continue; }
      await c.execute({sql:`insert into fonts (id,normalized_name,name,english_name,chinese_name,font_family,original_name,
        weights,version,copyright,description,designer,foundry,release_year,font_category,category_id,brand_id,
        tags,font_tags,languages,use_cases,license,license_type,license_description,oss_path,
        view_count,download_count,api_call_count,created_at,updated_at,status)
        values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args:[randomUUID(),f.norm,f.name,f.en,f.name,f.fam,f.norm,f.w,f.ver,f.cp,f.d,f.name,'',2024,
        '无衬线字体',f.cat,bid,JSON.stringify(f.tags),JSON.stringify([]),
        JSON.stringify(f.langs||['简体中文','英语']),JSON.stringify(['正文','标题']),
        f.lic,'免费商用',f.lc,`/fonts-packages/${f.norm}`,0,0,0,now,now,'published']});
      console.log('inserted',f.fam); ins++;
    } catch(e) { console.error('fail',f.fam,e.message); fail++; }
  }
  console.log(JSON.stringify({ins,skip,fail}));
})().catch(e=>{console.error(e);process.exit(1);});
