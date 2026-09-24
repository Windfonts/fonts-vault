#!/usr/bin/env node
/**
 * Buernia 批登记 · 2026-09-25. run: docker exec fonts-vault node /app/register-buernia.js
 * 两条：煮豆黑体 Zdht（v2.000，Noto 系标点符号，7 字重）/ 铁蒺藜体 Tjlt（v1.100，Reggae One 中文扩展）
 * 品牌：Buernia 自建。OFL 原文两份已入 font-licenses。备份：prod.db.bak-20260925-buernia
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
const CAT_SANS = '34a366d5-8fce-4372-9621-c77161d1947c';
const SG7 = (chars) => [[200,'ExtraLight',chars],[300,'Light',chars],[400,'Normal',chars],[400,'Regular',chars],[500,'Medium',chars],[700,'Bold',chars],[900,'Heavy',chars]];
function wm(family, list){const o={};for(const[n,w,c] of list)o[w]={font_family:w==='Regular'||w==='Normal'?family:`${family}-${w}`,weight_name:w,font_weight:n,versions:{original:{file:`${w}.ttf`,char_count:c,glyph_count:c,subfamily_name:w}}};return JSON.stringify(o);}
(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });
  const now = Math.floor(Date.now()/1000);
  let ex = await c.execute({ sql:'select id from brands where slug=?',args:['buernia']});
  const brandId = ex.rows.length ? ex.rows[0].id : randomUUID();
  if(!ex.rows.length){ await c.execute({sql:`insert into brands (id,name,slug,description,website,status,created_at,updated_at) values (?,?,?,?,?,'published',?,?)`,
    args:[brandId,'Buernia','buernia','独立字体作者，煮豆黑体与铁蒺藜体作者。','https://github.com/Buernia',now,now]}); console.log('brand inserted buernia',brandId);}
  const FONTS=[
   {norm:'Zdht',family:'wenfeng-zdht',name:'煮豆黑体',en:'Zhudou Sans',year:2023,ver:'2.000',
    weights:wm('wenfeng-zdht',SG7(190)),
    cp:'Copyright 2022 Buernia (https://github.com/Buernia), with Reserved Font Name \'Zhudou\'.',
    desc:'Noto 风格的中日韩标点符号字体，补齐搭配场景的符号与标点，七档字重，衍生自 Noto Sans。',tags:['开源','OFL','符号','标点']},
   {norm:'Tjlt',family:'wenfeng-tjlt',name:'铁蒺藜体',en:'Tiejili',year:2023,ver:'1.100',
    weights:wm('wenfeng-tjlt',[[400,'Regular',13121]]),
    cp:'Copyright 2022 Buernia (https://github.com/Buernia).',
    desc:'基于 Fontworks 雷鬼体（Reggae One）扩展的开源中文字体，笔画张扬的展示风格。',tags:['开源','OFL','展示']},
  ];
  let ins=0,skip=0;
  for(const f of FONTS){
    ex = await c.execute({sql:'select font_family from fonts where font_family=? or normalized_name=?',args:[f.family,f.norm]});
    if(ex.rows.length){console.log('skip',f.family);skip++;continue;}
    await c.execute({sql:`insert into fonts (id,normalized_name,name,english_name,chinese_name,font_family,original_name,
      weights,version,copyright,description,designer,foundry,release_year,font_category,category_id,brand_id,
      tags,font_tags,languages,use_cases,license,license_type,license_description,oss_path,
      view_count,download_count,api_call_count,created_at,updated_at,status)
      values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args:[randomUUID(),f.norm,f.name,f.en,f.name,f.family,f.norm,
      f.weights,f.ver,f.cp,f.desc,'Buernia','Buernia',f.year,'无衬线字体',CAT_SANS,brandId,
      JSON.stringify(f.tags),JSON.stringify([]),JSON.stringify(['简体中文','繁体中文','英语']),
      JSON.stringify(['标点符号','搭配']),  // use_cases 占位由下面 UPDATE 修正
      'SIL Open Font License 1.1','免费商用',
      `SIL OFL 1.1 原文随上游仓（github.com/Buernia/${f.norm==='Zdht'?'Zhudou-Sans':'Tiejili'}）携带，已核对并抄录至 font-licenses。`,
      `/fonts-packages/${f.norm}`,0,0,0,now,now,'published']});
    // use_cases 按款修正
    const uc = f.norm==='Zdht' ? ['搭配','符号排版'] : ['标题','海报'];
    await c.execute({sql:'update fonts set use_cases=? where font_family=?',args:[JSON.stringify(uc),f.family]});
    console.log('inserted',f.family);ins++;}
  console.log(JSON.stringify({ins,skip}));
})().catch(e=>{console.error(e);process.exit(1);});
