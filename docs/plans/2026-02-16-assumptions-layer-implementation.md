# Assumptions Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform RocketMap into a validation tool by implementing an Assumption → Experiment → Evidence workflow with AI-powered risk assessment.

**Architecture:** Three new Appwrite collections (assumptions, experiments, risk metrics), enhanced AI tools (identifyAssumptions, suggestExperiment, calculateConfidence), risk-first kanban UI, canvas risk heatmap visualization.

**Tech Stack:** Next.js 16 (App Router), Appwrite TablesDB, Vercel AI SDK, Radix UI, Tailwind CSS, Vitest

---

## Phase 1: Data Layer & Types

### Task 1: Add TypeScript Types

**Files:**
- Modify: `lib/types/canvas.ts`

**Step 1: Add assumption types**

Add to `lib/types/canvas.ts`:

```typescript
// After existing types, before exports

export type AssumptionStatus = 'untested' | 'testing' | 'validated' | 'refuted' | 'inconclusive';
export type AssumptionRiskLevel = 'high' | 'medium' | 'low';
export type ExperimentType = 'survey' | 'interview' | 'mvp' | 'ab_test' | 'research' | 'other';
export type ExperimentStatus = 'planned' | 'running' | 'completed';
export type ExperimentResult = 'supports' | 'contradicts' | 'mixed' | 'inconclusive';

export interface Assumption {
  $id: string;
  canvasId: string;
  statement: string;
  status: AssumptionStatus;
  riskLevel: AssumptionRiskLevel;
  confidenceScore: number; // 0-100
  source: 'ai' | 'user';
  blockTypes: BlockType[];
  segmentIds: string[];
  linkedValidationItemIds: string[];
  suggestedExperiment?: string;
  suggestedExperimentDuration?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

export interface Experiment {
  $id: string;
  assumptionId: string;
  type: ExperimentType;
  description: string;
  successCriteria: string;
  status: ExperimentStatus;
  result?: ExperimentResult;
  evidence: string;
  sourceUrl?: string;
  costEstimate?: string;
  durationEstimate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RiskMetrics {
  riskScore: number; // 0-100
  confidenceScore: number; // 0-100
  untestedHighRisk: number;
  untestedMediumRisk: number;
  untestedLowRisk: number;
  topRisks: string[]; // Top 3 risky assumption statements
}
```

**Step 2: Update CanvasTab type**

Find the line:
```typescript
export type CanvasTab = "canvas" | "analysis" | "notes" | "debug";
```

Replace with:
```typescript
export type CanvasTab = "canvas" | "analysis" | "assumptions" | "notes" | "debug";
```

**Step 3: Verify types compile**

Run: `npm run lint`
Expected: PASS with no type errors

**Step 4: Commit**

```bash
git add lib/types/canvas.ts
git commit -m "feat(types): add Assumption, Experiment, RiskMetrics types"
```

---

### Task 2: Add Appwrite Table Constants

**Files:**
- Modify: `lib/appwrite.ts`

**Step 1: Add table ID constants**

Find the existing constants section and add:

```typescript
// After existing TABLE_ID constants
export const ASSUMPTIONS_TABLE_ID = 'assumptions';
export const EXPERIMENTS_TABLE_ID = 'experiments';
```

**Step 2: Commit**

```bash
git add lib/appwrite.ts
git commit -m "feat(appwrite): add assumptions and experiments table constants"
```

---

### Task 3: Create Assumptions API Route - List & Create

**Files:**
- Create: `app/api/canvas/[canvasId]/assumptions/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getLoggedInUser } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import type { Assumption } from '@/lib/types/canvas';

export async function GET(
  request: NextRequest,
  { params }: { params: { canvasId: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canvasId } = params;
    const { searchParams } = new URL(request.url);

    // Build queries
    const queries = [Query.equal('canvas', canvasId)];

    if (searchParams.get('status')) {
      queries.push(Query.equal('status', searchParams.get('status')!));
    }
    if (searchParams.get('riskLevel')) {
      queries.push(Query.equal('riskLevel', searchParams.get('riskLevel')!));
    }
    if (searchParams.get('source')) {
      queries.push(Query.equal('source', searchParams.get('source')!));
    }

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      queries,
    });

    // Parse JSON fields
    const assumptions = result.rows.map((row: any) => ({
      ...row,
      blockTypes: JSON.parse(row.blockTypes || '[]'),
      segmentIds: JSON.parse(row.segmentIds || '[]'),
      linkedValidationItemIds: JSON.parse(row.linkedValidationItemIds || '[]'),
    })) as Assumption[];

    return NextResponse.json(assumptions);
  } catch (error) {
    console.error('Error fetching assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assumptions' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create POST endpoint**

Add to same file:

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { canvasId: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canvasId } = params;
    const body = await request.json();
    const { statement, riskLevel, blockTypes, segmentIds, source } = body;

    if (!statement || !riskLevel || !blockTypes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { ID } = await import('node-appwrite');

    const assumption = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        canvas: canvasId,
        statement,
        status: 'untested',
        riskLevel,
        confidenceScore: 0,
        source: source || 'user',
        blockTypes: JSON.stringify(blockTypes),
        segmentIds: JSON.stringify(segmentIds || []),
        linkedValidationItemIds: JSON.stringify([]),
        suggestedExperiment: null,
        suggestedExperimentDuration: null,
        createdAt: now,
        updatedAt: now,
        lastTestedAt: null,
      },
    });

    // Parse JSON fields for response
    const parsed = {
      ...assumption,
      blockTypes: JSON.parse(assumption.blockTypes),
      segmentIds: JSON.parse(assumption.segmentIds),
      linkedValidationItemIds: JSON.parse(assumption.linkedValidationItemIds),
    } as Assumption;

    return NextResponse.json(parsed, { status: 201 });
  } catch (error) {
    console.error('Error creating assumption:', error);
    return NextResponse.json(
      { error: 'Failed to create assumption' },
      { status: 500 }
    );
  }
}
```

