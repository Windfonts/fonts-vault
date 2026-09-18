/**
 * License honesty gate (P0-2).
 * Empty / platform-URL-only licenses must never present as safe 免费商用.
 * Non-redistributable SKUs should not get public CSS/CDN.
 */

export type LicenseFlags = {
  /** Safe to show 免费商用 chip */
  freeCommercialBadge: boolean;
  /** May emit public /api/css */
  cssAllowed: boolean;
  /** Prefer SPDX / contact wording on detail */
  displayLabel: string;
  reason?: string;
};

const URL_ONLY = /^https?:\/\//i;
const PAID_HINT = /付费|购买|联系|须授权|需授权|商用须|试用|个人免费/i;
const PLATFORM_HINT = /58pic|千图|izihun|站酷|创客贴|摄图|钉钉|阿里巴巴普惠/i;

export function evaluateLicense(input: {
  license?: string | null;
  licenseType?: string | null;
}): LicenseFlags {
  const license = (input.license || "").trim();
  const licenseType = (input.licenseType || "").trim();
  const typeIsFreeCommercial =
    licenseType === "free_commercial" ||
    licenseType === "免费商用" ||
    /免费商用/.test(licenseType);

  if (!license) {
    return {
      freeCommercialBadge: false,
      cssAllowed: !typeIsFreeCommercial, // still serve if historically free type, but no free-commercial chip
      displayLabel: licenseType && !typeIsFreeCommercial ? licenseType : "授权待核实",
      reason: "empty-license",
    };
  }

  if (URL_ONLY.test(license) && license.split(/\s+/).length === 1) {
    return {
      freeCommercialBadge: false,
      cssAllowed: false,
      displayLabel: "联系授权",
      reason: "url-only-license",
    };
  }

  if (PAID_HINT.test(license) || PAID_HINT.test(licenseType) || /付费授权|联系授权|试用版|个人免费/.test(licenseType)) {
    const label =
      /个人免费/.test(licenseType) || /个人免费/.test(license)
        ? "个人免费"
        : /试用/.test(licenseType) || /试用/.test(license)
          ? "试用版"
          : /付费/.test(licenseType) || /付费|购买/.test(license)
            ? "付费授权"
            : "联系授权";
    return {
      freeCommercialBadge: false,
      cssAllowed: false,
      displayLabel: label,
      reason: "restricted",
    };
  }

  if (PLATFORM_HINT.test(license) || PLATFORM_HINT.test(licenseType)) {
    return {
      freeCommercialBadge: false,
      cssAllowed: false,
      displayLabel: "平台授权（请核对原文）",
      reason: "platform-terms",
    };
  }

  // Honest free-commercial only when both type claims it AND license text is non-empty non-URL
  if (typeIsFreeCommercial) {
    return {
      freeCommercialBadge: true,
      cssAllowed: true,
      displayLabel: "免费商用",
    };
  }

  return {
    freeCommercialBadge: false,
    cssAllowed: true,
    displayLabel: licenseType || "见授权协议",
  };
}
