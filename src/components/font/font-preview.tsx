'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FontPreviewProps {
  fontFamily: string;
  text?: string;
  sizes?: number[];
  weights?: string[];
  editable?: boolean;
  className?: string;
}

const DEFAULT_SIZES = [14, 18, 24, 32, 48, 64];
const DEFAULT_WEIGHTS = ['Regular', 'Medium', 'Bold'];

export function FontPreview({
  fontFamily,
  text = '字体预览文本 Font Preview Text 1234567890',
  sizes = DEFAULT_SIZES,
  weights = DEFAULT_WEIGHTS,
  editable = true,
  className,
}: FontPreviewProps) {
  const [previewText, setPreviewText] = useState(text);
  const [selectedSize, setSelectedSize] = useState(sizes[2] || 24);
  const [selectedWeight, setSelectedWeight] = useState(weights[0] || 'Regular');
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    // Load font CSS dynamically
    const loadFont = async () => {
      try {
        // In a real implementation, this would load from your CSS API
        // For now, we'll just set it as loaded
        setFontLoaded(true);
      } catch (error) {
        console.error('Failed to load font:', error);
      }
    };

    loadFont();
  }, [fontFamily]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="font-size">字号</Label>
          <Select
            value={selectedSize.toString()}
            onValueChange={(value) => setSelectedSize(Number(value))}
          >
            <SelectTrigger id="font-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[200px] flex-1">
          <Label htmlFor="font-weight">字重</Label>
          <Select value={selectedWeight} onValueChange={setSelectedWeight}>
            <SelectTrigger id="font-weight">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weights.map((weight) => (
                <SelectItem key={weight} value={weight}>
                  {weight}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview Text Input */}
      {editable && (
        <div>
          <Label htmlFor="preview-text">预览文本</Label>
          <Textarea
            id="preview-text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="输入预览文本..."
            rows={3}
          />
        </div>
      )}

      {/* Preview Display */}
      <div className="bg-card rounded-lg border p-6">
        <div
          className={cn('transition-all', !fontLoaded && 'opacity-50')}
          style={{
            fontFamily: fontFamily,
            fontSize: `${selectedSize}px`,
            fontWeight: selectedWeight.toLowerCase(),
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {previewText}
        </div>
      </div>

      {/* Multiple Size Preview */}
      <div className="space-y-4">
        <Label>多字号预览</Label>
        {sizes.slice(0, 4).map((size) => (
          <div key={size} className="border-b pb-3 last:border-b-0">
            <div className="text-muted-foreground mb-1 text-xs">{size}px</div>
            <div
              style={{
                fontFamily: fontFamily,
                fontSize: `${size}px`,
                lineHeight: 1.5,
              }}
            >
              {previewText}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
