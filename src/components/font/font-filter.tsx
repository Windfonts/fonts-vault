'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Brand, Category } from '@/lib/db/schema';
import { Filter, X } from 'lucide-react';
import { useState } from 'react';

export interface FilterState {
  categoryId?: string;
  brandId?: string;
  tags?: string[];
  licenseType?: string;
}

export interface FontFilterProps {
  categories: Category[];
  brands: Brand[];
  availableTags?: string[];
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

const LICENSE_TYPES = [
  { value: 'free_commercial', label: '免费商用' },
  { value: 'free_personal', label: '个人免费' },
  { value: 'trial', label: '试用版' },
  { value: 'paid', label: '付费' },
  { value: 'contact', label: '联系授权' },
];

type FilterContentProps = {
  categories: Category[];
  brands: Brand[];
  availableTags: string[];
  filters: FilterState;
  hasActiveFilters: boolean;
  updateFilter: (key: keyof FilterState, value: string | string[] | undefined) => void;
  removeFilter: (key: keyof FilterState) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  clearAllFilters: () => void;
};

const FilterContent = ({
  categories,
  brands,
  availableTags,
  filters,
  hasActiveFilters,
  updateFilter,
  removeFilter,
  addTag,
  removeTag,
  clearAllFilters,
}: FilterContentProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">筛选器</h3>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
          清除全部
        </Button>
      )}
    </div>

    <div className="space-y-2">
      <Label htmlFor="category-filter">分类</Label>
      <Select
        value={filters.categoryId || 'all'}
        onValueChange={(value) =>
          value === 'all' ? removeFilter('categoryId') : updateFilter('categoryId', value)
        }
      >
        <SelectTrigger id="category-filter">
          <SelectValue placeholder="选择分类" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部分类</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label htmlFor="brand-filter">品牌</Label>
      <Select
        value={filters.brandId || 'all'}
        onValueChange={(value) =>
          value === 'all' ? removeFilter('brandId') : updateFilter('brandId', value)
        }
      >
        <SelectTrigger id="brand-filter">
          <SelectValue placeholder="选择品牌" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部品牌</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              {brand.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label htmlFor="license-filter">授权类型</Label>
      <Select
        value={filters.licenseType || 'all'}
        onValueChange={(value) =>
          value === 'all' ? removeFilter('licenseType') : updateFilter('licenseType', value)
        }
      >
        <SelectTrigger id="license-filter">
          <SelectValue placeholder="选择授权类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          {LICENSE_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {availableTags.length > 0 && (
      <div className="space-y-2">
        <Label>风格</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const isSelected = filters.tags?.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => (isSelected ? removeTag(tag) : addTag(tag))}
              >
                {tag}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Badge>
            );
          })}
        </div>
      </div>
    )}

    {hasActiveFilters && (
      <div className="border-t pt-4">
        <Label className="mb-2 block">已选筛选条件</Label>
        <div className="flex flex-wrap gap-2">
          {filters.categoryId && (
            <Badge
              variant="secondary"
              onClick={() => removeFilter('categoryId')}
              role="button"
              aria-label="移除分类筛选"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') removeFilter('categoryId');
              }}
            >
              分类: {categories.find((c) => c.id === filters.categoryId)?.name}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.brandId && (
            <Badge
              variant="secondary"
              onClick={() => removeFilter('brandId')}
              role="button"
              aria-label="移除品牌筛选"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') removeFilter('brandId');
              }}
            >
              品牌: {brands.find((b) => b.id === filters.brandId)?.name}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.licenseType && (
            <Badge
              variant="secondary"
              onClick={() => removeFilter('licenseType')}
              role="button"
              aria-label="移除授权筛选"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') removeFilter('licenseType');
              }}
            >
              授权: {LICENSE_TYPES.find((t) => t.value === filters.licenseType)?.label}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              onClick={() => removeTag(tag)}
              role="button"
              aria-label={`移除标签 ${tag}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') removeTag(tag);
              }}
            >
              {tag}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      </div>
    )}
  </div>
);

export function FontFilter({
  categories,
  brands,
  availableTags = [],
  onFilterChange,
  initialFilters = {},
}: FontFilterProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const updateFilter = (key: keyof FilterState, value: string | string[] | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const removeFilter = (key: keyof FilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const addTag = (tag: string) => {
    const currentTags = filters.tags || [];
    if (!currentTags.includes(tag)) {
      updateFilter('tags', [...currentTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.filter((t) => t !== tag);
    if (newTags.length === 0) {
      removeFilter('tags');
    } else {
      updateFilter('tags', newTags);
    }
  };

  const clearAllFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <>
      {/* Desktop Filter - Always visible */}
      <div className="hidden lg:block">
        <div className="bg-card space-y-4 rounded-lg border p-4">
          <FilterContent
            categories={categories}
            brands={brands}
            availableTags={availableTags}
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            updateFilter={updateFilter}
            removeFilter={removeFilter}
            addTag={addTag}
            removeTag={removeTag}
            clearAllFilters={clearAllFilters}
          />
        </div>
      </div>

      {/* Mobile Filter - Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              筛选器
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>筛选器</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent
                categories={categories}
                brands={brands}
                availableTags={availableTags}
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                updateFilter={updateFilter}
                removeFilter={removeFilter}
                addTag={addTag}
                removeTag={removeTag}
                clearAllFilters={clearAllFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
