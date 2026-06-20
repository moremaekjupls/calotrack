/**
 * MacroTile Component
 * Colorful stat tile for a single macro/metric: big percentage, thin progress
 * bar and consumed/goal readout. Designed to sit in a 2x2 (or 4-up) grid.
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type MacroColor = 'calories' | 'carbs' | 'fat' | 'protein';

interface MacroTileProps {
  label: string;
  icon: LucideIcon;
  consumed: number;
  goal: number;
  unit: string;
  color: MacroColor;
  isOverGoal?: boolean;
  sticker?: string;
  /** Smaller padding/type scale — used when calories has its own hero ring
   *  and the macro tiles are demoted to a supporting 3-up row. */
  compact?: boolean;
}

const colorVar: Record<MacroColor, string> = {
  calories: 'var(--chart-1)',
  carbs: 'var(--chart-2)',
  fat: 'var(--chart-3)',
  protein: 'var(--secondary)',
};

export function MacroTile({ label, icon: Icon, consumed, goal, unit, color, isOverGoal, sticker, compact }: MacroTileProps) {
  const percent = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  const barWidth = Math.min(100, percent);
  const accent = isOverGoal ? 'var(--destructive)' : colorVar[color];

  return (
    <Card className={cn(
      'relative border border-[oklch(0.97_0.012_70)]/40 bg-[oklch(0.97_0.012_70)]/45 backdrop-blur-xl backdrop-saturate-150 animate-fade-in-up overflow-hidden',
      'shadow-[inset_0_1px_0_0_rgba(255, 248, 238,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)]',
      compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'
    )}>
      {sticker && (
        <span
          aria-hidden
          className={cn('absolute select-none opacity-90 rotate-[12deg]', compact ? '-top-1 -right-1 text-lg' : '-top-1.5 -right-1.5 text-2xl')}
        >
          {sticker}
        </span>
      )}
      <div className={cn('flex items-center justify-between', compact ? 'mb-2' : 'mb-3')}>
        <span className={cn('font-medium text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>{label}</span>
        <div
          className={cn('rounded-full flex items-center justify-center shrink-0', compact ? 'w-6 h-6' : 'w-8 h-8')}
          style={{ backgroundColor: `color-mix(in oklch, ${accent} 16%, white)` }}
        >
          <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} style={{ color: accent }} />
        </div>
      </div>

      <div className={cn('flex items-baseline gap-1', compact ? 'mb-1.5' : 'mb-2')}>
        <span className={cn('font-display font-bold text-foreground', compact ? 'text-xl' : 'text-2xl sm:text-3xl')}>{percent}%</span>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${barWidth}%`, backgroundColor: accent }}
        />
      </div>

      <p className={cn('text-xs', isOverGoal ? 'font-semibold' : 'text-muted-foreground')} style={isOverGoal ? { color: accent } : undefined}>
        {Math.round(consumed)}{unit} / {goal}{unit}
      </p>
    </Card>
  );
}
