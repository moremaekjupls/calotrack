/**
 * Profile page
 * Replaces the old "Dashboard" tab. Lets the user set basic personal info
 * (name, height, weight, birth year) and, via a settings button, their
 * daily nutrition + water goals (reuses the existing GoalSettingsDialog).
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoalSettingsDialog } from '@/components/GoalSettingsDialog';
import { useAuth } from '@/contexts/AuthContext';
import * as storageService from '@/lib/storageService';
import { Goal } from '@/types';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { GLASS_CARD } from '@/lib/glass';
import { cn } from '@/lib/utils';

export default function Profile() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const [goal, setGoal] = useState<Goal | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  useEffect(() => {
    Promise.all([storageService.getProfile(), storageService.getGoal()])
      .then(([profile, g]) => {
        setName(profile.name ?? '');
        setHeight(profile.heightCm != null ? String(profile.heightCm) : '');
        setWeight(profile.weightKg != null ? String(profile.weightKg) : '');
        setBirthYear(profile.birthYear != null ? String(profile.birthYear) : '');
        setGoal(g);
      })
      .catch((err) => console.error('Error loading profile:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await storageService.updateProfile({
        name: name.trim() || null,
        heightCm: height ? Number(height) : null,
        weightKg: weight ? Number(weight) : null,
        birthYear: birthYear ? Number(birthYear) : null,
      });
      toast.success('Профиль сохранён');
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async (newGoal: Goal) => {
    try {
      const saved = await storageService.setGoal(newGoal);
      setGoal(saved);
      toast.success('Цели обновлены');
    } catch (err) {
      console.error('Error saving goal:', err);
      toast.error('Не удалось сохранить цели');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-[oklch(0.97_0.01_240)]/82 backdrop-blur-xl backdrop-saturate-150 border-b border-[oklch(0.97_0.01_240)]/45">
        <div
          className="container app-shell py-4 flex items-center justify-between"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
        >
          <h1 className="text-2xl font-display font-bold text-primary">Профиль</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGoalDialog(true)}
            className="rounded-full text-muted-foreground hover:text-foreground"
            title="Цели по питанию"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container app-shell py-6 space-y-4">
        <Card className={cn('p-5 border', GLASS_CARD)}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <UserIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{name || 'Без имени'}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="profile-name" className="text-sm font-semibold">Имя</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как вас зовут?"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="profile-height" className="text-sm font-semibold">Рост, см</Label>
                <Input
                  id="profile-height"
                  type="number"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="170"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-weight" className="text-sm font-semibold">Вес, кг</Label>
                <Input
                  id="profile-weight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="65"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-birth-year" className="text-sm font-semibold">Год рожд.</Label>
                <Input
                  id="profile-birth-year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="1998"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving || loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        </Card>

        <Card className={cn('p-5 border', GLASS_CARD)}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Цели по питанию</p>
              <p className="text-sm text-muted-foreground">Калории, БЖУ и вода на день</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoalDialog(true)}
              className="shrink-0 gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" /> Настроить
            </Button>
          </div>
          {goal && (
            <p className="text-sm text-muted-foreground mt-3">
              🔥 {goal.calories} ккал · Б {goal.protein}г · Ж {goal.fat}г · У {goal.carbs}г · 💧 {goal.water} мл
            </p>
          )}
        </Card>

        <Button
          variant="outline"
          onClick={() => logout()}
          className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-4 h-4" /> Выйти из аккаунта
        </Button>
      </main>

      {goal && (
        <GoalSettingsDialog
          open={showGoalDialog}
          goal={goal}
          onSave={handleSaveGoal}
          onOpenChange={setShowGoalDialog}
        />
      )}
    </div>
  );
}
