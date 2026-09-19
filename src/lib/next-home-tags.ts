import type { VerticalTag } from '@/components/home/vertical-tag-nav';

/** next 首页/列表竖排气质词表 */
export const NEXT_HOME_LABELS = [
  '黑体',
  '宋体',
  '楷体',
  '隶书',
  '拼音',
  '硬笔手写',
  '毛笔书法',
  '卡通创意',
  '其他',
] as const;

type Cat = { id: string; name: string; slug: string };

export function resolveNextHomeTags(categories: Cat[]): VerticalTag[] {
  const bySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c]));
  const byName = new Map(categories.map((c) => [c.name, c]));

  const mapped: Record<string, string[]> = {
    黑体: ['sans-serif', '无衬线字体', 'hei', 'gothic'],
    宋体: ['song', '宋体', 'serif', '衬线'],
    楷体: ['kai', '楷体'],
    隶书: ['li', '隶书'],
    拼音: ['pinyin', '拼音'],
    硬笔手写: ['handwriting', '手写体', '硬笔'],
    毛笔书法: ['calligraphy', '书法', '毛笔'],
    卡通创意: ['cartoon', '创意', 'display'],
    其他: ['other', '其他'],
  };

  return NEXT_HOME_LABELS.map((label) => {
    const keys = mapped[label] || [label];
    for (const k of keys) {
      const hit = bySlug.get(k.toLowerCase()) || byName.get(k);
      if (hit && hit.slug !== 'mono' && hit.name !== 'Mono') {
        return { label, href: `/fonts?category=${hit.id}` };
      }
    }
    if (label === '其他') return { label, href: '/fonts' };
    return { label, href: `/fonts?search=${encodeURIComponent(label)}` };
  });
}
