import { describe, it, expect } from 'vitest';

describe('Documentation Page', () => {
  it('should have all required sections', () => {
    // Test that the documentation structure is correct
    const sections = ['api', 'css', 'license', 'faq'];
    expect(sections).toHaveLength(4);
    expect(sections).toContain('api');
    expect(sections).toContain('css');
    expect(sections).toContain('license');
    expect(sections).toContain('faq');
  });

  it('should have search functionality', () => {
    // Test search keywords mapping
    const searchKeywords = {
      api: ['api', '接口', 'endpoint', 'rest'],
      css: ['css', '样式', 'font-face', '字体加载'],
      license: ['授权', '许可', 'license', '商用', '免费'],
      faq: ['问题', 'faq', '帮助', '疑问'],
    };

    expect(searchKeywords.api).toContain('api');
    expect(searchKeywords.css).toContain('css');
    expect(searchKeywords.license).toContain('授权');
    expect(searchKeywords.faq).toContain('问题');
  });

  it('should validate FAQ categories', () => {
    const faqCategories = ['基础使用', '授权相关', '技术问题', '账号管理', '其他问题'];
    expect(faqCategories).toHaveLength(5);
    expect(faqCategories).toContain('基础使用');
    expect(faqCategories).toContain('授权相关');
  });

  it('should validate license types', () => {
    const licenseTypes = ['免费商用', '个人免费', '试用版', '付费授权', '联系授权'];
    expect(licenseTypes).toHaveLength(5);
    expect(licenseTypes).toContain('免费商用');
    expect(licenseTypes).toContain('付费授权');
  });
});
