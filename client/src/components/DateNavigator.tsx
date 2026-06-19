import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysToISO, isToday, getTodayISO } from '@/lib/dateUtils';

interface DateNavigatorProps {
  date: string;
  onDateChange: (date: string) => void;
}

function formatRu(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isToday(dateISO)) return 'Сегодня';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function DateNavigator({ date, onDateChange }: DateNavigatorProps) {
  const isFuture = date > getTodayISO();
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" size="icon" onClick={() => onDateChange(addDaysToISO(date, -1))} className="rounded-full">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <button
        onClick={() => onDateChange(getTodayISO())}
        className="flex-1 text-center font-semibold text-foreground py-2 rounded-full hover:bg-muted transition-colors capitalize"
      >
        {formatRu(date)}
      </button>
      <Button
        variant="outline" size="icon"
        onClick={() => onDateChange(addDaysToISO(date, 1))}
        disabled={isFuture}
        className="rounded-full"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
