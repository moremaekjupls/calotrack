/**
 * CaloriesRing Component
 * Hero metric: calories get a big circular progress ring with a flame icon
 * at the center, plus two flanking stat readouts (remaining / daily goal)
 * so the card has real content instead of dead space beside the ring.
 */

import React, { useId } from 'react';
import { Card } from '@/components/ui/card';
import { Flame } from 'lucide-react';

interface CaloriesRingProps {
  consumed: number;
  goal: number;
  isOverGoal?: boolean;
}

const SIZE = 196;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CaloriesRing({ consumed, goal, isOverGoal }: CaloriesRingProps) {
  const gradId = useId();
  const percent = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  const clamped = Math.min(100, Math.max(0, percent));
  const accent = isOverGoal ? 'var(--destructive)' : 'var(--chart-1)';
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const remaining = Math.round(Math.abs(goal - consumed));
  const over = consumed > goal;

  return (
    <Card className="border border-[oklch(0.97_0.01_240)]/55 bg-[oklch(0.97_0.01_240)]/85 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)] p-6 sm:p-8 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <div
            className="absolute inset-3 rounded-full blur-2xl opacity-25"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90 relative"
          >
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--chart-4)' }} />
                <stop offset="100%" style={{ stopColor: accent }} />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5"
              style={{
                backgroundColor: `color-mix(in oklch, ${accent} 18%, white)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${accent} 35%, transparent)`,
              }}
            >
              <Flame className="w-5 h-5" style={{ color: accent }} />
            </div>
            <span className="text-3xl sm:text-4xl font-display font-bold text-foreground leading-none">
              {Math.round(consumed)}
            </span>
            <span className="text-xs text-muted-foreground mt-1">из {goal} ккал</span>
            <span className="text-sm font-semibold mt-1" style={{ color: accent }}>
              {percent}%
            </span>
          </div>
        </div>

        <div className="flex flex-row sm:flex-col gap-5 sm:gap-4">
          <div className="min-w-[110px]">
            <p className="text-xs text-muted-foreground">{over ? 'Превышение' : 'Осталось'}</p>
            <p
              className="text-xl sm:text-2xl font-display font-bold leading-tight"
              style={{ color: over ? 'var(--destructive)' : 'var(--foreground)' }}
            >
              {remaining}
              <span className="text-sm font-normal text-muted-foreground"> ккал</span>
            </p>
          </div>
          <div className="hidden sm:block h-px bg-border" />
          <div className="min-w-[110px]">
            <p className="text-xs text-muted-foreground">Дневная цель</p>
            <p className="text-xl sm:text-2xl font-display font-semibold leading-tight text-foreground">
              {goal}
              <span className="text-sm font-normal text-muted-foreground"> ккал</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
