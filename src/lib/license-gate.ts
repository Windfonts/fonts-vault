/**
 * License honesty gate (P0-2) — Foundry口径 LICENSE-METADATA-FOR-PRO.md
 *
 * Prefer Windfonts/font-licenses overlay (vendored as font-license-index.json).
 * Do NOT treat marketing licenseType「免费商用」as the sole gate.
 */

import licenseIndex from '@/data/font-license-index.json'

export type LicenseLabel =
  | 'ofl_ok'
  | 'apache_ok'
  | 'free_commercial'
  | 'free_commercial_unverified'
  | 'brand_terms'
  | 'needs_auth'
  | 'restricted'
  | 'gpl_review'
  | 'ipa'
  | 'sharealike'
  | 'high_risk'
  | 'review'
  | 'missing'

export type LicenseAssessment = {
  licenseSpdx: string | null
  commercialUse: boolean | null
  redistribution: boolean | null
  modification: boolean | null
  licenseLabel: LicenseLabel
  licenseUrl: string | null
  licenseSource: 'font-licenses' | 'heuristic' | 'manual'
  licenseVerified: boolean
  /** Strong green chip — only verified safe commercial */
  freeCommercialBadge: boolean
  /** Public /api/css allowed (redistribution-ish) */
  cssAllowed: boolean
  displayLabel: string
  reason?: string
}

type Overlay = {
  normalizedName: string
  type?: string | null
  spdx?: string | null
  licenseUrl?: string | null
  commercial?: boolean | null
  modification?: boolean | null
  distribution?: boolean | null
  embedding?: boolean | null
  webUse?: boolean | null
  attribution?: boolean | null
  shareAlike?: boolean | null
  verified?: boolean
  source?: string | null
  notes?: string | null
}

const INDEX = licenseIndex as Record<string, Overlay>

const URL_ONLY = /^https?:\/\//i
const PAID_HINT = /付费|购买|联系|须授权|需授权|商用须|试用|个人免费/i
const PLATFORM_HINT = /58pic|千图|izihun|站酷|创客贴|摄图|钉钉|阿里巴巴普惠|OPPO Sans|阿里妈妈/i
const BRAND_HINT = /阿里巴巴普惠|阿里汉仪|钉钉进步|OPPO Sans|品牌专属/i
const OFL_HINT = /SIL Open Font License|OFL-1\.1|\bOFL\b/i
const APACHE_HINT = /Apache-2\.0|Apache License/i
const GPL_HINT = /GPL|GNU General Public License/i
const IPA_HINT = /\bIPA\b|IPA Font License/i
const SA_HINT = /ShareAlike|CC BY-SA/i

function labelFromOverlay(o: Overlay): LicenseLabel {
  const spdx = (o.spdx || '').toUpperCase()
  if (spdx.includes('OFL'))
    return 'ofl_ok'
  if (spdx.includes('APACHE'))
    return 'apache_ok'
  if (spdx.includes('GPL'))
    return 'gpl_review'
  if (spdx.includes('IPA'))
    return 'ipa'

  const t = (o.type || '').trim()
  if (/联系授权|付费授权/.test(t))
    return 'needs_auth'
  if (/个人免费/.test(t))
    return 'restricted'
  if (o.shareAlike === true)
    return 'sharealike'
  if (o.commercial === false)
    return 'restricted'
  if (o.distribution === false && o.commercial !== true)
    return 'restricted'
  if (o.commercial === true && o.verified)
    return 'free_commercial'
  if (o.commercial === true && !o.verified)
    return 'free_commercial_unverified'
  if (/免费商用/.test(t) && !o.verified)
    return 'free_commercial_unverified'
  if (!t && o.commercial == null)
    return 'missing'
  return 'review'
}

