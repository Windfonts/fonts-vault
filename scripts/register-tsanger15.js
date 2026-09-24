#!/usr/bin/env node
/**
 * Register 仓耳免费开源 19 款（渔阳/与墨/非白 W01-05 + 舒圆 W02-05）into vault prod.db.
 * 2026-09-24 · run: docker exec fonts-vault node /app/register-tsanger15.js
 * Red lines: VACUUM INTO backup first; INSERT-only (no UPDATE to existing rows);
 *            dedup-check all 19 BEFORE any insert; verify by SELECT readback.
 */
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
const fs = require('fs');

const FONTS = [
 {
  "normalized_name": "TsangerYuYangTW01",
  "name": "仓耳渔阳体 W01",
  "english_name": "TsangerYuYangT W01",
  "chinese_name": "仓耳渔阳体 W01",
  "font_family": "wenfeng-ceyyt1",
  "original_name": "TsangerYuYangTW01",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceyyt1",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7049,
      "glyph_count": 7018,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳渔阳体 W01」。",
  "oss_path": "/fonts-packages/TsangerYuYangTW01",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuMoW01",
  "name": "仓耳与墨 W01",
  "english_name": "TsangerYuMo W01",
  "chinese_name": "仓耳与墨 W01",
  "font_family": "wenfeng-ceym1",
  "original_name": "TsangerYuMoW01",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceym1",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳与墨 W01」。",
  "oss_path": "/fonts-packages/TsangerYuMoW01",
  "status": "published"
 },
 {
  "normalized_name": "TsangerFeiBaiW01",
  "name": "仓耳非白 W01",
  "english_name": "TsangerFeiBai W01",
  "chinese_name": "仓耳非白 W01",
  "font_family": "wenfeng-cefb1",
  "original_name": "TsangerFeiBaiW01",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cefb1",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7010,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。name 表无中文记录（Windows Full name 为乱码「???? W0x」），显示名取官方产品名「仓耳非白」。",
  "oss_path": "/fonts-packages/TsangerFeiBaiW01",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuYangTW02",
  "name": "仓耳渔阳体 W02",
  "english_name": "TsangerYuYangT W02",
  "chinese_name": "仓耳渔阳体 W02",
  "font_family": "wenfeng-ceyyt2",
  "original_name": "TsangerYuYangTW02",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceyyt2",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7049,
      "glyph_count": 7018,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳渔阳体 W02」。",
  "oss_path": "/fonts-packages/TsangerYuYangTW02",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuMoW02",
  "name": "仓耳与墨 W02",
  "english_name": "TsangerYuMo W02",
  "chinese_name": "仓耳与墨 W02",
  "font_family": "wenfeng-ceym2",
  "original_name": "TsangerYuMoW02",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceym2",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳与墨 W02」。",
  "oss_path": "/fonts-packages/TsangerYuMoW02",
  "status": "published"
 },
 {
  "normalized_name": "TsangerFeiBaiW02",
  "name": "仓耳非白 W02",
  "english_name": "TsangerFeiBai W02",
  "chinese_name": "仓耳非白 W02",
  "font_family": "wenfeng-cefb2",
  "original_name": "TsangerFeiBaiW02",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cefb2",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7010,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。name 表无中文记录（Windows Full name 为乱码「???? W0x」），显示名取官方产品名「仓耳非白」。",
  "oss_path": "/fonts-packages/TsangerFeiBaiW02",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuYangTW03",
  "name": "仓耳渔阳体 W03",
  "english_name": "TsangerYuYangT W03",
  "chinese_name": "仓耳渔阳体 W03",
  "font_family": "wenfeng-ceyyt3",
  "original_name": "TsangerYuYangTW03",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceyyt3",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7049,
      "glyph_count": 7018,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳渔阳体 W03」。",
  "oss_path": "/fonts-packages/TsangerYuYangTW03",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuMoW03",
  "name": "仓耳与墨 W03",
  "english_name": "TsangerYuMo W03",
  "chinese_name": "仓耳与墨 W03",
  "font_family": "wenfeng-ceym3",
  "original_name": "TsangerYuMoW03",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceym3",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳与墨 W03」。",
  "oss_path": "/fonts-packages/TsangerYuMoW03",
  "status": "published"
 },
 {
  "normalized_name": "TsangerFeiBaiW03",
  "name": "仓耳非白 W03",
  "english_name": "TsangerFeiBai W03",
  "chinese_name": "仓耳非白 W03",
  "font_family": "wenfeng-cefb3",
  "original_name": "TsangerFeiBaiW03",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cefb3",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7010,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。name 表无中文记录（Windows Full name 为乱码「???? W0x」），显示名取官方产品名「仓耳非白」。",
  "oss_path": "/fonts-packages/TsangerFeiBaiW03",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuYangTW04",
  "name": "仓耳渔阳体 W04",
  "english_name": "TsangerYuYangT W04",
  "chinese_name": "仓耳渔阳体 W04",
  "font_family": "wenfeng-ceyyt4",
  "original_name": "TsangerYuYangTW04",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceyyt4",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7049,
      "glyph_count": 7018,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳渔阳体 W04」。",
  "oss_path": "/fonts-packages/TsangerYuYangTW04",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuMoW04",
  "name": "仓耳与墨 W04",
  "english_name": "TsangerYuMo W04",
  "chinese_name": "仓耳与墨 W04",
  "font_family": "wenfeng-ceym4",
  "original_name": "TsangerYuMoW04",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceym4",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳与墨 W04」。",
  "oss_path": "/fonts-packages/TsangerYuMoW04",
  "status": "published"
 },
 {
  "normalized_name": "TsangerFeiBaiW04",
  "name": "仓耳非白 W04",
  "english_name": "TsangerFeiBai W04",
  "chinese_name": "仓耳非白 W04",
  "font_family": "wenfeng-cefb4",
  "original_name": "TsangerFeiBaiW04",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cefb4",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7010,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。name 表无中文记录（Windows Full name 为乱码「???? W0x」），显示名取官方产品名「仓耳非白」。",
  "oss_path": "/fonts-packages/TsangerFeiBaiW04",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuYangTW05",
  "name": "仓耳渔阳体 W05",
  "english_name": "TsangerYuYangT W05",
  "chinese_name": "仓耳渔阳体 W05",
  "font_family": "wenfeng-ceyyt5",
  "original_name": "TsangerYuYangTW05",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceyyt5",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7049,
      "glyph_count": 7018,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳渔阳体 W05」。",
  "oss_path": "/fonts-packages/TsangerYuYangTW05",
  "status": "published"
 },
 {
  "normalized_name": "TsangerYuMoW05",
  "name": "仓耳与墨 W05",
  "english_name": "TsangerYuMo W05",
  "chinese_name": "仓耳与墨 W05",
  "font_family": "wenfeng-ceym5",
  "original_name": "TsangerYuMoW05",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-ceym5",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳与墨 W05」。",
  "oss_path": "/fonts-packages/TsangerYuMoW05",
  "status": "published"
 },
 {
  "normalized_name": "TsangerFeiBaiW05",
  "name": "仓耳非白 W05",
  "english_name": "TsangerFeiBai W05",
  "chinese_name": "仓耳非白 W05",
  "font_family": "wenfeng-cefb5",
  "original_name": "TsangerFeiBaiW05",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cefb5",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7010,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。name 表无中文记录（Windows Full name 为乱码「???? W0x」），显示名取官方产品名「仓耳非白」。",
  "oss_path": "/fonts-packages/TsangerFeiBaiW05",
  "status": "published"
 },
 {
  "normalized_name": "TsangerShuYuanTW02",
  "name": "仓耳舒圆体 W02",
  "english_name": "TsangerShuYuanT W02",
  "chinese_name": "仓耳舒圆体 W02",
  "font_family": "wenfeng-cesyt2",
  "original_name": "TsangerShuYuanTW02",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cesyt2",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳舒圆体 W02」。",
  "oss_path": "/fonts-packages/TsangerShuYuanTW02",
  "status": "published"
 },
 {
  "normalized_name": "TsangerShuYuanTW03",
  "name": "仓耳舒圆体 W03",
  "english_name": "TsangerShuYuanT W03",
  "chinese_name": "仓耳舒圆体 W03",
  "font_family": "wenfeng-cesyt3",
  "original_name": "TsangerShuYuanTW03",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cesyt3",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳舒圆体 W03」。",
  "oss_path": "/fonts-packages/TsangerShuYuanTW03",
  "status": "published"
 },
 {
  "normalized_name": "TsangerShuYuanTW04",
  "name": "仓耳舒圆体 W04",
  "english_name": "TsangerShuYuanT W04",
  "chinese_name": "仓耳舒圆体 W04",
  "font_family": "wenfeng-cesyt4",
  "original_name": "TsangerShuYuanTW04",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cesyt4",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳舒圆体 W04」。",
  "oss_path": "/fonts-packages/TsangerShuYuanTW04",
  "status": "published"
 },
 {
  "normalized_name": "TsangerShuYuanTW05",
  "name": "仓耳舒圆体 W05",
  "english_name": "TsangerShuYuanT W05",
  "chinese_name": "仓耳舒圆体 W05",
  "font_family": "wenfeng-cesyt5",
  "original_name": "TsangerShuYuanTW05",
  "weights": {
   "Regular": {
    "font_family": "wenfeng-cesyt5",
    "weight_name": "Regular",
    "font_weight": 400,
    "versions": {
     "original": {
      "file": "Regular.ttf",
      "char_count": 7042,
      "glyph_count": 7011,
      "subfamily_name": "Regular"
     }
    }
   }
  },
  "version": "1.000",
  "copyright": "Copyright © Beijing Tsanger Character Technology Co., Ltd.. All rights reserved.",
  "description": "列入2020-11-11《仓耳字库免费开源字体授权声明》附件名单（22 款）的免费开源字体。官方产品页声明：本字体任何用户可以全球任何领域永久免费商用。",
  "designer": "Beijing Tsanger Character Technology Co., Ltd.",
  "foundry": "造字工房",
  "release_year": null,
  "font_category": null,
  "category_id": null,
  "brand_id": "05a1be7d-f462-5fc7-a1ef-5591e1379a42",
  "tags": [
   "免费商用",
   "仓耳字库"
  ],
  "font_tags": [],
  "languages": [
   "简体中文"
  ],
  "use_cases": [],
  "license": "仓耳字库免费开源字体授权声明",
  "license_type": "开源免费商用",
  "license_description": "来源：github.com/cntrump/tsanger_free_fonts 镜像（官方 tsanger.cn/category/114 免费字体栏，官方站下载须登录）。授权依《仓耳字库免费开源字体授权声明》2020-11-11，licenseUrl https://www.tsanger.cn/category/114。显示名取 name 表 Windows 简体中文 FamilyName「仓耳舒圆体 W05」。",
  "oss_path": "/fonts-packages/TsangerShuYuanTW05",
  "status": "published"
 }
];

