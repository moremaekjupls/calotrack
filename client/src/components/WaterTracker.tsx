/**
 * WaterTracker Component
 * Visual glass-by-glass water intake tracker.
 * Tapping an empty glass logs one cup (CUP_ML). Long-press-free: a separate
 * "+custom" action covers other amounts, and undo removes the last log.
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassWater, Plus, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CUP_ML = 250;

interface WaterTrackerProps {
  consumed: number;
  goal: number;
  hasLogs: boolean;
  onAddCup: () => void;
  onAddCustom: (ml: number) => void;
  onUndo: () => void;
}

export function WaterTracker({ consumed, goal, hasLogs, onAddCup, onAddCustom, onUndo }: WaterTrackerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customMl, setCustomMl] = useState('');

  const totalCups = Math.max(1, Math.round(goal / CUP_ML));
  const filledCups = Math.min(totalCups, Math.floor(consumed / CUP_ML));
  const liters = (consumed / 1000).toFixed(1);
  const goalLiters = (goal / 1000).toFixed(1);
  const percent = goal > 0 ? Math.round((consumed / goal) * 100) : 0;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ml = Number(customMl);
    if (ml > 0) {
      onAddCustom(ml);
      setCustomMl('');
      setShowCustom(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[color-mix(in_oklch,var(--chart-5)_14%,white)] to-card border-0 shadow-sm p-5 sm:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[var(--chart-5)]/15 flex items-center justify-center">
            <GlassWater className="w-5 h-5 text-[var(--chart-5)]" />
          </div>
          <h3 className="text-sm font-heading font-bold text-foreground">Вода</h3>
        </div>
        <div className="flex items-center gap-1">
          {hasLogs && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Отменить последнюю запись"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCustom((v) => !v)}
            className="rounded-full h-8 w-8 text-[var(--chart-5)] hover:bg-[var(--chart-5)]/10"
            title="Добавить произвольный объём"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hero readout: big percent + liters, sits above the cup grid */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl sm:text-4xl font-display font-bold text-[var(--chart-5)] leading-none">
          {percent}%
        </span>
        <span className="text-sm text-muted-foreground">
          {liters} л / {goalLiters} л
        </span>
      </div>

      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {Array.from({ length: totalCups }).map((_, i) => {
          const isFilled = i < filledCups;
          return (
            <button
              key={i}
              type="button"
              onClick={!isFilled ? onAddCup : undefined}
              className={cn(
                'aspect-square rounded-xl flex items-center justify-center transition-all duration-200',
                isFilled
                  ? 'bg-[var(--chart-5)] text-white shadow-sm'
                  : 'bg-[var(--chart-5)]/10 text-[var(--chart-5)]/50 hover:bg-[var(--chart-5)]/20 active:scale-90'
              )}
              title={isFilled ? `${CUP_ML} мл` : `Добавить ${CUP_ML} мл`}
            >
              <GlassWater className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          );
        })}
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mt-4">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="мл"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            className="h-9"
            autoFocus
          />
          <Button type="submit" size="sm" className="bg-[var(--chart-5)] hover:bg-[var(--chart-5)]/90 text-white shrink-0">
            Добавить
          </Button>
        </form>
      )}
    </Card>
  );
}
