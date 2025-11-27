import { EXTRA_LINKS, SAFE_CODE } from '@/constant/constant';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">文风字库</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              海量字体 · CDN 加速
              <br />
              实时预览 · 一键集成
              <br />
              授权透明 · 开发友好
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">快速链接</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  首页
                </Link>
              </li>
              <li>
                <Link
                  href="/fonts"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  字体列表
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  文档
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">资源</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  API 文档
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  使用指南
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">友情链接</h4>
            <ul className="space-y-2 text-sm">
              {EXTRA_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.path.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="text-muted-foreground mt-8 border-t pt-8 text-center text-sm">
          <p className="mb-2">{SAFE_CODE}</p>
        </div>
      </div>
    </footer>
  );
}
