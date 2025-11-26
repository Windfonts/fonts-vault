'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// 表单验证 schema
const fontFormSchema = z.object({
  name: z.string().min(1, '字体名称不能为空').max(255),
  englishName: z.string().max(255).optional().or(z.literal('')),
  chineseName: z.string().max(255).optional().or(z.literal('')),
  fontFamily: z.string().min(1, '字体族不能为空').max(255),
  normalizedName: z.string().min(1, '标准化名称不能为空').max(255),
  version: z.string().min(1, '版本号不能为空'),
  description: z.string().optional().or(z.literal('')),
  designer: z.string().max(255).optional().or(z.literal('')),
  foundry: z.string().max(255).optional().or(z.literal('')),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  license: z.string().optional().or(z.literal('')),
  licenseType: z.string().optional(),
  ossPath: z.string().min(1, 'OSS路径不能为空'),
  tags: z.string().optional().or(z.literal('')),
  fontTags: z.string().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'offline']),
});

type FontFormValues = z.infer<typeof fontFormSchema>;

interface Font {
  id: string;
  name: string;
  englishName?: string | null;
  chineseName?: string | null;
  fontFamily: string;
  normalizedName: string;
  version: string;
  description?: string | null;
  designer?: string | null;
  foundry?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  license?: string | null;
  licenseType?: string | null;
  ossPath: string;
  tags?: string[];
  fontTags?: string[];
  weights?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'offline';
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Style {
  id: string;
  name: string;
  slug: string;
}

interface FontFormProps {
  font?: Font;
  brands: Brand[];
  categories: Category[];
  styles: Style[];
  mode: 'create' | 'edit';
}

export function FontForm({ font, brands, categories, styles, mode }: FontFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化表单
  const form = useForm<FontFormValues>({
    resolver: zodResolver(fontFormSchema),
    defaultValues: {
      name: font?.name || '',
      englishName: font?.englishName || '',
      chineseName: font?.chineseName || '',
      fontFamily: font?.fontFamily || '',
      normalizedName: font?.normalizedName || '',
      version: font?.version || '1.0.0',
      description: font?.description || '',
      designer: font?.designer || '',
      foundry: font?.foundry || '',
      categoryId: font?.categoryId || 'none',
      brandId: font?.brandId || 'none',
      license: font?.license || '',
      licenseType: font?.licenseType || 'none',
      ossPath: font?.ossPath || '',
      tags: font?.tags ? font.tags.join(', ') : '',
      fontTags: font?.fontTags ? font.fontTags.join(', ') : '',
      status: font?.status || 'published',
    },
  });

  // 提交表单
  const onSubmit = async (values: FontFormValues) => {
    setIsSubmitting(true);
    try {
      // 处理标签（将逗号分隔的字符串转换为数组）
      const tags = values.tags
        ? values.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const fontTags = values.fontTags
        ? values.fontTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload = {
        ...values,
        englishName: values.englishName || null,
        chineseName: values.chineseName || null,
        description: values.description || null,
        designer: values.designer || null,
        foundry: values.foundry || null,
        categoryId: values.categoryId && values.categoryId !== 'none' ? values.categoryId : null,
        brandId: values.brandId && values.brandId !== 'none' ? values.brandId : null,
        license: values.license || null,
        licenseType:
          values.licenseType && values.licenseType !== 'none' ? values.licenseType : null,
        tags,
        fontTags,
        // 如果是编辑模式，保留原有的 weights 数据
        weights: font?.weights || {},
      };

      const url = mode === 'create' ? '/api/fonts' : `/api/fonts/${font?.normalizedName}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '操作失败');
      }

      await response.json();
      toast.success(mode === 'create' ? '字体创建成功' : '字体更新成功');
      router.push('/admin/fonts');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    router.push('/admin/fonts');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>字体名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：思源黑体" {...field} />
                    </FormControl>
                    <FormDescription>显示名称（优先使用中文名）</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fontFamily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>字体族 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：Source Han Sans"
                        {...field}
                        disabled={mode === 'edit'}
                      />
                    </FormControl>
                    <FormDescription>CSS font-family 值，创建后不可修改</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="englishName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>英文名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：Source Han Sans" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chineseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>中文名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：思源黑体" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="normalizedName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标准化名称 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：source-han-sans"
                        {...field}
                        disabled={mode === 'edit'}
                      />
                    </FormControl>
                    <FormDescription>唯一标识符，创建后不可修改</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>版本号 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：1.0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea placeholder="字体的详细描述..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 分类和品牌 */}
        <Card>
          <CardHeader>
            <CardTitle>分类和品牌</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>字体分类</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">无分类</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>品牌商</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择品牌" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">无品牌</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="designer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>设计师</FormLabel>
                    <FormControl>
                      <Input placeholder="字体设计师" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="foundry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>字体厂商</FormLabel>
                    <FormControl>
                      <Input placeholder="字体制造商" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 授权信息 */}
        <Card>
          <CardHeader>
            <CardTitle>授权信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权类型</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择授权类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">未指定</SelectItem>
                        <SelectItem value="free_commercial">免费商用</SelectItem>
                        <SelectItem value="free_personal">个人免费</SelectItem>
                        <SelectItem value="trial">试用版</SelectItem>
                        <SelectItem value="paid">付费</SelectItem>
                        <SelectItem value="contact">联系授权</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权协议</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：SIL Open Font License" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 状态控制 */}
        <Card>
          <CardHeader>
            <CardTitle>状态控制</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>发布状态 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="published">已发布</SelectItem>
                      <SelectItem value="offline">已下线</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>只有&ldquo;已发布&rdquo;状态的字体会在前台显示</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 标签 */}
        <Card>
          <CardHeader>
            <CardTitle>标签</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通用标签</FormLabel>
                  <FormControl>
                    <Input placeholder="用逗号分隔，例如：现代, 简洁, 优雅" {...field} />
                  </FormControl>
                  <FormDescription>用逗号分隔多个标签</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fontTags"
              render={({ field }) => {
                const selectedStyles = field.value
                  ? field.value
                      .split(',')
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                  : [];

                const toggleStyle = (styleName: string) => {
                  const current = selectedStyles.includes(styleName)
                    ? selectedStyles.filter((s: string) => s !== styleName)
                    : [...selectedStyles, styleName];
                  field.onChange(current.join(', '));
                };

                return (
                  <FormItem>
                    <FormLabel>风格</FormLabel>
                    <FormDescription>选择适用的字体风格标签（可多选）</FormDescription>
                    <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {styles.map((style) => (
                        <div key={style.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`style-${style.id}`}
                            checked={selectedStyles.includes(style.name)}
                            onCheckedChange={() => toggleStyle(style.name)}
                          />
                          <label
                            htmlFor={`style-${style.id}`}
                            className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {style.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? '保存中...' : mode === 'create' ? '创建字体' : '保存更改'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
