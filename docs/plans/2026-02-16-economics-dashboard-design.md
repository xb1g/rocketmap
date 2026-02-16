# Economics & Viability Dashboard Design

**Date:** 2026-02-16
**Status:** Approved

## Overview

Unit Economics Visualizer shown in two places:
1. **Focus Panel (Layer 1)** — Economics section in BlockFocusPanel for revenue_streams and cost_structure blocks
2. **Canvas Tab** — New "Economics" tab alongside Canvas/Analysis/Assumptions/Notes

Visual flow per segment: Customer → Revenue → Cost → Profit → Scale Viability

## Data Types

```typescript
// Add to lib/types/canvas.ts

export type EconomicsModule = 'unit_economics' | 'sensitivity_analysis';

export interface SegmentEconomics {
  segmentId: string;
  segmentName: string;
  arpu: number;              // Monthly ARPU
  cac: number;               // Customer Acquisition Cost
  grossMarginPct: number;    // 0-100
  ltv: number;               // Lifetime Value
  paybackMonths: number;     // Months to recover CAC
  churnRatePct: number;      // Monthly churn %
  ltvCacRatio: number;       // LTV/CAC
  status: 'healthy' | 'warning' | 'critical';
  methodology: string;       // How AI estimated these
}

export interface SensitivityResult {
  parameter: string;         // e.g. "CAC +20%"
  original: SegmentEconomics;
  adjusted: SegmentEconomics;
  impact: string;            // AI summary of impact
  verdict: 'survives' | 'stressed' | 'breaks';
}

export interface UnitEconomicsData {
  segments: SegmentEconomics[];
  globalMetrics: {
    monthlyBurn: number | null;
    runwayMonths: number | null;
    blendedArpu: number;
    blendedCac: number;
    blendedLtv: number;
    blendedLtvCacRatio: number;
  };
  alerts: EconomicsAlert[];
  sensitivityResults: SensitivityResult[];
  lastUpdated: string;
}

export interface EconomicsAlert {
  type: 'impossible' | 'warning' | 'benchmark';
  message: string;
  severity: 'critical' | 'warning' | 'info';
  segmentId?: string;
}
```

## AI Tools (lib/ai/tools.ts)

### estimateUnitEconomics
- Input: canvas context + segments
- Output: SegmentEconomics[] + GlobalMetrics + alerts
- Uses searchWeb for benchmark data
- Detects impossible economics (CAC > LTV, negative margins)

### runSensitivityAnalysis
- Input: parameter to stress (e.g., "cac", "churn"), delta percentage
- Output: SensitivityResult
- Shows what breaks when assumptions change

## API Integration

Reuse existing deep-dive route pattern. Add module cases:
- `unit_economics` → calls estimateUnitEconomics tool
- `sensitivity_analysis` → calls runSensitivityAnalysis tool

The deep-dive data lives on the revenue_streams block's `deepDiveJson` field.

## UI Components

### 1. EconomicsView (tab-level + focus panel)
`app/components/blocks/unit-economics/EconomicsView.tsx`

Container with two sub-views:
- **Overview** — Flow diagram + segment cards + alerts
- **Sensitivity** — Slider-based what-if simulations

### 2. EconomicsFlowDiagram
`app/components/blocks/unit-economics/EconomicsFlowDiagram.tsx`

Per-segment horizontal flow:
```
[Customers] → [$X ARPU/mo] → [$Y CAC] → [Z% Margin] → [LTV/CAC: N]
                                                              │
                              Payback: M months ──────────────┘
```

Color-coded by health:
- Green: LTV/CAC ≥ 3
- Amber: LTV/CAC 1-3
- Red: LTV/CAC < 1

### 3. SegmentEconomicsCard
Per-segment detail card with all 6 metrics + health status

### 4. AlertsSection
Shows AI-detected impossibilities and warnings

### 5. SensitivityPanel
Slider controls: "What if CAC increases 20%?" with before/after comparison

## Canvas Tab Integration

Add `"economics"` to `CanvasTab` type. New tab renders `EconomicsView` at full canvas width.

## Focus Panel Integration

For revenue_streams and cost_structure blocks, show a compact economics summary section in BlockFocusPanel (above or below the risk section), with a "Deep Dive Economics" button to open the full overlay or switch to the Economics tab.

## DeepDiveOverlay Integration

Add case for revenue_streams/cost_structure blocks alongside existing customer_segments case.

## Implementation Tasks

### Task 1: Types & AI Tools
- Add types to `lib/types/canvas.ts`
- Add `estimateUnitEconomics` and `runSensitivityAnalysis` tools to `lib/ai/tools.ts`
- Add prompts to `lib/ai/prompts.ts`
- Register tools in tool registry

### Task 2: API Route Updates
- Add `unit_economics` and `sensitivity_analysis` module handling to deep-dive route
- Add `EconomicsModule` to valid modules list

### Task 3: UI Components
- Create `app/components/blocks/unit-economics/` directory
- Build EconomicsView, EconomicsFlowDiagram, SegmentEconomicsCard, SensitivityPanel, AlertsSection

### Task 4: Integration
- Add "Economics" canvas tab to CanvasTabs + CanvasClient
- Add economics section to BlockFocusPanel for revenue/cost blocks
- Add revenue_streams/cost_structure case to DeepDiveOverlay
- Update CanvasTab type