**Step 3: Test endpoints**

Test manually or with curl:
```bash
# List assumptions (should return empty array initially)
curl http://localhost:3000/api/canvas/[test-canvas-id]/assumptions

# Create assumption
curl -X POST http://localhost:3000/api/canvas/[test-canvas-id]/assumptions \
  -H "Content-Type: application/json" \
  -d '{"statement":"Test assumption","riskLevel":"high","blockTypes":["value_prop"]}'
```

**Step 4: Commit**

```bash
git add app/api/canvas/[canvasId]/assumptions/route.ts
git commit -m "feat(api): add assumptions list and create endpoints"
```

---

### Task 4: Create Assumptions API Route - Get, Update, Delete

**Files:**
- Create: `app/api/canvas/[canvasId]/assumptions/[id]/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getLoggedInUser } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import type { Assumption } from '@/lib/types/canvas';

export async function GET(
  request: NextRequest,
  { params }: { params: { canvasId: string; id: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assumption = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: params.id,
    });

    const parsed = {
      ...assumption,
      blockTypes: JSON.parse(assumption.blockTypes),
      segmentIds: JSON.parse(assumption.segmentIds),
      linkedValidationItemIds: JSON.parse(assumption.linkedValidationItemIds),
    } as Assumption;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error fetching assumption:', error);
    return NextResponse.json(
      { error: 'Assumption not found' },
      { status: 404 }
    );
  }
}
```

**Step 2: Create PATCH endpoint**

Add to same file:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { canvasId: string; id: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: any = { updatedAt: new Date().toISOString() };

    // Map updates, stringify JSON fields
    if (body.statement) updates.statement = body.statement;
    if (body.status) updates.status = body.status;
    if (body.riskLevel) updates.riskLevel = body.riskLevel;
    if (body.confidenceScore !== undefined) updates.confidenceScore = body.confidenceScore;
    if (body.blockTypes) updates.blockTypes = JSON.stringify(body.blockTypes);
    if (body.segmentIds) updates.segmentIds = JSON.stringify(body.segmentIds);
    if (body.suggestedExperiment !== undefined) updates.suggestedExperiment = body.suggestedExperiment;
    if (body.suggestedExperimentDuration !== undefined) updates.suggestedExperimentDuration = body.suggestedExperimentDuration;
    if (body.lastTestedAt) updates.lastTestedAt = body.lastTestedAt;

    const assumption = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: params.id,
      data: updates,
    });

    const parsed = {
      ...assumption,
      blockTypes: JSON.parse(assumption.blockTypes),
      segmentIds: JSON.parse(assumption.segmentIds),
      linkedValidationItemIds: JSON.parse(assumption.linkedValidationItemIds),
    } as Assumption;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error updating assumption:', error);
    return NextResponse.json(
      { error: 'Failed to update assumption' },
      { status: 500 }
    );
  }
}
```

**Step 3: Create DELETE endpoint**

Add to same file:

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { canvasId: string; id: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assumption:', error);
    return NextResponse.json(
      { error: 'Failed to delete assumption' },
      { status: 500 }
    );
  }
}
```

**Step 4: Commit**

```bash
git add app/api/canvas/[canvasId]/assumptions/[id]/route.ts
git commit -m "feat(api): add assumption get, update, delete endpoints"
```

---

### Task 5: Create Experiments API Routes

**Files:**
- Create: `app/api/canvas/[canvasId]/assumptions/[id]/experiments/route.ts`
- Create: `app/api/canvas/[canvasId]/assumptions/[assumptionId]/experiments/[id]/route.ts`

**Step 1: Create experiments list/create route**

