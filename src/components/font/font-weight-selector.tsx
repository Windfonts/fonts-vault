'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FontWeight {
  name: string;
  value: number;
  fontFamily: string;
}

export interface FontWeightSelectorProps {
  weights: FontWeight[];
  onWeightChange?: (weight: FontWeight) => void;
  selectedWeight?: FontWeight;
  className?: string;
}

export function FontWeightSelector({
  weights,
  onWeightChange,
  selectedWeight,
  className,
}: FontWeightSelectorProps) {
  const [selected, setSelected] = useState<FontWeight>(
    selectedWeight || weights[0] || { name: 'Regular', value: 400, fontFamily: '' }
  );

  const handleWeightSelect = (weight: FontWeight) => {
    setSelected(weight);
    onWeightChange?.(weight);
  };

  if (weights.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <Label>字重选择</Label>
      <div className="flex flex-wrap gap-2">
        {weights.map((weight) => {
          const isSelected = selected.name === weight.name && selected.value === weight.value;
          return (
            <Badge
              key={`${weight.name}-${weight.value}`}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all hover:scale-105',
                isSelected && 'ring-primary ring-2 ring-offset-2'
              )}
              onClick={() => handleWeightSelect(weight)}
            >
              <span className="font-medium">{weight.name}</span>
              <span className="ml-1 text-xs opacity-70">({weight.value})</span>
            </Badge>
          );
        })}
      </div>

      {/* Preview of selected weight */}
      {selected && (
        <div className="bg-muted/50 mt-4 rounded-lg border p-4">
          <div className="text-muted-foreground mb-2 text-xs">
            当前选择: {selected.name} ({selected.value})
          </div>
          <div
            className="text-2xl"
            style={{
              fontFamily: selected.fontFamily,
              fontWeight: selected.value,
            }}
          >
            字体预览 Font Preview 1234567890
          </div>
        </div>
      )}
    </div>
  );
}