/** Foundry LICENSE-TIER-DICTIONARY.md 中文短标 */
function displayFor(label: LicenseLabel, _fallback?: string | null): string {
  switch (label) {
    case 'ofl_ok':
      return '开源可商用'
    case 'apache_ok':
      return 'Apache 可商用'
    case 'free_commercial':
      return '可嵌入使用' // verified free-embed; 禁止「免费商用」绿标
    case 'free_commercial_unverified':
      return '待核实'
    case 'brand_terms':
      return '品牌协议'
    case 'needs_auth':
      return '需授权'
    case 'restricted':
      return '限制较多'
    case 'gpl_review':
      return '待核实'
    case 'ipa':
      return '限制较多'
    case 'sharealike':
      return '相同方式共享'
    case 'high_risk':
      return '不宜主推'
    case 'missing':
      return '待核实'
    default:
      return '待核实'
  }
}

/** 详情页「你能做什么」一句 */
export function licenseWhatYouCanDo(label: LicenseLabel): string {
  switch (label) {
    case 'ofl_ok':
      return '可免费用于网站与产品；保留许可声明；勿单独售卖字体文件。'
    case 'apache_ok':
      return '可免费用于网站与产品；遵循 Apache-2.0 声明要求。'
    case 'free_commercial':
      return '可按作者声明嵌入使用；再分发/改字前请读原文。'
    case 'free_commercial_unverified':
    case 'missing':
    case 'gpl_review':
    case 'review':
      return '条款尚未人工核实，上线嵌入前请先确认原文。'
    case 'brand_terms':
      return '须遵守品牌方专项协议，通常不可当开源字体再分发。'
    case 'needs_auth':
      return '需向权利方取得授权或购买后再用。'
    case 'restricted':
    case 'ipa':
      return '可用但限制较多（如禁止衍生），请读原文。'
    case 'sharealike':
      return '衍生作品须以相同协议共享，请读原文。'
    case 'high_risk':
      return '平台/来源条款风险高，不建议作为文风主推嵌入。'
    default:
      return '条款尚未人工核实，上线嵌入前请先确认原文。'
  }
}

/** 色点 token：ok | accent | warn | danger */
export function licenseDotToken(label: LicenseLabel): 'ok' | 'accent' | 'warn' | 'danger' {
  if (label === 'ofl_ok' || label === 'apache_ok') return 'ok'
  if (label === 'free_commercial') return 'accent'
  if (label === 'high_risk') return 'danger'
  return 'warn'
}


/** Heuristic when font-licenses overlay missing */
function heuristicLabel(license: string, licenseType: string): LicenseLabel {
  if (!license && !licenseType)
    return 'missing'
  if (OFL_HINT.test(license) || OFL_HINT.test(licenseType))
    return 'ofl_ok'
  if (APACHE_HINT.test(license) || APACHE_HINT.test(licenseType))
    return 'apache_ok'
  if (GPL_HINT.test(license) || GPL_HINT.test(licenseType))
    return 'gpl_review'
  if (IPA_HINT.test(license) || IPA_HINT.test(licenseType))
    return 'ipa'
  if (SA_HINT.test(license))
    return 'sharealike'
  if (BRAND_HINT.test(license) || BRAND_HINT.test(licenseType))
    return 'brand_terms'
  if (PLATFORM_HINT.test(license) || PLATFORM_HINT.test(licenseType))
    return 'high_risk'
  if (URL_ONLY.test(license) && license.split(/\s+/).length === 1)
    return 'needs_auth'
  if (PAID_HINT.test(license) || PAID_HINT.test(licenseType) || /付费授权|联系授权/.test(licenseType))
    return 'needs_auth'
  if (/个人免费/.test(licenseType) || /个人免费/.test(license))
    return 'restricted'
  if (/免费商用|free_commercial/.test(licenseType))
    return 'free_commercial_unverified'
  return 'review'
}