Create `app/api/canvas/[canvasId]/assumptions/[id]/experiments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getLoggedInUser } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  EXPERIMENTS_TABLE_ID,
} from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import type { Experiment } from '@/lib/types/canvas';

export async function GET(
  request: NextRequest,
  { params }: { params: { canvasId: string; id: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      queries: [Query.equal('assumption', params.id)],
    });

    return NextResponse.json(result.rows as Experiment[]);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { canvasId: string; id: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      description,
      successCriteria,
      costEstimate,
      durationEstimate,
    } = body;

    if (!type || !description || !successCriteria) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { ID } = await import('node-appwrite');

    const experiment = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        assumption: params.id,
        type,
        description,
        successCriteria,
        status: 'planned',
        result: null,
        evidence: '',
        sourceUrl: null,
        costEstimate: costEstimate || null,
        durationEstimate: durationEstimate || null,
        createdAt: now,
        completedAt: null,
      },
    });

    return NextResponse.json(experiment as Experiment, { status: 201 });
  } catch (error) {
    console.error('Error creating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create experiment update/delete route**

Create `app/api/canvas/[canvasId]/assumptions/[assumptionId]/experiments/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getLoggedInUser } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  EXPERIMENTS_TABLE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import type { Experiment } from '@/lib/types/canvas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { canvasId: string; assumptionId: string; id: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: any = {};

    if (body.status) updates.status = body.status;
    if (body.result) updates.result = body.result;
    if (body.evidence !== undefined) updates.evidence = body.evidence;
    if (body.sourceUrl !== undefined) updates.sourceUrl = body.sourceUrl;
    if (body.costEstimate !== undefined) updates.costEstimate = body.costEstimate;
    if (body.durationEstimate !== undefined) updates.durationEstimate = body.durationEstimate;

    // If marking as completed, set completedAt and update assumption
    if (body.status === 'completed') {
      updates.completedAt = new Date().toISOString();

      // Auto-update assumption status based on result
      if (body.result) {
        const assumptionUpdates: any = {
          lastTestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (body.result === 'supports') {
          assumptionUpdates.status = 'validated';
        } else if (body.result === 'contradicts') {
          assumptionUpdates.status = 'refuted';
        } else if (body.result === 'mixed' || body.result === 'inconclusive') {
          assumptionUpdates.status = 'inconclusive';
        }

        // Update assumption
        await serverTablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: ASSUMPTIONS_TABLE_ID,
          rowId: params.assumptionId,
          data: assumptionUpdates,
        });
      }
    }

    const experiment = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: params.id,
      data: updates,
    });

    return NextResponse.json(experiment as Experiment);
  } catch (error) {
    console.error('Error updating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to update experiment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { canvasId: string; assumptionId: string; id: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return NextResponse.json(
      { error: 'Failed to delete experiment' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add app/api/canvas/[canvasId]/assumptions/[id]/experiments/
git add app/api/canvas/[canvasId]/assumptions/[assumptionId]/experiments/
git commit -m "feat(api): add experiments CRUD endpoints"
```

---

## Phase 2: AI Integration

### Task 6: Add New AI Tools

**Files:**
- Modify: `lib/ai/tools.ts`

**Step 1: Add identifyAssumptions tool**

Add after existing tools:

```typescript
export const identifyAssumptions = tool({
  description: 'Identify hidden assumptions in a block with risk assessment and impact analysis',
  inputSchema: z.object({
    assumptions: z.array(z.object({
      statement: z.string().describe('The assumption being made'),
      riskLevel: z.enum(['high', 'medium', 'low']).describe('How bad if this assumption is wrong'),
      reasoning: z.string().describe('Why this risk level was assigned'),
      affectedBlocks: z.array(z.string()).describe('Which blocks fail if this is wrong')
    }))
  }),
  execute: async (params) => params
});
```

**Step 2: Add suggestExperiment tool**

```typescript
export const suggestExperiment = tool({
  description: 'Suggest the cheapest/fastest experiment to validate an assumption',
  inputSchema: z.object({
    experimentType: z.enum(['survey', 'interview', 'mvp', 'ab_test', 'research']),
    description: z.string().describe('What to do step-by-step'),
    successCriteria: z.string().describe('How to know if assumption is validated'),
    costEstimate: z.string().describe('$0, $50, $500, etc.'),
    durationEstimate: z.string().describe('5 min, 1 week, 1 month, etc.'),
    reasoning: z.string().describe('Why this is the cheapest/fastest validation method')
  }),
  execute: async (params) => params
});
```

**Step 3: Add calculateConfidence tool**

```typescript
export const calculateConfidence = tool({
  description: 'Calculate confidence score (0-100) based on experiment evidence quality',
  inputSchema: z.object({
    confidenceScore: z.number().min(0).max(100),
    reasoning: z.string().describe('Why this confidence level'),
    evidenceQuality: z.enum(['strong', 'moderate', 'weak']),
    recommendedNextSteps: z.array(z.string()).describe('What else to test to increase confidence')
  }),
  execute: async (params) => params
});
```

**Step 4: Update tool registry**

Find the `allTools` object and add:

```typescript
const allTools: Record<string, ReturnType<typeof tool<any, any>>> = {
  // ... existing tools
  identifyAssumptions,
  suggestExperiment,
  calculateConfidence,
};
```

**Step 5: Commit**

```bash
git add lib/ai/tools.ts
git commit -m "feat(ai): add identifyAssumptions, suggestExperiment, calculateConfidence tools"
```

---

### Task 7: Create Risk Calculation Utilities

**Files:**
- Create: `lib/utils/risk.ts`

**Step 1: Create risk calculation functions**

```typescript
import type { Assumption, BlockType, BlockData, RiskMetrics } from '@/lib/types/canvas';

export function calculateBlockRisk(
  blockType: BlockType,
  assumptions: Assumption[]
): number {
  const linked = assumptions.filter(a => a.blockTypes.includes(blockType));

  let riskScore = 0;
  for (const a of linked) {
    if (a.status === 'untested') {
      riskScore += a.riskLevel === 'high' ? 30 : a.riskLevel === 'medium' ? 15 : 5;
    } else if (a.status === 'refuted') {
      riskScore += 40; // Highest risk - contradicted but not fixed
    } else if (a.status === 'inconclusive') {
      riskScore += 10;
    }
  }

  return Math.min(100, riskScore);
}

export function calculateBlockConfidence(
  blockType: BlockType,
  assumptions: Assumption[]
): number {
  const linked = assumptions.filter(a => a.blockTypes.includes(blockType));
  if (linked.length === 0) return 0; // No assumptions = no validation

  return Math.round(
    linked.reduce((sum, a) => sum + a.confidenceScore, 0) / linked.length
  );
}

export function calculateRiskMetrics(
  blockType: BlockType,
  assumptions: Assumption[]
): RiskMetrics {
  const linked = assumptions.filter(a => a.blockTypes.includes(blockType));

  const untestedHighRisk = linked.filter(
    a => a.status === 'untested' && a.riskLevel === 'high'
  ).length;

  const untestedMediumRisk = linked.filter(
    a => a.status === 'untested' && a.riskLevel === 'medium'
  ).length;

  const untestedLowRisk = linked.filter(
    a => a.status === 'untested' && a.riskLevel === 'low'
  ).length;

  const topRisks = linked
    .filter(a => a.status === 'untested' && a.riskLevel === 'high')
    .slice(0, 3)
    .map(a => a.statement);

  return {
    riskScore: calculateBlockRisk(blockType, assumptions),
    confidenceScore: calculateBlockConfidence(blockType, assumptions),
    untestedHighRisk,
    untestedMediumRisk,
    untestedLowRisk,
    topRisks,
  };
}

export function getRiskBorderClass(riskScore: number, confidenceScore: number): string {
  if (riskScore >= 70) return 'glow-critical';
  if (riskScore >= 40) return 'glow-warning';
  if (confidenceScore >= 70) return 'glow-healthy';
  return 'glow-calm';
}
```

**Step 2: Commit**

```bash
git add lib/utils/risk.ts
git commit -m "feat(utils): add risk calculation utilities"
```

---

### Task 8: Create Risk Heatmap API Route

**Files:**
- Create: `app/api/canvas/[canvasId]/risk-heatmap/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getLoggedInUser } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import type { Assumption, BlockType, RiskMetrics } from '@/lib/types/canvas';
import { calculateRiskMetrics } from '@/lib/utils/risk';

const ALL_BLOCK_TYPES: BlockType[] = [
  'key_partnerships',
  'key_activities',
  'key_resources',
  'value_prop',
  'customer_relationships',
  'channels',
  'customer_segments',
  'cost_structure',
  'revenue_streams',
];

export async function GET(
  request: NextRequest,
  { params }: { params: { canvasId: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all assumptions for this canvas
    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      queries: [Query.equal('canvas', params.canvasId)],
    });

    const assumptions = result.rows.map((row: any) => ({
      ...row,
      blockTypes: JSON.parse(row.blockTypes || '[]'),
      segmentIds: JSON.parse(row.segmentIds || '[]'),
      linkedValidationItemIds: JSON.parse(row.linkedValidationItemIds || '[]'),
    })) as Assumption[];

    // Calculate risk metrics for each block
    const heatmap: Record<BlockType, RiskMetrics> = {} as any;

    for (const blockType of ALL_BLOCK_TYPES) {
      heatmap[blockType] = calculateRiskMetrics(blockType, assumptions);
    }

    return NextResponse.json(heatmap);
  } catch (error) {
    console.error('Error calculating risk heatmap:', error);
    return NextResponse.json(
      { error: 'Failed to calculate risk heatmap' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/canvas/[canvasId]/risk-heatmap/route.ts
git commit -m "feat(api): add risk heatmap calculation endpoint"
```

---

## Phase 3: UI Foundation

### Task 9: Add Assumptions Tab to CanvasTabs

**Files:**
- Modify: `app/components/canvas/CanvasTabs.tsx`

**Step 1: Add assumptions tab**

Find the tabs array and add:

```typescript
const tabs = [
  { id: 'canvas', label: 'Canvas', icon: '🎨' },
  { id: 'analysis', label: 'Analysis', icon: '📊' },
  { id: 'assumptions', label: 'Assumptions', icon: '🔬' },  // NEW
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'debug', label: 'Debug', icon: '🐛' },
];
```

**Step 2: Verify rendering**

Run: `npm run dev`
Check: Assumptions tab appears in canvas view

**Step 3: Commit**

```bash
git add app/components/canvas/CanvasTabs.tsx
git commit -m "ui: add assumptions tab to canvas tabs"
```

---

### Task 10: Create Assumption Card Component

**Files:**
- Create: `app/components/canvas/AssumptionCard.tsx`

**Step 1: Create component**

```typescript
'use client';

import type { Assumption } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from './constants';

interface AssumptionCardProps {
  assumption: Assumption;
  onTest?: () => void;
  onUpdate?: () => void;
  onView?: () => void;
}

export function AssumptionCard({
  assumption,
  onTest,
  onUpdate,
  onView,
}: AssumptionCardProps) {
  const riskColor =
    assumption.riskLevel === 'high'
      ? 'var(--state-critical)'
      : assumption.riskLevel === 'medium'
        ? 'var(--state-warning)'
        : 'var(--state-healthy)';

  const riskEmoji = assumption.riskLevel === 'high' ? '🔴' : assumption.riskLevel === 'medium' ? '🟡' : '🟢';

  const blockLabels = assumption.blockTypes.map((bt) => {
    const def = BLOCK_DEFINITIONS.find((d) => d.type === bt);
    return def?.bmcLabel || bt;
  });

  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-2 animate-in fade-in duration-200">
      {/* Risk indicator and statement */}
      <div className="flex items-start gap-2">
        <span className="text-lg" style={{ color: riskColor }}>
          {riskEmoji}
        </span>
        <p className="flex-1 text-sm text-foreground line-clamp-2">
          {assumption.statement}
        </p>
      </div>

      {/* Block pills */}
      {blockLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {blockLabels.map((label, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-foreground-muted"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Experiment status */}
      {assumption.suggestedExperiment && (
        <p className="text-[10px] text-foreground-muted/70">
          🔬 AI suggests: {assumption.suggestedExperiment}{' '}
          {assumption.suggestedExperimentDuration && `(${assumption.suggestedExperimentDuration})`}
        </p>
      )}

      {/* Confidence */}
      {assumption.confidenceScore > 0 && (
        <p className="text-[10px] text-foreground-muted/70">
          📈 Confidence: {assumption.confidenceScore}%
        </p>
      )}

      {/* Action button */}
      {assumption.status === 'untested' && onTest && (
        <button
          onClick={onTest}
          className="w-full ui-btn ui-btn-xs ui-btn-secondary text-[10px]"
        >
          🎯 Run Test
        </button>
      )}
      {assumption.status === 'testing' && onUpdate && (
        <button
          onClick={onUpdate}
          className="w-full ui-btn ui-btn-xs ui-btn-secondary text-[10px]"
        >
          📈 Update
        </button>
      )}
      {(assumption.status === 'validated' || assumption.status === 'refuted') && onView && (
        <button
          onClick={onView}
          className="w-full ui-btn ui-btn-xs ui-btn-ghost text-[10px]"
        >
          📊 View
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/canvas/AssumptionCard.tsx
git commit -m "ui: create AssumptionCard component"
```

---

### Task 11: Create Basic AssumptionsView (Kanban Board)

**Files:**
- Create: `app/components/canvas/AssumptionsView.tsx`

**Step 1: Create component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import type { Assumption } from '@/lib/types/canvas';
import { AssumptionCard } from './AssumptionCard';

interface AssumptionsViewProps {
  canvasId: string;
}

export function AssumptionsView({ canvasId }: AssumptionsViewProps) {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssumptions() {
      try {
        const response = await fetch(`/api/canvas/${canvasId}/assumptions`);
        const data = await response.json();
        setAssumptions(data);
      } catch (error) {
        console.error('Error loading assumptions:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAssumptions();
  }, [canvasId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-foreground-muted">Loading assumptions...</p>
      </div>
    );
  }

  // Group by risk level and status
  const highRiskUntested = assumptions.filter(
    (a) => a.riskLevel === 'high' && a.status === 'untested'
  );
  const mediumRiskUntested = assumptions.filter(
    (a) => a.riskLevel === 'medium' && a.status === 'untested'
  );
  const lowRiskUntested = assumptions.filter(
    (a) => a.riskLevel === 'low' && a.status === 'untested'
  );
  const testing = assumptions.filter((a) => a.status === 'testing');
  const validated = assumptions.filter((a) => a.status === 'validated');
  const refuted = assumptions.filter((a) => a.status === 'refuted');

  return (
    <div className="h-full overflow-x-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-display-medium text-lg text-foreground">
          Risk Engine
        </h2>
        <div className="flex gap-2">
          <button className="ui-btn ui-btn-sm ui-btn-secondary">
            + New Assumption
          </button>
          <button className="ui-btn ui-btn-sm ui-btn-ghost">
            🔥 Risk Heatmap
          </button>
          <button className="ui-btn ui-btn-sm ui-btn-ghost">Filter</button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 p-4 min-w-max">
        {/* Column 1: High Risk Untested */}
        <div className="w-72 shrink-0">
          <div className="mb-3">
            <h3 className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/60 mb-1">
              🔴 HIGH RISK
            </h3>
            <p className="text-[10px] text-foreground-muted/40">
              UNTESTED ({highRiskUntested.length})
            </p>
          </div>
          <div className="space-y-2">
            {highRiskUntested.map((a) => (
              <AssumptionCard key={a.$id} assumption={a} />
            ))}
            {highRiskUntested.length === 0 && (
              <p className="text-[11px] text-foreground-muted/40 text-center py-4">
                No high-risk assumptions
              </p>
            )}
          </div>
        </div>

        {/* Column 2: Medium Risk Untested */}
        <div className="w-72 shrink-0">
          <div className="mb-3">
            <h3 className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/60 mb-1">
              ⚠️ MEDIUM RISK
            </h3>
            <p className="text-[10px] text-foreground-muted/40">
              UNTESTED ({mediumRiskUntested.length})
            </p>
          </div>
          <div className="space-y-2">
            {mediumRiskUntested.map((a) => (
              <AssumptionCard key={a.$id} assumption={a} />
            ))}
            {mediumRiskUntested.length === 0 && (
              <p className="text-[11px] text-foreground-muted/40 text-center py-4">
                No medium-risk assumptions
              </p>
            )}
          </div>
        </div>

        {/* Column 3: Low Risk Untested */}
        <div className="w-72 shrink-0">
          <div className="mb-3">
            <h3 className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/60 mb-1">
              🟢 LOW RISK
            </h3>
            <p className="text-[10px] text-foreground-muted/40">
              UNTESTED ({lowRiskUntested.length})
            </p>
          </div>
          <div className="space-y-2">
            {lowRiskUntested.map((a) => (
              <AssumptionCard key={a.$id} assumption={a} />
            ))}
            {lowRiskUntested.length === 0 && (
              <p className="text-[11px] text-foreground-muted/40 text-center py-4">
                No low-risk assumptions
              </p>
            )}
          </div>
        </div>

        {/* Column 4: Testing */}
        <div className="w-72 shrink-0">
          <div className="mb-3">
            <h3 className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/60 mb-1">
              🔄 TESTING
            </h3>
            <p className="text-[10px] text-foreground-muted/40">
              ({testing.length})
            </p>
          </div>
          <div className="space-y-2">
            {testing.map((a) => (
              <AssumptionCard key={a.$id} assumption={a} />
            ))}
            {testing.length === 0 && (
              <p className="text-[11px] text-foreground-muted/40 text-center py-4">
                No experiments in progress
              </p>
            )}
          </div>
        </div>

        {/* Column 5: Validated */}
        <div className="w-72 shrink-0">
          <div className="mb-3">
            <h3 className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/60 mb-1">
              ✅ VALIDATED
            </h3>
            <p className="text-[10px] text-foreground-muted/40">
              ({validated.length})
            </p>
          </div>
          <div className="space-y-2">
            {validated.map((a) => (
              <AssumptionCard key={a.$id} assumption={a} />
            ))}
            {validated.length === 0 && (
              <p className="text-[11px] text-foreground-muted/40 text-center py-4">
                No validated assumptions
              </p>
            )}
          </div>
        </div>

        {/* Column 6: Refuted */}
        <div className="w-72 shrink-0">
          <div className="mb-3">
            <h3 className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/60 mb-1">
              ❌ REFUTED
            </h3>
            <p className="text-[10px] text-foreground-muted/40">
              ({refuted.length})
            </p>
          </div>
          <div className="space-y-2">
            {refuted.map((a) => (
              <AssumptionCard key={a.$id} assumption={a} />
            ))}
            {refuted.length === 0 && (
              <p className="text-[11px] text-foreground-muted/40 text-center py-4">
                No refuted assumptions
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/canvas/AssumptionsView.tsx
git commit -m "ui: create AssumptionsView kanban board"
```

---

### Task 12: Wire Up AssumptionsView in CanvasClient

**Files:**
- Modify: `app/canvas/[slug]/CanvasClient.tsx`

**Step 1: Import AssumptionsView**

Add to imports:

```typescript
import { AssumptionsView } from '@/app/components/canvas/AssumptionsView';
```

**Step 2: Add to tab switch**

Find the switch statement for `activeTab` and add:

```typescript
{activeTab === 'assumptions' && (
  <AssumptionsView canvasId={canvas.$id} />
)}
```

**Step 3: Test manually**

Run: `npm run dev`
Navigate to canvas and click Assumptions tab
Expected: Kanban board renders (empty initially)

**Step 4: Commit**

```bash
git add app/canvas/[slug]/CanvasClient.tsx
git commit -m "ui: wire up AssumptionsView to canvas client"
```

---

## Phase 4: Risk Heatmap & Enhanced Block Analysis

### Task 13: Enhance Block Analyze Endpoint to Auto-Create Assumptions

**Files:**
- Modify: `app/api/canvas/[canvasId]/blocks/[blockType]/analyze/route.ts`

**Step 1: Add assumption creation logic**

After the existing `analyzeBlock` tool call, add:

```typescript
// After getting the analysis result...

// Auto-create assumptions if identifyAssumptions returned data
if (step.toolCalls && step.toolCalls.length > 0) {
  const assumptionsTool = step.toolCalls.find(tc => tc.toolName === 'identifyAssumptions');

  if (assumptionsTool && assumptionsTool.result) {
    const { assumptions: aiAssumptions } = assumptionsTool.result as {
      assumptions: Array<{
        statement: string;
        riskLevel: 'high' | 'medium' | 'low';
        reasoning: string;
        affectedBlocks: string[];
      }>;
    };

    const { ID } = await import('node-appwrite');
    const { ASSUMPTIONS_TABLE_ID } = await import('@/lib/appwrite');

    // Create assumption records
    const createdAssumptions = [];
    for (const assump of aiAssumptions) {
      try {
        const assumption = await serverTablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: ASSUMPTIONS_TABLE_ID,
          rowId: ID.unique(),
          data: {
            canvas: canvasId,
            statement: assump.statement,
            status: 'untested',
            riskLevel: assump.riskLevel,
            confidenceScore: 0,
            source: 'ai',
            blockTypes: JSON.stringify(assump.affectedBlocks || [blockType]),
            segmentIds: JSON.stringify([]),
            linkedValidationItemIds: JSON.stringify([]),
            suggestedExperiment: null,
            suggestedExperimentDuration: null,
            createdAt: now,
            updatedAt: now,
            lastTestedAt: null,
          },
        });

        createdAssumptions.push(assumption);
      } catch (error) {
        console.error('Error creating assumption:', error);
      }
    }

    // Return both analysis and created assumptions
    return NextResponse.json({
      analysis,
      assumptions: createdAssumptions,
      usage,
    });
  }
}
```

**Step 2: Update agent to use identifyAssumptions**

Modify `lib/ai/agents.ts` to include `identifyAssumptions` in the toolNames for all agents:

```typescript
const toolNames: string[] = [
  'analyzeBlock',
  'identifyAssumptions',  // NEW
  'proposeBlockEdit',
  'createBlockItems',
  'createSegments',
];
```

**Step 3: Commit**

```bash
git add app/api/canvas/[canvasId]/blocks/[blockType]/analyze/route.ts
git add lib/ai/agents.ts
git commit -m "feat(ai): auto-create assumptions from block analysis"
```

---

## Phase 5: Modals & Complete Workflows

### Task 14: Create Manual Assumption Modal

**Files:**
- Create: `app/components/canvas/ManualAssumptionModal.tsx`

**Step 1: Create component**

```typescript
'use client';

import { useState } from 'react';
import type { BlockType } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from './constants';

interface ManualAssumptionModalProps {
  canvasId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function ManualAssumptionModal({
  canvasId,
  isOpen,
  onClose,
  onCreated,
}: ManualAssumptionModalProps) {
  const [statement, setStatement] = useState('');
  const [riskLevel, setRiskLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedBlocks, setSelectedBlocks] = useState<BlockType[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!statement.trim() || selectedBlocks.length === 0) return;

    setLoading(true);
    try {
      await fetch(`/api/canvas/${canvasId}/assumptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statement: statement.trim(),
          riskLevel,
          blockTypes: selectedBlocks,
          segmentIds: [],
          source: 'user',
        }),
      });

      onCreated?.();
      onClose();
      setStatement('');
      setSelectedBlocks([]);
      setRiskLevel('medium');
    } catch (error) {
      console.error('Error creating assumption:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = (blockType: BlockType) => {
    setSelectedBlocks((prev) =>
      prev.includes(blockType)
        ? prev.filter((b) => b !== blockType)
        : [...prev, blockType]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-white/10 rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="font-display-medium text-lg text-foreground">
          Create Assumption
        </h2>

        {/* Statement */}
        <div>
          <label className="block text-sm text-foreground-muted mb-1">
            Statement:
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Coffee shop owners prefer desktop interfaces..."
            className="w-full bg-white/3 rounded px-3 py-2 text-sm text-foreground outline-none resize-none border border-white/5 focus:border-white/15"
            rows={3}
          />
        </div>

        {/* Risk Level */}
        <div>
          <label className="block text-sm text-foreground-muted mb-2">
            Risk Level:
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={riskLevel === 'high'}
                onChange={() => setRiskLevel('high')}
                className="accent-red-500"
              />
              <span className="text-sm text-foreground">
                🔴 High - Business fails if wrong
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={riskLevel === 'medium'}
                onChange={() => setRiskLevel('medium')}
                className="accent-yellow-500"
              />
              <span className="text-sm text-foreground">
                🟡 Medium - Delays or pivots needed
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={riskLevel === 'low'}
                onChange={() => setRiskLevel('low')}
                className="accent-green-500"
              />
              <span className="text-sm text-foreground">
                🟢 Low - Minor adjustment needed
              </span>
            </label>
          </div>
        </div>

        {/* Related Blocks */}
        <div>
          <label className="block text-sm text-foreground-muted mb-2">
            Related Blocks: (select multiple)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_DEFINITIONS.map((def) => (
              <label
                key={def.type}
                className="flex items-center gap-2 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={selectedBlocks.includes(def.type)}
                  onChange={() => toggleBlock(def.type)}
                />
                <span className="text-foreground-muted">{def.bmcLabel}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="ui-btn ui-btn-ghost flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="ui-btn ui-btn-primary flex-1"
            disabled={loading || !statement.trim() || selectedBlocks.length === 0}
          >
            {loading ? 'Creating...' : 'Create & Get Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Wire up to AssumptionsView**

Modify `AssumptionsView.tsx` to add modal:

```typescript
import { ManualAssumptionModal } from './ManualAssumptionModal';

// Add state
const [showModal, setShowModal] = useState(false);

// Update button
<button
  onClick={() => setShowModal(true)}
  className="ui-btn ui-btn-sm ui-btn-secondary"
>
  + New Assumption
</button>

// Add modal at end of component
<ManualAssumptionModal
  canvasId={canvasId}
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onCreated={() => {
    setShowModal(false);
    loadAssumptions(); // Refresh list
  }}
/>
```

**Step 3: Commit**

```bash
git add app/components/canvas/ManualAssumptionModal.tsx
git add app/components/canvas/AssumptionsView.tsx
git commit -m "ui: add manual assumption creation modal"
```

---

## Phase 6: Documentation & Testing

### Task 15: Update CanvasTab Type Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Document assumptions tab**

Find the "Current State" section and add:

```markdown
- ✅ Assumptions Layer (Risk Engine) - assumption validation workflow
  - Assumption → Experiment → Evidence flow
  - Risk-first kanban board (6 columns)
  - Auto-extraction from AI block analysis
  - Canvas risk heatmap (coming soon)
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document assumptions layer in CLAUDE.md"
```

---

### Task 16: Manual Testing Checklist

**Test Plan:**

1. **Create manual assumption:**
   - Click "+ New Assumption" in Assumptions tab
   - Fill form with statement, risk level, related blocks
   - Verify assumption appears in correct kanban column

2. **Auto-create from AI:**
   - Analyze a block (e.g., Value Propositions)
   - Check Assumptions tab
   - Verify AI-generated assumptions appear

3. **Test API endpoints:**
   - List assumptions: GET `/api/canvas/[id]/assumptions`
   - Create assumption: POST `/api/canvas/[id]/assumptions`
   - Update assumption: PATCH `/api/canvas/[id]/assumptions/[id]`
   - Get risk heatmap: GET `/api/canvas/[id]/risk-heatmap`

4. **Visual checks:**
   - Verify kanban columns render correctly
   - Check assumption cards show risk indicators
   - Confirm tab navigation works

---

## Remaining Work (Future PRs)

The following components are designed but not yet implemented:

### Phase 7: Experiment Modals
- ExperimentDesignModal.tsx
- EvidenceCollectionModal.tsx
- Wire up [Run Test] and [Update] buttons

### Phase 8: Risk Heatmap Visualization
- RiskHeatmapOverlay.tsx
- Update BlockCell.tsx with risk borders
- Add hover tooltips with risk metrics

### Phase 9: Block Focus Panel Integration
- RiskAnalysisPanel.tsx
- Show block-specific assumptions
- Quick test actions

### Phase 10: Analysis Tab Enhancement
- RiskOverviewSection.tsx
- Canvas-wide risk summary
- Top priorities to test

### Phase 11: Polish
- Drag-and-drop between columns
- Loading states
- Error handling
- Mobile responsive

---

## Summary

This plan implements the foundation of the Assumptions Layer:
- ✅ Data layer (types, API routes, Appwrite schema)
- ✅ AI integration (new tools, auto-creation)
- ✅ UI foundation (kanban board, assumption cards)
- ✅ Manual assumption creation
- ⏳ Experiment workflows (design & evidence collection)
- ⏳ Risk heatmap visualization
- ⏳ Block Focus Panel integration
- ⏳ Analysis tab enhancement

**Next Steps:** Implement remaining modals and risk visualization in follow-up PRs.