(async () => {
  const c = createClient({ url: 'file:/app/data/prod.db' });

  // ---------- 0. backup (VACUUM INTO) ----------
  let bak = '/app/data/prod.db.bak-20260924-preTsanger15';
  if (fs.existsSync(bak)) bak = '/app/data/prod.db.bak-20260924-preTsanger15b';
  if (fs.existsSync(bak)) { console.error('backup target exists, aborting:', bak); process.exit(1); }
  await c.execute(`VACUUM INTO '${bak}'`);
  console.log('backup written:', bak);

  const before = await c.execute('select count(*) n from fonts');
  const n0 = Number(before.rows[0].n);
  console.log('fonts rows before:', n0);

  // ---------- 1. dedup check ALL first ----------
  for (const f of FONTS) {
    const dup = await c.execute({
      sql: 'select font_family, normalized_name, name, status from fonts where font_family=? or normalized_name=? or name=? or chinese_name=?',
      args: [f.font_family, f.normalized_name, f.name, f.name],
    });
    if (dup.rows.length) {
      console.error('DUP FOUND — aborting before any insert:', JSON.stringify({ incoming: f.font_family, existing: dup.rows }));
      process.exit(1);
    }
  }
  console.log('dedup check passed for', FONTS.length, 'fonts');

  // ---------- 2. insert ----------
  const ids = {};
  for (const f of FONTS) {
    const weightsJson = JSON.stringify(f.weights);
    await c.execute({
      sql: `insert into fonts (id, normalized_name, name, english_name, chinese_name, font_family, original_name,
            weights, version, copyright, description, designer, foundry, release_year,
            font_category, category_id, brand_id, tags, font_tags, languages, use_cases,
            license, license_type, license_description, oss_path,
            view_count, download_count, api_call_count, created_at, updated_at, status)
            values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,strftime('%s','now'),strftime('%s','now'),'published')`,
      args: [
        (ids[f.font_family] = randomUUID()),
        f.normalized_name, f.name, f.english_name, f.chinese_name, f.font_family, f.original_name,
        weightsJson, f.version, f.copyright, f.description, f.designer, f.foundry, f.release_year,
        f.font_category, f.category_id, f.brand_id,
        JSON.stringify(f.tags), JSON.stringify(f.font_tags), JSON.stringify(f.languages), JSON.stringify(f.use_cases),
        f.license, f.license_type, f.license_description, f.oss_path,
      ],
    });
    console.log('inserted', f.font_family, f.name);
  }

  // ---------- 3. verify ----------
  const after = await c.execute('select count(*) n from fonts');
  const n1 = Number(after.rows[0].n);
  console.log('fonts rows after:', n1, '(delta', n1 - n0, ')');
  if (n1 - n0 !== FONTS.length) { console.error('COUNT MISMATCH'); process.exit(1); }

  const chk = await c.execute({
    sql: `select font_family, normalized_name, name, license, license_type, brand_id, foundry, status, oss_path
          from fonts where font_family glob 'wenfeng-ceyyt[1-5]' or font_family glob 'wenfeng-ceym[1-5]'
          or font_family glob 'wenfeng-cefb[1-5]' or font_family glob 'wenfeng-cesyt[2-5]'
          order by font_family`,
    args: [],
  });
  console.log('VERIFY rows:', chk.rows.length);
  for (const row of chk.rows) console.log(' ', JSON.stringify(row));
  fs.writeFileSync('/app/tsanger15-ids.json', JSON.stringify(ids, null, 1));
  console.log('ids written to /app/tsanger15-ids.json');
  const brandCnt = await c.execute({
    sql: 'select count(*) n from fonts where brand_id=? and status=?',
    args: ['05a1be7d-f462-5fc7-a1ef-5591e1379a42', 'published'],
  });
  console.log('tsanger brand published fonts:', Number(brandCnt.rows[0].n));
})().catch((e) => { console.error(e); process.exit(1); });
