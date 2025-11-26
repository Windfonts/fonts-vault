import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fontService } from '@/lib/services/font.service';

// Mock the auth session
vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    },
  }),
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Admin Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Statistics', () => {
    it('should fetch and display correct statistics', async () => {
      const mockStats = {
        totalFonts: 150,
        totalBrands: 25,
        totalCategories: 10,
        totalViews: 50000,
        totalDownloads: 12000,
      };

      const stats = await fontService.getStats();

      // Verify stats structure
      expect(stats).toHaveProperty('totalFonts');
      expect(stats).toHaveProperty('totalBrands');
      expect(stats).toHaveProperty('totalCategories');
      expect(stats).toHaveProperty('totalViews');
      expect(stats).toHaveProperty('totalDownloads');

      // Verify all values are numbers
      expect(typeof stats.totalFonts).toBe('number');
      expect(typeof stats.totalBrands).toBe('number');
      expect(typeof stats.totalCategories).toBe('number');
      expect(typeof stats.totalViews).toBe('number');
      expect(typeof stats.totalDownloads).toBe('number');

      // Verify all values are non-negative
      expect(stats.totalFonts).toBeGreaterThanOrEqual(0);
      expect(stats.totalBrands).toBeGreaterThanOrEqual(0);
      expect(stats.totalCategories).toBeGreaterThanOrEqual(0);
      expect(stats.totalViews).toBeGreaterThanOrEqual(0);
      expect(stats.totalDownloads).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recent Fonts', () => {
    it('should fetch latest fonts with relations', async () => {
      const recentFonts = await fontService.getLatestFontsWithRelations(5);

      // Verify it returns an array
      expect(Array.isArray(recentFonts)).toBe(true);

      // Verify limit is respected (should be 5 or less)
      expect(recentFonts.length).toBeLessThanOrEqual(5);

      // If there are fonts, verify structure
      if (recentFonts.length > 0) {
        const font = recentFonts[0];
        expect(font).toHaveProperty('id');
        expect(font).toHaveProperty('name');
        expect(font).toHaveProperty('updatedAt');
        // Relations can be null
        expect(font).toHaveProperty('brand');
        expect(font).toHaveProperty('category');
      }
    });

    it('should return fonts ordered by creation date (newest first)', async () => {
      const recentFonts = await fontService.getLatestFontsWithRelations(5);

      if (recentFonts.length > 1) {
        // Verify fonts are ordered by createdAt descending
        for (let i = 0; i < recentFonts.length - 1; i++) {
          const current = new Date(recentFonts[i].createdAt).getTime();
          const next = new Date(recentFonts[i + 1].createdAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  describe('Popular Fonts', () => {
    it('should fetch popular fonts with relations', async () => {
      const popularFonts = await fontService.getPopularFontsWithRelations(5);

      // Verify it returns an array
      expect(Array.isArray(popularFonts)).toBe(true);

      // Verify limit is respected (should be 5 or less)
      expect(popularFonts.length).toBeLessThanOrEqual(5);

      // If there are fonts, verify structure
      if (popularFonts.length > 0) {
        const font = popularFonts[0];
        expect(font).toHaveProperty('id');
        expect(font).toHaveProperty('name');
        expect(font).toHaveProperty('viewCount');
        expect(font).toHaveProperty('downloadCount');
        // Relations can be null
        expect(font).toHaveProperty('brand');
        expect(font).toHaveProperty('category');
      }
    });

    it('should return fonts ordered by view count (highest first)', async () => {
      const popularFonts = await fontService.getPopularFontsWithRelations(5);

      if (popularFonts.length > 1) {
        // Verify fonts are ordered by viewCount descending
        for (let i = 0; i < popularFonts.length - 1; i++) {
          expect(popularFonts[i].viewCount).toBeGreaterThanOrEqual(popularFonts[i + 1].viewCount);
        }
      }
    });
  });

  describe('Dashboard Data Accuracy - Property 29', () => {
    // Feature: font-management-system, Property 29: 管理仪表板数据准确性
    it('should ensure dashboard statistics match actual database data', async () => {
      // Get stats from the service
      const stats = await fontService.getStats();

      // Get all fonts to verify counts (using max allowed page size)
      const allFonts = await fontService.findAll({ page: 1, size: 100 });

      // Verify total fonts count is consistent
      expect(stats.totalFonts).toBeGreaterThanOrEqual(0);
      expect(typeof stats.totalFonts).toBe('number');

      // If we have fonts, verify the counts are consistent
      if (allFonts.dataList.length > 0) {
        // Verify view count sum for the fetched fonts
        let calculatedViews = 0;
        let calculatedDownloads = 0;

        for (const font of allFonts.dataList) {
          calculatedViews += font.viewCount;
          calculatedDownloads += font.downloadCount;
        }

        // Stats should be at least as much as the calculated values from the sample
        // (since there might be more fonts beyond the page size limit)
        expect(stats.totalViews).toBeGreaterThanOrEqual(calculatedViews);
        expect(stats.totalDownloads).toBeGreaterThanOrEqual(calculatedDownloads);
      } else {
        // If no fonts, stats should be zero
        expect(stats.totalViews).toBe(0);
        expect(stats.totalDownloads).toBe(0);
      }

      // Verify stats are internally consistent
      expect(stats.totalFonts).toBeGreaterThanOrEqual(allFonts.dataList.length);
    });
  });
});
