/**
 * 匿名 GET /api/css 不认 Google 式 text=。
 * 参数出现（含空值）即拒；具名 subset=zh-common|zh|full|en 不受影响。
 * 登录后项目切字走 /p/{slug}?t=，不走本参数。
 */
export function cssTextParamForbidden(
  searchParams: Pick<URLSearchParams, 'get'>
): boolean {
  return searchParams.get('text') !== null;
}
