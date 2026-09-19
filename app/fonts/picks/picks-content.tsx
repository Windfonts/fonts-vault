'use client';

import { Button } from '@/components/ui/button';
import { useFontCSS } from '@/hooks/use-font-css';
import { DEFAULT_SAMPLE } from '@/hooks/use-font-sample';
import { getPicks, removePick, type FontPick } from '@/lib/font-picks';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function PickRow({ pick, text }: { pick: FontPick; text: string }) {
  useFontCSS({ family: pick.normalizedName.toLowerCase(), version: 'zh-common' });
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link href={`/fonts/${pick.normalizedName.toLowerCase()}`} className="font-semibold hover:underline">
          {pick.name}
        </Link>
        <Button type="button" size="sm" variant="ghost" onClick={() => removePick(pick.id)}>
          移除
        </Button>
      </div>
      <div style={{ fontFamily: pick.fontFamily, fontSize: 28 }} className="break-words">
        {text}
      </div>
    </div>
  );
}

export function PicksContent() {
  const [list, setList] = useState<FontPick[]>([]);
  const [copied, setCopied] = useState(false);
  const text = DEFAULT_SAMPLE;

  useEffect(() => {
    const sync = () => setList(getPicks());
    sync();
    window.addEventListener('windfonts-picks-changed', sync);
    return () => window.removeEventListener('windfonts-picks-changed', sync);
  }, []);

  const cssBlob = useMemo(() => {
    return list
      .map(
        (p) =>
          `/* ${p.name} */\n@import url('/api/css?family=${encodeURIComponent(p.normalizedName.toLowerCase())}&weight=regular&version=zh-common');`
      )
      .join('\n\n');
  }, [list]);

  if (!list.length) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        还没有选字。去 <Link className="underline" href="/fonts">字帖列表</Link> 点「加入选字」。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(cssBlob);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? '已复制' : '批量复制 CSS'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/fonts">继续选字</Link>
        </Button>
      </div>
      <div className="space-y-4">
        {list.map((p) => (
          <PickRow key={p.id} pick={p} text={text} />
        ))}
      </div>
    </div>
  );
}
