'use client';

import type { CanvasTab } from '@/lib/types/canvas';

interface CanvasTabsProps {
  activeTab: CanvasTab;
  onTabChange: (tab: CanvasTab) => void;
}

const TABS: { value: CanvasTab; label: string }[] = [
  { value: 'canvas', label: 'Canvas' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'notes', label: 'Notes' },
];

export function CanvasTabs({ activeTab, onTabChange }: CanvasTabsProps) {
  return (
    <div className="flex items-center gap-1 px-2">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`px-3 py-1.5 font-display-small text-[10px] uppercase tracking-wider rounded-lg transition-all ${
            activeTab === tab.value
              ? 'glass-morphism text-foreground border border-white/10 shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
