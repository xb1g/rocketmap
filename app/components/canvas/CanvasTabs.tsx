"use client";

import type { CanvasTab } from "@/lib/types/canvas";

interface CanvasTabsProps {
  activeTab: CanvasTab;
  onTabChange: (tab: CanvasTab) => void;
}

const BASE_TABS: { value: CanvasTab; label: string }[] = [
  { value: "canvas", label: "Canvas" },
  { value: "analysis", label: "Analysis" },
  { value: "assumptions", label: "Assumptions" },
  { value: "notes", label: "Notes" },
];

// Add debug tab in development
const TABS: { value: CanvasTab; label: string }[] =
  process.env.NODE_ENV === "development"
    ? [...BASE_TABS, { value: "debug", label: "Debug" }]
    : BASE_TABS;

export function CanvasTabs({ activeTab, onTabChange }: CanvasTabsProps) {
  return (
    <div className="ui-segmented mx-2">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`ui-segmented-btn ${activeTab === tab.value ? "is-active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
