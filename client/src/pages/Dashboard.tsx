import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { getHistory } from '@/lib/storageService';
import { addDaysToISO, getTodayISO } from '@/lib/dateUtils';
import { Card } from '@/components/ui/card';
import { Flame, TrendingUp, CheckCircle2, Target } from 'lucide-react';
import { DailySummary } from '@/types';

// Short day names in Russian
const RU_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function getShortDay(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return RU_DAYS[new Date(y, m - 1, d).getDay()];
}

function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU'); }

// Custom tooltip for the bar chart
const CaloriesTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{d?.fullDate}</p>
      <p className="text-primary">{fmt(d?.calories ?? 0)} ккал</p>
      {d?.goal && <p className="text-muted-foreground">Цель: {fmt(d.goal)} ккал</p>}
    </div>
  );
};

const MacroTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{d?.fullDate}</p>
      <p><span className="text-blue-500">Б</span> {fmt(d?.protein ?? 0)} г</p>
      <p><span className="text-yellow-500">Ж</span> {fmt(d?.fat ?? 0)} г</p>
      <p><span className="text-orange-400">У</span> {fmt(d?.carbs ?? 0)} г</p>
    </div>
  );
};

type Period = 7 | 14 | 30;

export default function Dashboard() {
  const [history, setHistory] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);

  useEffect(() => {
    setLoading(true);
    const today = getTodayISO();
    const from = addDaysToISO(today, -(period - 1));
    getHistory(from, today)
      .then(data => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const today = getTodayISO();
  const goal = history[0]?.goal?.calories ?? 2000;

  // Days with at least one entry
  const loggedDays = history.filter(d => d.totals.calories > 0);

  // Avg calories (only logged days)
  const avgCalories = loggedDays.length
    ? loggedDays.reduce((s, d) => s + d.totals.calories, 0) / loggedDays.length
    : 0;

  // Streak (consecutive days from today with entries)
  let streak = 0;
  for (let i = 0; i < history.length; i++) {
    const d = addDaysToISO(today, -i);
    const day = history.find(x => x.date === d);
    if (day && day.totals.calories > 0) streak++;
    else break;
  }

  // Days within ±10% of calorie goal
  const onTargetDays = loggedDays.filter(d => {
    const ratio = d.totals.calories / d.goal.calories;
    return ratio >= 0.9 && ratio <= 1.1;
  }).length;

  // Chart data
  const chartData = history.map(d => {
    const [y, m, day] = d.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, day);
    const fullDate = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    return {
      day: getShortDay(d.date),
      fullDate,
      calories: Math.round(d.totals.calories),
      protein: Math.round(d.totals.protein),
      fat: Math.round(d.totals.fat),
      carbs: Math.round(d.totals.carbs),
      goal: d.goal.calories,
      overGoal: d.totals.calories > d.goal.calories,
    };
  });

  const periodOptions: { value: Period; label: string }[] = [
    { value: 7, label: '7 дней' },
    { value: 14, label: '14 дней' },
    { value: 30, label: '30 дней' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-primary">Дашборд</h1>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {periodOptions.map(o => (
              <button
                key={o.value}
                onClick={() => setPeriod(o.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  period === o.value
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Среднее/день
                </div>
                <p className="text-2xl font-bold text-foreground">{fmt(avgCalories)}</p>
                <p className="text-xs text-muted-foreground">ккал · цель {fmt(goal)}</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Серия
                </div>
                <p className="text-2xl font-bold text-foreground">{streak}</p>
                <p className="text-xs text-muted-foreground">
                  {streak === 1 ? 'день подряд' : streak < 5 ? 'дня подряд' : 'дней подряд'}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Залоговано
                </div>
                <p className="text-2xl font-bold text-foreground">{loggedDays.length}</p>
                <p className="text-xs text-muted-foreground">из {history.length} дней</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Target className="w-4 h-4 text-blue-500" />
                  В цели ±10%
                </div>
                <p className="text-2xl font-bold text-foreground">{onTargetDays}</p>
                <p className="text-xs text-muted-foreground">
                  {loggedDays.length > 0 ? `${Math.round(onTargetDays / loggedDays.length * 100)}% залогов. дней` : 'дней'}
                </p>
              </Card>
            </div>

            {/* Calories bar chart */}
            <Card className="p-4">
              <h2 className="font-semibold text-sm text-foreground mb-4">Калории по дням</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CaloriesTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <ReferenceLine y={goal} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.overGoal ? 'hsl(var(--destructive))' : entry.calories > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                        fillOpacity={entry.calories > 0 ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                — — пунктир: цель {fmt(goal)} ккал · <span className="text-destructive">красный</span> = перебор
              </p>
            </Card>

            {/* Macros stacked bar chart */}
            <Card className="p-4">
              <h2 className="font-semibold text-sm text-foreground mb-1">Макросы по дням (г)</h2>
              <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />Белки</span>
                <span><span className="inline-block w-2 h-2 rounded-sm bg-yellow-400 mr-1" />Жиры</span>
                <span><span className="inline-block w-2 h-2 rounded-sm bg-orange-400 mr-1" />Углеводы</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<MacroTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="protein" stackId="m" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="fat" stackId="m" fill="#facc15" maxBarSize={40} />
                  <Bar dataKey="carbs" stackId="m" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Day-by-day list */}
            <Card className="p-4">
              <h2 className="font-semibold text-sm text-foreground mb-3">По дням</h2>
              <div className="space-y-2">
                {[...history].reverse().map(d => {
                  const pct = d.goal.calories > 0 ? Math.round(d.totals.calories / d.goal.calories * 100) : 0;
                  const [y, m, day] = d.date.split('-').map(Number);
                  const label = new Date(y, m - 1, day).toLocaleDateString('ru-RU', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  });
                  const isOver = d.totals.calories > d.goal.calories;
                  const hasData = d.totals.calories > 0;
                  return (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 shrink-0 capitalize">{label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : 'bg-primary'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-16 text-right shrink-0 ${
                        !hasData ? 'text-muted-foreground' : isOver ? 'text-destructive' : 'text-foreground'
                      }`}>
                        {hasData ? `${fmt(d.totals.calories)} ккал` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
