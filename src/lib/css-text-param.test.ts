import { describe, expect, it } from 'vitest';
import { cssTextParamForbidden } from './css-text-param';

describe('cssTextParamForbidden', () => {
  it('rejects text= when present, including empty', () => {
    expect(cssTextParamForbidden(new URLSearchParams('family=ibmps&text=春'))).toBe(true);
    expect(cssTextParamForbidden(new URLSearchParams('family=ibmps&text='))).toBe(true);
    expect(cssTextParamForbidden(new URLSearchParams('text=hello&subset=zh'))).toBe(true);
  });

  it('allows named subsets without text=', () => {
    expect(cssTextParamForbidden(new URLSearchParams('family=ibmps&subset=zh-common'))).toBe(
      false
    );
    expect(cssTextParamForbidden(new URLSearchParams('family=ibmps&subset=zh'))).toBe(false);
    expect(cssTextParamForbidden(new URLSearchParams('family=ibmps&subset=full'))).toBe(false);
    expect(cssTextParamForbidden(new URLSearchParams('family=ibmps&subset=en'))).toBe(false);
    expect(cssTextParamForbidden(new URLSearchParams('family=ibmps&lang=zh'))).toBe(false);
  });

  it('does not treat project t= as text=', () => {
    expect(cssTextParamForbidden(new URLSearchParams('t=春&family=ibmps'))).toBe(false);
  });
});
