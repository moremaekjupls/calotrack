import React from 'react';
import { useLocation } from 'wouter';
import { UtensilsCrossed, BarChart2 } from 'lucide-react';

export function BottomNav() {
  const [location, navigate] = useLocation();

  const tabs = [
    { path: '/', icon: UtensilsCrossed, label: 'Питание' },
    { path: '/dashboard', icon: BarChart2, label: 'Дашборд' },
  ];

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-[oklch(0.97_0.01_240)]/88 backdrop-blur-xl backdrop-saturate-150 border border-[oklch(0.97_0.01_240)]/55 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_10px_28px_-8px_rgba(0,0,0,0.45)]">
        {tabs.map(tab => {
          const active = tab.path === '/' ? location === '/' : location.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-full transition-colors ${
                active ? 'text-primary bg-primary/12' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
