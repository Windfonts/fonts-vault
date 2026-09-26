import { logger } from '@/lib/logger';

/**
 * TTF → WOFF2 via wawoff2 (wasm). OTF/other may fail — caller keeps original.
 */
export async function compressToWoff2(input: Buffer): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wawoff2 = require('wawoff2') as {
    compress: (data: Uint8Array | Buffer) => Promise<Uint8Array>;
  };
  const out = await wawoff2.compress(input);
  return Buffer.from(out);
}

export async function tryCompressToWoff2(
  input: Buffer,
  label: string
): Promise<Buffer | null> {
  try {
    const out = await compressToWoff2(input);
    if (!out.length) return null;
    return out;
  } catch (error) {
    logger.warn('[tryCompressToWoff2] skipped', {
      label,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
