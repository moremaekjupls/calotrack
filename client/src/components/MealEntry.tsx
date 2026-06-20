/**
 * MealEntry Component
 * Displays a single meal entry with macros and actions
 */

import React from 'react';
import { Entry, MealType } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GLASS_CARD } from '@/lib/glass';

interface MealEntryProps {
  entry: Entry;
  onEdit?: (entry: Entry) => void;
  onDelete?: (id: string) => void;
}

const mealTypeAccent: Record<MealType, string> = {
  breakfast: 'text-chart-4',
  lunch: 'text-primary',
  dinner: 'text-secondary',
  snack: 'text-chart-2',
};

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '🍳 Завтрак',
  lunch: '🍲 Обед',
  dinner: '🌙 Ужин',
  snack: '🍪 Перекус',
};

export function MealEntry({ entry, onEdit, onDelete }: MealEntryProps) {
  const mealType = entry.mealType || 'snack';
  const accentClass = mealTypeAccent[mealType];

  return (
    <Card className={cn('border animate-fade-in-up transition-all hover:shadow-md', GLASS_CARD)}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-xs font-semibold uppercase tracking-wide", accentClass)}>
                {mealTypeLabels[mealType]}
              </span>
              {entry.time && (
                <span className="text-xs text-muted-foreground">{entry.time}</span>
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground truncate">
              {entry.name}
            </h3>
            
            {/* Macros grid */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Ккал</p>
                <p className="text-sm font-semibold text-foreground">
                  {entry.calories}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Б</p>
                <p className="text-sm font-semibold text-foreground">
                  {entry.protein.toFixed(1)}г
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Ж</p>
                <p className="text-sm font-semibold text-foreground">
                  {entry.fat.toFixed(1)}г
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">У</p>
                <p className="text-sm font-semibold text-foreground">
                  {entry.carbs.toFixed(1)}г
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(entry)}
                className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors"
              >
                <Edit2 className="w-4 h-4 text-primary" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(entry.id)}
                className="h-8 w-8 rounded-full hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