export function evaluateLicense(input: {
  normalizedName?: string | null
  license?: string | null
  licenseType?: string | null
}): LicenseAssessment {
  const license = (input.license || '').trim()
  const licenseType = (input.licenseType || '').trim()
  const name = (input.normalizedName || '').trim()
  const overlay = name ? INDEX[name] : undefined

  if (overlay) {
    let label = labelFromOverlay(overlay)
    // Brand / platform hints still apply on top of 「免费商用」marketing type
    const blob = `${license} ${licenseType} ${overlay.type || ''} ${overlay.notes || ''}`
    if (label === 'free_commercial_unverified' || label === 'free_commercial') {
      if (BRAND_HINT.test(blob))
        label = 'brand_terms'
      else if (PLATFORM_HINT.test(blob) || GPL_HINT.test(blob))
        label = label === 'free_commercial' ? 'review' : 'high_risk'
      else if (IPA_HINT.test(blob))
        label = 'ipa'
    }

    const verified = Boolean(overlay.verified)
    const commercial =
      overlay.commercial != null
        ? Boolean(overlay.commercial)
        : label === 'ofl_ok' || label === 'apache_ok' || label === 'free_commercial'
    const redistribution =
      overlay.distribution != null
        ? Boolean(overlay.distribution)
        : label === 'ofl_ok' || label === 'apache_ok'
    const modification =
      overlay.modification != null ? Boolean(overlay.modification) : label === 'ofl_ok'

    // Foundry: only ofl_ok/apache_ok get strong ok chip; free_embed never 「免费商用」绿标
    const freeCommercialBadge = label === 'ofl_ok' || label === 'apache_ok'

    const cssAllowed =
      label === 'ofl_ok'
      || label === 'apache_ok'
      || (redistribution && label !== 'needs_auth' && label !== 'restricted' && label !== 'high_risk' && label !== 'missing')
      || (label === 'free_commercial_unverified' && redistribution !== false)

    // Unverified free-commercial: allow CSS for preview but not strong badge
    // needs_auth / restricted / high_risk / missing → no public CSS
    const cssBlocked = ['needs_auth', 'restricted', 'high_risk', 'missing', 'brand_terms'].includes(label)

    return {
      licenseSpdx: overlay.spdx || null,
      commercialUse: commercial,
      redistribution,
      modification,
      licenseLabel: label,
      licenseUrl: overlay.licenseUrl || null,
      licenseSource: 'font-licenses',
      licenseVerified: verified,
      freeCommercialBadge,
      cssAllowed: cssBlocked ? false : cssAllowed,
      displayLabel: displayFor(label, licenseType || overlay.type),
      reason: `font-licenses:${label}`,
    }
  }

  const label = heuristicLabel(license, licenseType)
  const freeCommercialBadge = label === 'ofl_ok' || label === 'apache_ok'
  const cssBlocked = ['needs_auth', 'restricted', 'high_risk', 'missing', 'brand_terms'].includes(label)

  return {
    licenseSpdx: OFL_HINT.test(license) ? 'OFL-1.1' : APACHE_HINT.test(license) ? 'Apache-2.0' : null,
    commercialUse: freeCommercialBadge || label === 'free_commercial_unverified' ? true : label === 'needs_auth' ? false : null,
    redistribution: freeCommercialBadge ? true : cssBlocked ? false : null,
    modification: label === 'ofl_ok' ? true : null,
    licenseLabel: label,
    licenseUrl: URL_ONLY.test(license) ? license : null,
    licenseSource: 'heuristic',
    licenseVerified: false,
    freeCommercialBadge,
    cssAllowed: !cssBlocked && label !== 'gpl_review',
    displayLabel: displayFor(label, licenseType),
    reason: `heuristic:${label}`,
  }
}

/** Back-compat alias used by earlier P0 patch */
export function assessLicenseBadge(input: {
  normalizedName?: string | null
  license?: string | null
  licenseType?: string | null
}) {
  const a = evaluateLicense(input)
  return {
    freeCommercialBadge: a.freeCommercialBadge,
    cssAllowed: a.cssAllowed,
    displayLabel: a.displayLabel,
    reason: a.reason,
    licenseLabel: a.licenseLabel,
    licenseSpdx: a.licenseSpdx,
    licenseVerified: a.licenseVerified,
  }
}
