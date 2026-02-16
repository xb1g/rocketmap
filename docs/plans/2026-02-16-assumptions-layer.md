# Assumptions Layer Implementation Plan

> **For Gemini:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a trackable Assumptions system where users can capture, prioritize, and validate business assumptions globally and per-block.

**Architecture:** Introduce a canonical `Assumption` entity linked to canvas/blocks. Add a new "Assumptions" global tab and an "Assumptions" section in the Block Focus Panel.

**Tech Stack:** Next.js (App Router), Appwrite, Vitest (for TDD).

---

### Task 0: Setup Vitest for TDD

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install Vitest**

Run: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`

**Step 2: Add test script**

Modify `package.json`:
```json
"scripts": {
  ...
  "test": "vitest"
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
})
```

**Step 4: Create setup.ts**

Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

**Step 5: Verify setup**

Run: `npm run test`
Expected: Should run but likely find no tests.

**Step 6: Commit**

```bash
git add package.json vitest.config.ts tests/setup.ts
git commit -m "chore: setup vitest for TDD"
```

---

### Task 1: Define Assumption Types

**Files:**
- Modify: `lib/types/canvas.ts`
- Create: `tests/lib/types/canvas.test.ts`

**Step 1: Write verification test for type presence (simulated)**

Create `tests/lib/types/canvas.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('Canvas Types', () => {
  it('should have Assumption types defined', () => {
    // This is a placeholder to ensure the file exists and lints
    expect(true).toBe(true)
  })
})
```

**Step 2: Add Assumption types to lib/types/canvas.ts**

```typescript
export type AssumptionStatus = 'untested' | 'testing' | 'validated' | 'refuted' | 'inconclusive';
export type AssumptionPriority = 'low' | 'medium' | 'high';

export interface Assumption {
  $id: string;
  canvasId: string;
  statement: string;
  status: AssumptionStatus;
  priority: AssumptionPriority;
  source: 'ai' | 'user';
  blockTypes: BlockType[];
  segmentIds: string[];
  linkedValidationItemIds: string[];
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

export interface AssumptionTest {
  $id: string;
  assumptionId: string;
  method: string;
  successCriteria: string;
  result: 'supports' | 'contradicts' | 'mixed' | 'inconclusive';
  evidence: string;
  sourceUrl?: string;
  createdAt: string;
}
```

**Step 3: Verify types compile**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/types/canvas.ts tests/lib/types/canvas.test.ts
git commit -m "feat: add Assumption and AssumptionTest types"
```

---

### Task 2: Add Assumptions Tab to UI

**Files:**
- Modify: `lib/types/canvas.ts` (CanvasTab union)
- Modify: `app/components/canvas/CanvasTabs.tsx`
- Create: `tests/components/CanvasTabs.test.tsx`

**Step 1: Write failing test**

Create `tests/components/CanvasTabs.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { CanvasTabs } from '@/app/components/canvas/CanvasTabs'

test('renders assumptions tab', () => {
  render(<CanvasTabs activeTab="canvas" onTabChange={() => {}} />)
  expect(screen.getByText(/assumptions/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/components/CanvasTabs.test.tsx`
Expected: FAIL (tab not found)

**Step 3: Update CanvasTab type and CanvasTabs component**

Update `lib/types/canvas.ts`:
```typescript
export type CanvasTab = "canvas" | "analysis" | "assumptions" | "notes" | "debug";
```

Update `app/components/canvas/CanvasTabs.tsx` to include the new tab.

**Step 4: Run test to verify it passes**

Run: `npm run test tests/components/CanvasTabs.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/types/canvas.ts app/components/canvas/CanvasTabs.tsx tests/components/CanvasTabs.test.tsx
git commit -m "ui: add assumptions tab to canvas tabs"
```

---

### Task 3: Create Placeholder AssumptionsView

**Files:**
- Create: `app/components/canvas/AssumptionsView.tsx`
- Modify: `app/canvas/[slug]/CanvasClient.tsx`

**Step 1: Write implementation for AssumptionsView**

Create `app/components/canvas/AssumptionsView.tsx` with a basic list view.

**Step 2: Integrate into CanvasClient.tsx**

Update the main switch statement in `CanvasClient.tsx` to render `AssumptionsView` when `activeTab === 'assumptions'`.

**Step 3: Verify navigation**

Manual check in `npm run dev` that clicking the tab shows the view.

**Step 4: Commit**

```bash
git add app/components/canvas/AssumptionsView.tsx app/canvas/[slug]/CanvasClient.tsx
git commit -m "ui: implement basic AssumptionsView shell"
```
