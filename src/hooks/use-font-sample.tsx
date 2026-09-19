'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type FontSampleCtx = {
  sampleText: string;
  setSampleText: (v: string) => void;
  sampleSize: number;
  setSampleSize: (v: number) => void;
};

const Ctx = createContext<FontSampleCtx | null>(null);

export const DEFAULT_SAMPLE = '春风又绿江南岸，明月何时照我还。Windfonts 123';

export function FontSampleProvider({ children }: { children: ReactNode }) {
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE);
  const [sampleSize, setSampleSize] = useState(36);
  const value = useMemo(
    () => ({ sampleText, setSampleText, sampleSize, setSampleSize }),
    [sampleText, sampleSize]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFontSample() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      sampleText: DEFAULT_SAMPLE,
      setSampleText: () => undefined,
      sampleSize: 36,
      setSampleSize: () => undefined,
    };
  }
  return ctx;
}
