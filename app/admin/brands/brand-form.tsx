'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// 表单验证 schema
const brandFormSchema = z.object({
  name: z.string().min(1, '品牌名称不能为空').max(255, '品牌名称过长'),
  slug: z
    .string()
    .min(1, 'Slug不能为空')
    .max(255, 'Slug过长')
    .regex(/^[a-z0-9-]+$/, 'Slug只能包含小写字母、数字和连字符'),
  logoUrl: z.string().url('Logo URL格式不正确').optional().or(z.literal('')),
  bannerUrl: z.string().url('Banner URL格式不正确').optional().or(z.literal('')),
  description: z.string().optional(),
  website: z.string().url('网站URL格式不正确').optional().or(z.literal('')),
  twitter: z.string().url('Twitter URL格式不正确').optional().or(z.literal('')),
  github: z.string().url('GitHub URL格式不正确').optional().or(z.literal('')),
  weibo: z.string().url('微博URL格式不正确').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'offline']),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  website?: string | null;
  socialLinks?: {
    twitter?: string;
    github?: string;
    weibo?: string;
  } | null;
  status: 'draft' | 'published' | 'offline';
  createdAt: Date;
  updatedAt: Date;
}

interface BrandFormProps {
  brand?: Brand;
  onSuccess: (brand: Brand) => void;
  onCancel: () => void;
}

export function BrandForm({ brand, onSuccess, onCancel }: BrandFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!brand;

  // 初始化表单
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: brand?.name || '',
      slug: brand?.slug || '',
      logoUrl: brand?.logoUrl || '',
      bannerUrl: brand?.bannerUrl || '',
      description: brand?.description || '',
      website: brand?.website || '',
      twitter: brand?.socialLinks?.twitter || '',
      github: brand?.socialLinks?.github || '',
      weibo: brand?.socialLinks?.weibo || '',
      status: brand?.status || 'published',
    },
  });

  // 自动生成 slug
  const handleNameChange = (name: string) => {
    if (!isEditing) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      form.setValue('slug', slug);
    }
  };

  // 提交表单
  const onSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      // 构建请求数据
      const requestData = {
        name: values.name,
        slug: values.slug,
        logoUrl: values.logoUrl || undefined,
        bannerUrl: values.bannerUrl || undefined,
        description: values.description || undefined,
        website: values.website || undefined,
        socialLinks: {
          twitter: values.twitter || undefined,
          github: values.github || undefined,
          weibo: values.weibo || undefined,
        },
        status: values.status,
      };

      // 发送请求
      const url = isEditing ? `/api/brands/${brand.id}` : '/api/brands';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '操作失败');
      }

      const result = await response.json();
      onSuccess(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">基本信息</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>品牌名称 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例如：方正字库"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleNameChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>品牌的显示名称</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug *</FormLabel>
                <FormControl>
                  <Input placeholder="例如：fangzheng" {...field} />
                </FormControl>
                <FormDescription>
                  URL友好的唯一标识符，只能包含小写字母、数字和连字符
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>状态 *</FormLabel>
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
                <FormDescription>品牌的发布状态</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>描述</FormLabel>
                <FormControl>
                  <Textarea placeholder="品牌简介..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormDescription>品牌的详细描述</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 图片和链接 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">图片和链接</h3>

          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/logo.png" {...field} />
                </FormControl>
                <FormDescription>品牌Logo图片的URL地址</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bannerUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banner URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/banner.png" {...field} />
                </FormControl>
                <FormDescription>品牌横幅图片的URL地址</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>官方网站</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com" {...field} />
                </FormControl>
                <FormDescription>品牌的官方网站地址</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 社交媒体 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">社交媒体</h3>

          <FormField
            control={form.control}
            name="twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Twitter</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://twitter.com/username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="github"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GitHub</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://github.com/username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weibo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>微博</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://weibo.com/username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (isEditing ? '保存中...' : '创建中...') : isEditing ? '保存' : '创建'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
