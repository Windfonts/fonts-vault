'use client';

import { loadFont } from '@windfonts/chinese-fonts';
import { useEffect } from 'react';

export function FontLoader() {
  useEffect(() => {
    const run = async () => {
      try {
        await loadFont('Prsxt-Regular', { subset: 'zh' });
      } catch (error) {
        try {
          await loadFont('Prsxt-Regular', { subset: 'zh-common' });
        } catch (error2) {
          try {
            await loadFont('Prsxt-Regular');
          } catch (error3) {
            // 如果所有尝试都失败，静默处理错误
            // 字体可能不存在或不支持任何 subset
            console.warn('Failed to load windfonts-yzklct font:', error3);
          }
        }
      }
    };
    void run();
  }, []);

  return null;
}
