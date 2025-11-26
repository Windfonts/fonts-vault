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
import { toast } from 'sonner';

// 表单验证 schema
const categoryFormSchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(255, '分类名称过长'),
  slug: z
    .string()
    .min(1, 'Slug不能为空')
    .max(255, 'Slug过长')
    .regex(/^[a-z0-9-]+$/, 'Slug只能包含小写字母、数字和连字符'),
  description: z.string().optional(),
  order: z.coerce.number().int().min(0, '排序值不能为负数'),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryFormProps {
  category?: Category;
  onSuccess: (category: Category) => void;
  onCancel: () => void;
}

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!category;

  // 初始化表单
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      order: category?.order || 0,
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
  const onSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      // 构建请求数据
      const requestData = {
        name: values.name,
        slug: values.slug,
        description: values.description || undefined,
        order: values.order,
      };

      // 发送请求
      const url = isEditing ? `/api/categories/${category.id}` : '/api/categories';
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
                <FormLabel>分类名称 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例如：无衬线字体"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleNameChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>分类的显示名称</FormDescription>
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
                  <Input placeholder="例如：sans-serif" {...field} />
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>描述</FormLabel>
                <FormControl>
                  <Textarea placeholder="分类简介..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormDescription>分类的详细描述</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>排序值</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>数字越小排序越靠前，相同排序值按名称排序</FormDescription>
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
