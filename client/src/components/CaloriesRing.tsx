/**
 * CaloriesRing Component
 * Hero metric: calories get a big circular progress ring with a flame icon
 * at the center, instead of sitting flush in a 2x2 grid with the macros.
 * Calories matter more at a glance than any single macro — this gives them
 * visual weight to match.
 */

import React from 'react';
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
  const percent = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  const clamped = Math.min(100, Math.max(0, percent));
  const accent = isOverGoal ? 'var(--destructive)' : 'var(--chart-1)';
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <Card className="border-0 shadow-sm p-6 sm:p-8 animate-fade-in-up">
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
          >
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
              stroke={accent}
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
              style={{ backgroundColor: `color-mix(in oklch, ${accent} 16%, white)` }}
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
      </div>
    </Card>
  );
}
