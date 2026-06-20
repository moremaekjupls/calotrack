import React from 'react';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[oklch(0.97_0.012_70)]/32 backdrop-blur-xl backdrop-saturate-200 border-b border-[oklch(0.97_0.012_70)]/25">
        <div className="container app-shell py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-primary">Дашборд</h1>
        </div>
      </header>

      <main className="container app-shell py-6">
        <Card className="border-dashed border-[oklch(0.97_0.012_70)]/35 bg-[oklch(0.97_0.012_70)]/22 backdrop-blur-xl backdrop-saturate-200 shadow-[inset_0_1px_0_0_rgba(255, 248, 238,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)] p-10 text-center">
          <div className="text-5xl mb-3">🛠️</div>
          <p className="text-foreground font-semibold mb-1">Дашборд временно убран</p>
          <p className="text-sm text-muted-foreground">
            Старые графики плохо вписывались в новый дизайн — переделываем их с нуля.
          </p>
        </Card>
      </main>
    </div>
  );
}
