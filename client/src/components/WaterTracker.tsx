/**
 * WaterTracker Component
 * Hero-style water intake tracker: one big glass with an animated liquid
 * fill (level = % of daily goal). Tapping the glass logs one cup; quick-add
 * chips below cover other common amounts, a separate "+custom" action
 * covers anything else, and undo removes the last log.
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassWater, Plus, Undo2, Droplet } from 'lucide-react';

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

  const percent = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  const fillPercent = Math.min(100, Math.max(0, percent));
  const liters = (consumed / 1000).toFixed(1);
  const goalLiters = (goal / 1000).toFixed(1);

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
    <Card className="bg-gradient-to-br from-[color-mix(in_oklch,var(--chart-5)_22%,white)]/60 to-white/45 backdrop-blur-xl backdrop-saturate-150 border border-[oklch(0.97_0.012_70)]/40 shadow-[inset_0_1px_0_0_rgba(255, 248, 238,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)] p-5 sm:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
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

      {/* Hero glass: one vessel, liquid level = % of goal */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onAddCup}
          title={`Добавить ${CUP_ML} мл`}
          className="relative w-28 h-40 sm:w-32 sm:h-44 rounded-[16px_16px_40px_40px] border-[3px] border-[var(--chart-5)] bg-[oklch(0.97_0.012_70)]/50 overflow-hidden transition-transform active:scale-95"
        >
          {/* liquid fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--chart-5)] transition-all duration-700 ease-out flex items-start justify-center pt-2"
            style={{ height: `${fillPercent}%` }}
          >
            <Droplet className="w-5 h-5 text-white/60 fill-white/30" />
          </div>
          {/* glass shine */}
          <div className="absolute top-3 left-3 w-2 h-[65%] rounded-full bg-[oklch(0.97_0.012_70)]/35" />
        </button>

        <div className="mt-3 text-center">
          <span className="text-3xl sm:text-4xl font-display font-bold text-[var(--chart-5)] leading-none">
            {percent}%
          </span>
          <p className="text-sm text-muted-foreground mt-1">
            {liters} л / {goalLiters} л
          </p>
        </div>
      </div>

      {/* Quick-add chips */}
      <div className="grid grid-cols-3 gap-2 mt-5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddCup}
          className="border-[var(--chart-5)]/30 text-[var(--chart-5)] hover:bg-[var(--chart-5)]/10"
        >
          +250 мл
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddCustom(500)}
          className="border-[var(--chart-5)]/30 text-[var(--chart-5)] hover:bg-[var(--chart-5)]/10"
        >
          +500 мл
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddCustom(1000)}
          className="border-[var(--chart-5)]/30 text-[var(--chart-5)] hover:bg-[var(--chart-5)]/10"
        >
          +1 л
        </Button>
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mt-3">
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
