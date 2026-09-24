/**
 * unicode-range 区间运算：用于谱系/简繁补全时裁切补全款 @font-face，
 * 只保留主款未覆盖的码点，从根源避免双份分片下载。
 */

export type CodeRange = [number, number];

/** 解析 CSS 文本中所有 unicode-range 声明，合并为有序区间 */
export function collectUnicodeRanges(css: string): CodeRange[] {
  const ranges: CodeRange[] = [];
  const re = /unicode-range\s*:\s*([^;}]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    parseUnicodeRangeValue(m[1]).forEach((r) => ranges.push(r));
  }
  return mergeRanges(ranges);
}

export function parseUnicodeRangeValue(value: string): CodeRange[] {
  const out: CodeRange[] = [];
  String(value || '')
    .split(',')
    .forEach((tok) => {
      const body = tok.trim().replace(/^u\+/i, '');
      if (!body) return;
      let lo: number;
      let hi: number;
      if (body.includes('?')) {
        lo = parseInt(body.replace(/\?/g, '0'), 16);
        hi = parseInt(body.replace(/\?/g, 'f'), 16);
      } else if (body.includes('-')) {
        const p = body.split('-');
        lo = parseInt(p[0], 16);
        hi = parseInt(p[1], 16);
      } else {
        lo = hi = parseInt(body, 16);
      }
      if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) out.push([lo, hi]);
    });
  return out;
}

export function mergeRanges(ranges: CodeRange[]): CodeRange[] {
  if (!ranges.length) return [];
  const sorted = ranges.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: CodeRange[] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const [lo, hi] = sorted[i];
    const last = out[out.length - 1];
    if (lo <= last[1] + 1) {
      last[1] = Math.max(last[1], hi);
    } else {
      out.push([lo, hi]);
    }
  }
  return out;
}

/** from 减去 cut：保留 from 中不被 cut 覆盖的部分 */
export function subtractRanges(from: CodeRange[], cut: CodeRange[]): CodeRange[] {
  if (!from.length) return [];
  if (!cut.length) return mergeRanges(from);
  const cuts = mergeRanges(cut);
  let cur = mergeRanges(from);
  for (const [cLo, cHi] of cuts) {
    const next: CodeRange[] = [];
    for (const [lo, hi] of cur) {
      if (cHi < lo || cLo > hi) {
        next.push([lo, hi]);
        continue;
      }
      if (lo < cLo) next.push([lo, Math.min(hi, cLo - 1)]);
      if (hi > cHi) next.push([Math.max(lo, cHi + 1), hi]);
    }
    cur = next;
  }
  return mergeRanges(cur);
}

export function formatUnicodeRange(ranges: CodeRange[]): string {
  return ranges
    .map(([lo, hi]) => {
      const a = lo.toString(16).toUpperCase();
      const b = hi.toString(16).toUpperCase();
      return lo === hi ? `U+${a}` : `U+${a}-${b}`;
    })
    .join(',');
}

const FACE_RE = /@font-face\s*\{[^}]*\}/gi;

/**
 * 将补全款 CSS 的每个 @font-face 的 unicode-range 裁成「主款未覆盖」的差集。
 * 差集为空的 face 丢弃。无 unicode-range 的 face 保守丢弃（避免全量回退坑）。
 */
export function clipFallbackCss(primaryCss: string, fallbackCss: string): string {
  const primary = collectUnicodeRanges(primaryCss);
  const faces = fallbackCss.match(FACE_RE) || [];
  const kept: string[] = [];

  for (const face of faces) {
    const rangeMatch = /unicode-range\s*:\s*([^;}]+)/i.exec(face);
    if (!rangeMatch) continue;
    const faceRanges = parseUnicodeRangeValue(rangeMatch[1]);
    const clipped = subtractRanges(faceRanges, primary);
    if (!clipped.length) continue;
    const next = face.replace(
      /unicode-range\s*:\s*[^;}]+/i,
      `unicode-range:${formatUnicodeRange(clipped)}`
    );
    kept.push(next);
  }

  if (!kept.length) return '';
  return (
    `/* fallback clipped to primary gaps · faces ${kept.length} */\n` + kept.join('\n')
  );
}
