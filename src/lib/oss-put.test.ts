import { describe, expect, it } from 'vitest';
import { canonicalizedOssHeaders } from '@/lib/oss-put';

describe('canonicalizedOssHeaders', () => {
  it('lowercases, sorts, and terminates with newline', () => {
    expect(
      canonicalizedOssHeaders({
        'X-Oss-Object-Acl': 'private',
        'x-oss-meta-a': '1',
      })
    ).toBe('x-oss-meta-a:1\nx-oss-object-acl:private\n');
  });

  it('returns empty when no x-oss headers', () => {
    expect(canonicalizedOssHeaders({ Date: 'x', 'Content-Type': 'a' })).toBe('');
  });
});
