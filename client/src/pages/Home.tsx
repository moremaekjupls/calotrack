import React, { useState } from 'react';
import { getTodayISO } from '@/lib/dateUtils';
import { useDailyData } from '@/hooks/useDailyData';
import { Entry } from '@/types';
import { DailySummary } from '@/components/DailySummary';
import { MealList } from '@/components/MealList';
import { AddMealForm } from '@/components/AddMealForm';
import { DateNavigator } from '@/components/DateNavigator';
import { GoalSettingsDialog } from '@/components/GoalSettingsDialog';
import { Button } from '@/components/ui/button';
import { Plus, X, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(getTodayISO());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const { logout } = useAuth();
  const { summary, loading, addEntry, updateEntry, deleteEntry, updateGoal } =
    useDailyData(currentDate);

  const handleSubmitMeal = (entry: Omit<Entry, 'id'>) => {
    if (editingEntry) {
      updateEntry(editingEntry.id, entry);
      toast.success('Запись обновлена');
      setEditingEntry(null);
    } else {
      addEntry(entry);
      toast.success('Добавлено');
    }
    setShowAddForm(false);
  };

  const handleEditMeal = (entry: Entry) => {
    setEditingEntry(entry);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMeal = (id: string) => {
    deleteEntry(id);
    toast.success('Удалено');
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setShowAddForm(false);
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
              onClick={() => { setEditingEntry(null); setShowAddForm(v => !v); }}
              className={`rounded-full gap-2 ${showAddForm ? 'bg-muted text-foreground hover:bg-muted/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            >
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">{showAddForm ? 'Закрыть' : 'Добавить'}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="rounded-full text-gray-400 hover:text-gray-600"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <DateNavigator date={currentDate} onDateChange={(d) => { setCurrentDate(d); setShowAddForm(false); }} />
        <DailySummary summary={summary} onEditGoal={() => setShowGoalDialog(true)} />

        {showAddForm && (
          <AddMealForm
            date={currentDate}
            editingEntry={editingEntry}
            onSubmit={handleSubmitMeal}
            onCancel={handleCancelEdit}
          />
        )}

        <div>
          <h2 className="text-lg font-heading font-bold text-foreground mb-4">
            {summary.entries.length > 0 ? 'Приёмы пищи' : 'Нет записей'}
          </h2>
          <MealList
            entries={summary.entries}
            onEdit={handleEditMeal}
            onDelete={handleDeleteMeal}
          />
        </div>
      </main>

      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 sm:hidden">
        <Button
          onClick={() => { setEditingEntry(null); setShowAddForm(v => !v); }}
          className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {showAddForm ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </Button>
      </div>

      <GoalSettingsDialog
        open={showGoalDialog}
        goal={summary.goal}
        onSave={updateGoal}
        onOpenChange={setShowGoalDialog}
      />
    </div>
  );
}
