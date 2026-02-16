"use client";

import type { CanvasTab, ViabilityData } from "@/lib/types/canvas";
import { ViabilityScore } from "./ViabilityScore";

interface CanvasTabsProps {
  activeTab: CanvasTab;
  onTabChange: (tab: CanvasTab) => void;
  onSettingsClick?: () => void;
  canvasId: string;
  allBlocksFilled: boolean;
  viabilityData: ViabilityData | null;
  readOnly?: boolean;
  onExplainViability: () => void;
  onViabilityDataChange?: (data: ViabilityData) => void;
}

const BASE_TABS: { value: CanvasTab; label: string }[] = [
  { value: "canvas", label: "Canvas" },
  { value: "analysis", label: "Analysis" },
  { value: "assumptions", label: "Assumptions" },
  { value: "economics", label: "Economics" },
  { value: "notes", label: "Notes" },
];

// Add debug tab in development
const TABS: { value: CanvasTab; label: string }[] =
  process.env.NODE_ENV === "development"
    ? [...BASE_TABS, { value: "debug", label: "Debug" }]
    : BASE_TABS;

export function CanvasTabs({
  activeTab,
  onTabChange,
  onSettingsClick,
  canvasId,
  allBlocksFilled,
  viabilityData,
  readOnly = false,
  onExplainViability,
  onViabilityDataChange,
}: CanvasTabsProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-2">
      {/* Left: tabs + settings */}
      <div className="flex items-center gap-2">
        <div className="ui-segmented">
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
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="canvas-settings-btn"
            aria-label="Settings"
            title="Settings"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>

      {/* Right: viability score */}
      <ViabilityScore
        canvasId={canvasId}
        allBlocksFilled={allBlocksFilled}
        initialData={viabilityData}
        readOnly={readOnly}
        onExplainClick={onExplainViability}
        onDataChange={onViabilityDataChange}
      />
    </div>
  );
}
