/**
 * MealList Component
 * Displays all meals for a day, grouped by meal type
 */

import React from 'react';
import { Entry, MealType } from '@/types';
import { MealEntry } from './MealEntry';
import { Card } from '@/components/ui/card';

interface MealListProps {
  entries: Entry[];
  onEdit?: (entry: Entry) => void;
  onDelete?: (id: string) => void;
}

const mealTypeOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const mealTypeLabels: Record<MealType, string> = {
  breakfast: '🍳 Завтрак',
  lunch: '🍲 Обед',
  dinner: '🌙 Ужин',
  snack: '🍪 Перекусы и другое',
};

export function MealList({ entries, onEdit, onDelete }: MealListProps) {
  if (entries.length === 0) {
    return (
      <Card className="border-dashed border-[oklch(0.97_0.012_70)]/40 bg-[oklch(0.97_0.012_70)]/45 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255, 248, 238,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="p-8 text-center">
          <div className="text-5xl mb-3">🥗</div>
          <p className="text-muted-foreground text-sm">
            Пока нет ни одного приёма пищи. Добавьте первый, чтобы начать!
          </p>
        </div>
      </Card>
    );
  }

  // Group entries by meal type
  const grouped = mealTypeOrder.reduce(
    (acc, type) => {
      const mealEntries = entries.filter((e) => (e.mealType || 'snack') === type);
      if (mealEntries.length > 0) {
        acc[type] = mealEntries;
      }
      return acc;
    },
    {} as Record<MealType, Entry[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, mealEntries]) => (
        <div key={type}>
          <h2 className="text-sm font-heading font-semibold text-foreground uppercase tracking-wide mb-3 px-1">
            {mealTypeLabels[type as MealType]}
          </h2>
          <div className="space-y-2">
            {mealEntries.map((entry) => (
              <MealEntry
                key={entry.id}
                entry={entry}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
