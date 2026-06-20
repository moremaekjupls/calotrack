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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[oklch(0.97_0.01_240)]/82 backdrop-blur-xl backdrop-saturate-150 border-t border-[oklch(0.97_0.01_240)]/45">
      <div className="flex">
        {tabs.map(tab => {
          const active = tab.path === '/' ? location === '/' : location.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* iPhone home indicator safe area */}
      <div className="h-safe-area-inset-bottom bg-[oklch(0.97_0.01_240)]/82" />
    </nav>
  );
}
