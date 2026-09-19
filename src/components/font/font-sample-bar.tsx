'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFontSample } from '@/hooks/use-font-sample';

const SIZES = [16, 24, 32, 36, 48, 64, 72, 96];

export function FontSampleBar() {
  const { sampleText, setSampleText, sampleSize, setSampleSize } = useFontSample();

  return (
    <div className="bg-background/95 sticky top-14 z-20 -mx-1 mb-4 space-y-3 border-b px-1 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="shared-sample" className="text-xs text-muted-foreground">
            共用样句（改这里，整表跟变）
          </Label>
          <Input
            id="shared-sample"
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            placeholder="输入文字，即时预览…"
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-48">
          <Label htmlFor="shared-size" className="text-xs text-muted-foreground">
            字号 {sampleSize}px
          </Label>
          <input
            id="shared-size"
            type="range"
            min={12}
            max={108}
            step={2}
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            className="w-full accent-foreground"
            list="vault-sample-sizes"
          />
          <datalist id="vault-sample-sizes">
            {SIZES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}
