import { describe, expect, it } from 'vitest';
import {
  clipFallbackCss,
  collectUnicodeRanges,
  formatUnicodeRange,
  mergeRanges,
  parseUnicodeRangeValue,
  subtractRanges,
} from './css-unicode-range';

describe('css-unicode-range', () => {
  it('parses and merges overlapping ranges', () => {
    const ranges = parseUnicodeRangeValue('U+4E00-4E10, U+4E08-4E20, U+3000');
    expect(mergeRanges(ranges)).toEqual([
      [0x3000, 0x3000],
      [0x4e00, 0x4e20],
    ]);
  });

  it('subtracts primary coverage from fallback ranges', () => {
    const from: [number, number][] = [
      [0x4e00, 0x4e20],
      [0x5000, 0x5010],
    ];
    const cut: [number, number][] = [[0x4e08, 0x4e18]];
    expect(subtractRanges(from, cut)).toEqual([
      [0x4e00, 0x4e07],
      [0x4e19, 0x4e20],
      [0x5000, 0x5010],
    ]);
  });

  it('clips fallback @font-face to primary gaps only', () => {
    const primary = `
@font-face{font-family:"a";src:url(a.woff2);unicode-range:U+4E00-4E10;}
`;
    const fallback = `
@font-face{font-family:"b";src:url(b0.woff2);unicode-range:U+4E00-4E20;}
@font-face{font-family:"b";src:url(b1.woff2);unicode-range:U+5000-5010;}
@font-face{font-family:"b";src:url(b2.woff2);unicode-range:U+4E05-4E08;}
`;
    const clipped = clipFallbackCss(primary, fallback);
    expect(clipped).toContain('b0.woff2');
    expect(clipped).toContain('b1.woff2');
    expect(clipped).not.toContain('b2.woff2');
    expect(clipped).toContain(formatUnicodeRange([[0x4e11, 0x4e20]]));
    expect(collectUnicodeRanges(clipped)).toEqual([
      [0x4e11, 0x4e20],
      [0x5000, 0x5010],
    ]);
  });

  it('drops faces fully covered by primary', () => {
    const primary = '@font-face{unicode-range:U+4E00-9FFF;}';
    const fallback = '@font-face{font-family:"b";src:url(x.woff2);unicode-range:U+4E00-4E10;}';
    expect(clipFallbackCss(primary, fallback)).toBe('');
  });
});
