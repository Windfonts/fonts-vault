import { createHmac } from 'crypto';
import { logger } from '@/lib/logger';

export type OssPutResult = {
  bucket: string;
  objectKey: string;
  url: string;
};

function requiredEnv(): {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  endpointHost: string;
} | null {
  const accessKeyId = (process.env.OSS_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.OSS_ACCESS_KEY_SECRET || '').trim();
  const bucket = (process.env.OSS_BUCKET || '').trim();
  const region = (process.env.OSS_REGION || '').trim();
  if (!accessKeyId || !accessKeySecret || !bucket || !region) return null;

  const endpointRaw = (process.env.OSS_ENDPOINT || '').trim();
  let endpointHost = '';
  if (endpointRaw) {
    try {
      const u = new URL(endpointRaw.includes('://') ? endpointRaw : `https://${endpointRaw}`);
      endpointHost = u.host;
    } catch {
      endpointHost = '';
    }
  }
  // Prefer real OSS host; CDN domains cannot accept PUT with OSS auth
  const looksLikeOss =
    endpointHost.includes('.aliyuncs.com') || endpointHost.includes('.aliyun.com');
  if (!looksLikeOss) {
    endpointHost = `${bucket}.${region}.aliyuncs.com`;
  }

  return { accessKeyId, accessKeySecret, bucket, region, endpointHost };
}

/** Whether OSS credentials are present (approve can push). */
export function ossConfigured(): boolean {
  if (process.env.UPLOAD_OSS_SKIP === '1' || process.env.UPLOAD_OSS_SKIP === 'true') {
    return false;
  }
  return !!requiredEnv();
}

/**
 * PUT one object to Aliyun OSS (V1 signature). Private ACL by default.
 * Returns null when OSS is not configured / skipped.
 */
export async function ossPutObject(opts: {
  objectKey: string;
  body: Buffer;
  contentType?: string;
}): Promise<OssPutResult | null> {
  const cfg = requiredEnv();
  if (!cfg || process.env.UPLOAD_OSS_SKIP === '1' || process.env.UPLOAD_OSS_SKIP === 'true') {
    return null;
  }

  const objectKey = opts.objectKey.replace(/^\/+/, '');
  const contentType = opts.contentType || 'application/octet-stream';
  const date = new Date().toUTCString();
  const resource = `/${cfg.bucket}/${objectKey}`;
  const stringToSign = `PUT\n\n${contentType}\n${date}\n${resource}`;
  const signature = createHmac('sha1', cfg.accessKeySecret).update(stringToSign).digest('base64');
  const url = `https://${cfg.endpointHost}/${objectKey}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Date: date,
      'Content-Type': contentType,
      'Content-Length': String(opts.body.length),
      'x-oss-object-acl': 'private',
      Authorization: `OSS ${cfg.accessKeyId}:${signature}`,
    },
    body: new Uint8Array(opts.body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('[ossPutObject] failed', {
      status: res.status,
      objectKey,
      body: text.slice(0, 400),
    });
    throw Object.assign(new Error(`OSS 上传失败（${res.status}）`), {
      status: 502,
      code: 'oss_put_failed',
    });
  }

  return { bucket: cfg.bucket, objectKey, url };
}
