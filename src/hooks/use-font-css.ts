import { useEffect, useRef } from 'react';

// 全局记录已加载的字体，避免重复加载
const loadedFonts = new Set<string>();

interface UseFontCSSOptions {
  family: string;
  weight?: string;
  version?: 'en' | 'zh' | 'zh-common' | 'full';
  enabled?: boolean;
}

/**
 * 动态加载字体 CSS 的 Hook
 *
 * @param options.family - 字体的 normalizedName
 * @param options.weight - 字重名称，默认 'Regular'
 * @param options.version - 版本，默认 'full'
 * @param options.enabled - 是否启用加载，默认 true
 *
 * @example
 * // 在卡片中使用 zh-common 版本
 * useFontCSS({ family: 'Qtxtt', weight: 'Regular', version: 'zh-common' });
 *
 * // 在详情页使用 full 版本
 * useFontCSS({ family: 'Qtxtt', weight: 'Regular', version: 'full' });
 */
export function useFontCSS({
  family,
  weight = 'Regular',
  version = 'full',
  enabled = true,
}: UseFontCSSOptions) {
  const linkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    if (!enabled || !family) {
      return;
    }

    // 生成唯一标识
    const fontKey = `${family}-${weight}-${version}`;

    // 如果已经加载过，跳过
    if (loadedFonts.has(fontKey)) {
      return;
    }

    // 构建 CSS API URL
    const cssUrl = `/api/css?family=${encodeURIComponent(family)}&weight=${encodeURIComponent(weight)}&version=${version}`;

    // 检查是否已经存在相同的 link 标签
    const existingLink = document.querySelector(`link[href="${cssUrl}"]`) as HTMLLinkElement;

    if (existingLink) {
      linkRef.current = existingLink;
      loadedFonts.add(fontKey);
      return;
    }

    // 创建新的 link 标签
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.dataset.fontKey = fontKey;

    // 添加加载成功/失败的处理
    link.onload = () => {
      loadedFonts.add(fontKey);
      console.log(`[useFontCSS] 字体 CSS 加载成功: ${fontKey}`);
    };

    link.onerror = () => {
      console.error(`[useFontCSS] 字体 CSS 加载失败: ${fontKey}`);
    };

    // 添加到 head
    document.head.appendChild(link);
    linkRef.current = link;

    // 清理函数：组件卸载时不移除 link 标签，因为其他组件可能还在使用
    // 只在页面完全卸载时才会清理
    return () => {
      // 不做任何清理，让字体 CSS 保持加载状态
      // 这样可以避免在列表滚动时反复加载/卸载
    };
  }, [family, weight, version, enabled]);

  return {
    isLoaded: loadedFonts.has(`${family}-${weight}-${version}`),
  };
}

/**
 * 预加载字体 CSS（不依赖组件生命周期）
 */
export function preloadFontCSS(
  family: string,
  weight: string = 'Regular',
  version: 'en' | 'zh' | 'zh-common' | 'full' = 'full'
) {
  const fontKey = `${family}-${weight}-${version}`;

  if (loadedFonts.has(fontKey)) {
    return;
  }

  const cssUrl = `/api/css?family=${encodeURIComponent(family)}&weight=${encodeURIComponent(weight)}&version=${version}`;

  const existingLink = document.querySelector(`link[href="${cssUrl}"]`) as HTMLLinkElement;

  if (existingLink) {
    loadedFonts.add(fontKey);
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssUrl;
  link.dataset.fontKey = fontKey;

  link.onload = () => {
    loadedFonts.add(fontKey);
  };

  document.head.appendChild(link);
}

/**
 * 清除所有已加载的字体记录（用于测试或特殊场景）
 */
export function clearLoadedFonts() {
  loadedFonts.clear();
}
