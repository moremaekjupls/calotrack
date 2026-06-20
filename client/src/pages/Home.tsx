import React, { useState } from 'react';
import { getTodayISO } from '@/lib/dateUtils';
import { useDailyData } from '@/hooks/useDailyData';
import { Entry } from '@/types';
import { DailySummary } from '@/components/DailySummary';
import { MealList } from '@/components/MealList';
import { AddMealForm } from '@/components/AddMealForm';
import { FoodPickerDialog } from '@/components/FoodPickerDialog';
import { DateNavigator } from '@/components/DateNavigator';
import { GoalSettingsDialog } from '@/components/GoalSettingsDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(getTodayISO());
  const [showPicker, setShowPicker] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const { logout } = useAuth();
  const {
    summary,
    waterLogs,
    loading,
    addEntries,
    updateEntry,
    deleteEntry,
    updateGoal,
    addWater,
    removeLastWater,
  } = useDailyData(currentDate);

  const handleAddBatch = async (entries: Omit<Entry, 'id'>[]) => {
    await addEntries(entries);
    toast.success(entries.length > 1 ? `Добавлено ${entries.length} позиции` : 'Добавлено');
  };

  const handleUpdateMeal = (entry: Omit<Entry, 'id'>) => {
    if (!editingEntry) return;
    updateEntry(editingEntry.id, entry);
    toast.success('Запись обновлена');
    setEditingEntry(null);
  };

  const handleEditMeal = (entry: Entry) => {
    setEditingEntry(entry);
  };

  const handleDeleteMeal = (id: string) => {
    deleteEntry(id);
    toast.success('Удалено');
  };

  if (loading || !summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-primary">CaloTrack</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowPicker(true)}
              className="hidden sm:inline-flex rounded-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="rounded-full text-muted-foreground hover:text-foreground"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero photo band — Uzbek spread, edge-to-edge. The date nav "floats"
            on glass over its lower edge instead of sitting in a plain row. */}
        <div className="relative h-52 sm:h-64 overflow-hidden">
          <img
            src="/images/hero-uzbek-spread.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklch,var(--primary)_28%,transparent)] via-transparent to-background" />
        </div>

        <div className="container space-y-6 -mt-12 relative z-10 pb-2">
          <div className="glass rounded-2xl p-3">
            <DateNavigator date={currentDate} onDateChange={(d) => setCurrentDate(d)} />
          </div>

          <DailySummary
            summary={summary}
            waterLogs={waterLogs}
            onEditGoal={() => setShowGoalDialog(true)}
            onAddWaterCup={() => addWater(250)}
            onAddWaterCustom={(ml) => addWater(ml)}
            onUndoWater={removeLastWater}
          />

          <div>
            <h2 className="text-lg font-heading font-bold text-foreground mb-4">
              {summary.entries.length > 0 ? 'Приёмы пищи' : '🍽️ Нет записей'}
            </h2>
            <MealList
              entries={summary.entries}
              onEdit={handleEditMeal}
              onDelete={handleDeleteMeal}
            />
          </div>
        </div>
      </main>

      {/* Mobile FAB — opens the same central dialog, no more bottom sheet */}
      <div className="fixed bottom-20 right-4 sm:hidden">
        <Button
          onClick={() => setShowPicker(true)}
          className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <FoodPickerDialog
        open={showPicker}
        onOpenChange={setShowPicker}
        date={currentDate}
        onAddBatch={handleAddBatch}
      />

      {/* Editing an existing entry still uses the detailed manual form, now as a centered dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md p-0 [&>button]:z-10">
          {editingEntry && (
            <AddMealForm
              date={currentDate}
              editingEntry={editingEntry}
              onSubmit={handleUpdateMeal}
              onCancel={() => setEditingEntry(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <GoalSettingsDialog
        open={showGoalDialog}
        goal={summary.goal}
        onSave={updateGoal}
        onOpenChange={setShowGoalDialog}
      />
    </div>
  );
}
