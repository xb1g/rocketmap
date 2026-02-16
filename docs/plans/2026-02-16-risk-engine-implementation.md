# Risk Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform RocketMap's basic assumption extraction into a full Assumption → Experiment → Evidence validation engine with risk heatmap, kanban board, and confidence scoring.

**Architecture:** Extend the existing `assumptions` Appwrite table with risk/confidence fields, create a new `experiments` table, add 3 new AI tools (identifyAssumptions, suggestExperiment, calculateConfidence), replace the flat AssumptionsView with a risk-first kanban board, and overlay risk indicators on the BMC grid.

**Tech Stack:** Next.js 16 (App Router), Appwrite TablesDB, Vercel AI SDK, Radix UI, Tailwind CSS

---

## Current State Summary

**What exists:**
- `assumptions` table: `$id`, `assumptionText`, `category`, `status` (untested/testing/validated/invalid), `severityScore` (0-10), `blocks` (M:M relationship)
- `AssumptionsView` component: flat list sorted by severity, AI extraction via streaming SSE
- API: `POST /api/canvas/[canvasId]/assumptions/analyze` — uses `extractAssumptions` tool
- Types: `Assumption` (with `priority`/`statement`), `AssumptionTest`, in `lib/types/canvas.ts`
- Tab: "Assumptions" already in `CanvasTabs` and wired in `CanvasClient`

**What's missing:**
- Experiments table + CRUD
- riskLevel, confidenceScore, source, suggestedExperiment columns on assumptions
- New AI tools (identifyAssumptions, suggestExperiment, calculateConfidence)
- Risk calculation utilities
- Kanban board UI (replace flat list)
- Experiment design + evidence collection modals
- Manual assumption creation modal
- Canvas risk heatmap overlay
- Block Focus Panel risk section
- Analysis tab risk overview

---

## Phase 1: Schema & Types

### Task 1: Add New Columns to Assumptions Table (Manual Appwrite Console)

> **MANUAL STEP** — Must be done in Appwrite Console before running code.

**Add these columns to the `assumptions` collection:**

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `riskLevel` | Enum (`high`, `medium`, `low`) | No | `medium` | Maps severity 0-10 → high/medium/low |
| `confidenceScore` | Double | No | `0` | 0-100 scale |
| `source` | Enum (`ai`, `user`) | No | `ai` | Who created it |
| `suggestedExperiment` | String (500) | No | null | AI-generated test suggestion |
| `suggestedExperimentDuration` | String (100) | No | null | e.g. "5 min", "1 week" |
| `segmentIds` | String (1000) | No | `[]` | JSON array of segment $ids |
| `linkedValidationItemIds` | String (1000) | No | `[]` | JSON array |
| `createdAt` | DateTime | No | null | |
| `updatedAt` | DateTime | No | null | |
| `lastTestedAt` | DateTime | No | null | |

**Add these indexes:**
- `riskLevel` (key)
- `source` (key)

**Create `experiments` collection:**

| Column | Type | Required | Default |
|--------|------|----------|---------|
| `assumption` | Relationship (Many-to-One with `assumptions`, Cascade) | Yes | — |
| `type` | Enum (`survey`, `interview`, `mvp`, `ab_test`, `research`, `other`) | Yes | — |
| `description` | LongText | Yes | — |
| `successCriteria` | String (500) | Yes | — |
| `status` | Enum (`planned`, `running`, `completed`) | No | `planned` |
| `result` | Enum (`supports`, `contradicts`, `mixed`, `inconclusive`) | No | null |
| `evidence` | LongText | No | `''` |
| `sourceUrl` | String (500) | No | null |
| `costEstimate` | String (50) | No | null |
| `durationEstimate` | String (50) | No | null |
| `createdAt` | DateTime | No | null |
| `completedAt` | DateTime | No | null |

**Add index:** `assumption` (key)

**Verify:** Go to Appwrite Console → Database → confirm both collections exist with all columns.

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/types/canvas.ts`

**Step 1: Update the Assumption interface and add Experiment types**

Find the existing assumption types section (around line 269-298). Replace with:

```typescript
// ─── Assumption Types ─────────────────────────────────────────────────────────

export type AssumptionStatus = 'untested' | 'testing' | 'validated' | 'refuted' | 'inconclusive';
export type AssumptionRiskLevel = 'high' | 'medium' | 'low';
export type ExperimentType = 'survey' | 'interview' | 'mvp' | 'ab_test' | 'research' | 'other';
export type ExperimentStatus = 'planned' | 'running' | 'completed';
export type ExperimentResult = 'supports' | 'contradicts' | 'mixed' | 'inconclusive';

export interface Assumption {
  $id: string;
  canvasId: string;
  statement: string;
  category: 'market' | 'product' | 'ops' | 'legal';
  status: AssumptionStatus;
  riskLevel: AssumptionRiskLevel;
  severityScore: number; // 0-10 (legacy, kept for backward compat)
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

**Step 2: Remove the old `AssumptionPriority` and `AssumptionTest` types** (replaced by `AssumptionRiskLevel` and `Experiment`)

**Step 3: Verify**

Run: `npm run lint`
Expected: May have errors in `AssumptionsView.tsx` (uses old `AssumptionItem` interface) — that's OK, we'll fix it in Task 9.

**Step 4: Commit**

```bash
git add lib/types/canvas.ts
git commit -m "feat(types): expand Assumption with riskLevel/confidence, add Experiment and RiskMetrics types"
```

---

### Task 3: Add Experiments Table Constant

**Files:**
- Modify: `lib/appwrite.ts`

**Step 1: Add constant**

After the `ASSUMPTIONS_TABLE_ID` line (line 37), add:

```typescript
export const EXPERIMENTS_TABLE_ID = "experiments";
```

**Step 2: Commit**

```bash
git add lib/appwrite.ts
git commit -m "feat(appwrite): add EXPERIMENTS_TABLE_ID constant"
```

---

## Phase 2: API Routes

### Task 4: Create Assumptions CRUD API

**Files:**
- Create: `app/api/canvas/[canvasId]/assumptions/route.ts`

**Step 1: Implement GET (list) and POST (create) endpoints**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Query, ID } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import type { Assumption, BlockType } from '@/lib/types/canvas';

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

/** Parse an Appwrite assumption row into our Assumption interface */
function parseAssumptionRow(row: Record<string, unknown>): Assumption {
  // blockTypes: either from M:M relationship `blocks` or from JSON field
  let blockTypes: BlockType[] = [];
  if (Array.isArray(row.blocks)) {
    blockTypes = (row.blocks as Array<{ blockType?: string }>)
      .map(b => b.blockType as BlockType)
      .filter(Boolean);
  }

  return {
    $id: row.$id as string,
    canvasId: typeof row.canvas === 'string' ? row.canvas : (row.canvas as { $id: string })?.$id ?? '',
    statement: (row.assumptionText as string) ?? '',
    category: (row.category as Assumption['category']) ?? 'product',
    status: (row.status as Assumption['status']) ?? 'untested',
    riskLevel: (row.riskLevel as Assumption['riskLevel']) ?? 'medium',
    severityScore: (row.severityScore as number) ?? 0,
    confidenceScore: (row.confidenceScore as number) ?? 0,
    source: (row.source as Assumption['source']) ?? 'ai',
    blockTypes,
    segmentIds: safeJsonParse(row.segmentIds as string, []),
    linkedValidationItemIds: safeJsonParse(row.linkedValidationItemIds as string, []),
    suggestedExperiment: (row.suggestedExperiment as string) ?? undefined,
    suggestedExperimentDuration: (row.suggestedExperimentDuration as string) ?? undefined,
    createdAt: (row.createdAt as string) ?? (row.$createdAt as string) ?? '',
    updatedAt: (row.updatedAt as string) ?? (row.$updatedAt as string) ?? '',
    lastTestedAt: (row.lastTestedAt as string) ?? undefined,
  };
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { canvasId } = await context.params;

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      queries: [
        Query.equal('canvas', canvasId),
        Query.limit(200),
      ],
    });

    const assumptions = result.rows.map(parseAssumptionRow);
    return NextResponse.json(assumptions);
  } catch (error) {
    console.error('Error fetching assumptions:', error);
    return NextResponse.json({ error: 'Failed to fetch assumptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { canvasId } = await context.params;
    const body = await request.json();

    const { statement, riskLevel, category, blockTypes, segmentIds, source } = body;
    if (!statement || !riskLevel) {
      return NextResponse.json({ error: 'Missing required fields: statement, riskLevel' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Resolve block type strings → block $ids for M:M relationship
    let blockIds: string[] = [];
    if (Array.isArray(blockTypes) && blockTypes.length > 0) {
      const blocksResult = await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'blocks',
        queries: [
          Query.equal('canvas', canvasId),
          Query.select(['$id', 'blockType']),
          Query.limit(100),
        ],
      });
      const blockIdMap = new Map<string, string>();
      for (const doc of blocksResult.rows) {
        blockIdMap.set(doc.blockType as string, doc.$id as string);
      }
      blockIds = blockTypes.map((bt: string) => blockIdMap.get(bt)).filter((id): id is string => !!id);
    }

    // Map severityScore from riskLevel for backward compat
    const severityScore = riskLevel === 'high' ? 8 : riskLevel === 'medium' ? 5 : 2;

    const row = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        canvas: canvasId,
        assumptionText: statement,
        category: category ?? 'product',
        status: 'untested',
        riskLevel,
        severityScore,
        confidenceScore: 0,
        source: source ?? 'user',
        segmentIds: JSON.stringify(segmentIds ?? []),
        linkedValidationItemIds: JSON.stringify([]),
        suggestedExperiment: null,
        suggestedExperimentDuration: null,
        createdAt: now,
        updatedAt: now,
        lastTestedAt: null,
        ...(blockIds.length > 0 ? { blocks: blockIds } : {}),
      },
    });

    return NextResponse.json(parseAssumptionRow(row), { status: 201 });
  } catch (error) {
    console.error('Error creating assumption:', error);
    return NextResponse.json({ error: 'Failed to create assumption' }, { status: 500 });
  }
}
```

**Step 2: Verify**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add app/api/canvas/\[canvasId\]/assumptions/route.ts
git commit -m "feat(api): add assumptions list and create endpoints"
```

---

### Task 5: Create Assumption Detail API (GET, PATCH, DELETE)

**Files:**
- Create: `app/api/canvas/[canvasId]/assumptions/[id]/route.ts`

**Step 1: Implement endpoints**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const row = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error('Error fetching assumption:', error);
    return NextResponse.json({ error: 'Assumption not found' }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.statement !== undefined) updates.assumptionText = body.statement;
    if (body.status !== undefined) updates.status = body.status;
    if (body.riskLevel !== undefined) updates.riskLevel = body.riskLevel;
    if (body.confidenceScore !== undefined) updates.confidenceScore = body.confidenceScore;
    if (body.suggestedExperiment !== undefined) updates.suggestedExperiment = body.suggestedExperiment;
    if (body.suggestedExperimentDuration !== undefined) updates.suggestedExperimentDuration = body.suggestedExperimentDuration;
    if (body.lastTestedAt !== undefined) updates.lastTestedAt = body.lastTestedAt;
    if (body.segmentIds !== undefined) updates.segmentIds = JSON.stringify(body.segmentIds);

    const row = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
      data: updates,
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error('Error updating assumption:', error);
    return NextResponse.json({ error: 'Failed to update assumption' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assumption:', error);
    return NextResponse.json({ error: 'Failed to delete assumption' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/canvas/\[canvasId\]/assumptions/\[id\]/route.ts
git commit -m "feat(api): add assumption get, update, delete endpoints"
```

---

### Task 6: Create Experiments CRUD API

**Files:**
- Create: `app/api/canvas/[canvasId]/assumptions/[id]/experiments/route.ts`
- Create: `app/api/canvas/[canvasId]/assumptions/[assumptionId]/experiments/[id]/route.ts`

**Step 1: Create list/create route**

`app/api/canvas/[canvasId]/assumptions/[id]/experiments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Query, ID } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  EXPERIMENTS_TABLE_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id: assumptionId } = await context.params;

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      queries: [Query.equal('assumption', assumptionId)],
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id: assumptionId } = await context.params;
    const body = await request.json();

    const { type, description, successCriteria, costEstimate, durationEstimate } = body;
    if (!type || !description || !successCriteria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const experiment = await serverTablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        assumption: assumptionId,
        type,
        description,
        successCriteria,
        status: 'planned',
        result: null,
        evidence: '',
        sourceUrl: null,
        costEstimate: costEstimate ?? null,
        durationEstimate: durationEstimate ?? null,
        createdAt: now,
        completedAt: null,
      },
    });

    // Update assumption status to 'testing'
    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      rowId: assumptionId,
      data: { status: 'testing', updatedAt: now },
    });

    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    console.error('Error creating experiment:', error);
    return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
  }
}
```

**Step 2: Create update/delete route**

`app/api/canvas/[canvasId]/assumptions/[assumptionId]/experiments/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  EXPERIMENTS_TABLE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ canvasId: string; assumptionId: string; id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { assumptionId, id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.result !== undefined) updates.result = body.result;
    if (body.evidence !== undefined) updates.evidence = body.evidence;
    if (body.sourceUrl !== undefined) updates.sourceUrl = body.sourceUrl;

    // If marking as completed, auto-update assumption status
    if (body.status === 'completed') {
      updates.completedAt = new Date().toISOString();

      if (body.result) {
        const assumptionUpdates: Record<string, unknown> = {
          lastTestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (body.result === 'supports') assumptionUpdates.status = 'validated';
        else if (body.result === 'contradicts') assumptionUpdates.status = 'refuted';
        else assumptionUpdates.status = 'inconclusive';

        await serverTablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: ASSUMPTIONS_TABLE_ID,
          rowId: assumptionId,
          data: assumptionUpdates,
        });
      }
    }

    const experiment = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: id,
      data: updates,
    });

    return NextResponse.json(experiment);
  } catch (error) {
    console.error('Error updating experiment:', error);
    return NextResponse.json({ error: 'Failed to update experiment' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: EXPERIMENTS_TABLE_ID,
      rowId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/canvas/\[canvasId\]/assumptions/\[id\]/experiments/route.ts
git add app/api/canvas/\[canvasId\]/assumptions/\[assumptionId\]/experiments/\[id\]/route.ts
git commit -m "feat(api): add experiments CRUD endpoints with auto assumption status updates"
```

---

### Task 7: Create Risk Heatmap API

**Files:**
- Create: `app/api/canvas/[canvasId]/risk-heatmap/route.ts`
- Create: `lib/utils/risk.ts`

**Step 1: Create risk calculation utilities**

`lib/utils/risk.ts`:

```typescript
import type { Assumption, BlockType, RiskMetrics } from '@/lib/types/canvas';

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
      riskScore += 40;
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
  if (linked.length === 0) return 0;

  return Math.round(
    linked.reduce((sum, a) => sum + a.confidenceScore, 0) / linked.length
  );
}

export function calculateRiskMetrics(
  blockType: BlockType,
  assumptions: Assumption[]
): RiskMetrics {
  const linked = assumptions.filter(a => a.blockTypes.includes(blockType));

  return {
    riskScore: calculateBlockRisk(blockType, assumptions),
    confidenceScore: calculateBlockConfidence(blockType, assumptions),
    untestedHighRisk: linked.filter(a => a.status === 'untested' && a.riskLevel === 'high').length,
    untestedMediumRisk: linked.filter(a => a.status === 'untested' && a.riskLevel === 'medium').length,
    untestedLowRisk: linked.filter(a => a.status === 'untested' && a.riskLevel === 'low').length,
    topRisks: linked
      .filter(a => a.status === 'untested' && a.riskLevel === 'high')
      .slice(0, 3)
      .map(a => a.statement),
  };
}

export function getRiskBorderClass(riskScore: number, confidenceScore: number): string {
  if (riskScore >= 70) return 'glow-critical';
  if (riskScore >= 40) return 'glow-warning';
  if (confidenceScore >= 70) return 'glow-healthy';
  return '';
}
```

**Step 2: Create risk heatmap endpoint**

`app/api/canvas/[canvasId]/risk-heatmap/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverTablesDB,
  DATABASE_ID,
  ASSUMPTIONS_TABLE_ID,
} from '@/lib/appwrite';
import type { Assumption, BlockType, RiskMetrics } from '@/lib/types/canvas';
import { calculateRiskMetrics } from '@/lib/utils/risk';

// Re-use the parseAssumptionRow function from the assumptions route
// (In practice, extract to a shared util — for now, inline a simplified version)

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

const ALL_BLOCK_TYPES: BlockType[] = [
  'key_partnerships', 'key_activities', 'key_resources',
  'value_prop', 'customer_relationships', 'channels',
  'customer_segments', 'cost_structure', 'revenue_streams',
];

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { canvasId } = await context.params;

    const result = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ASSUMPTIONS_TABLE_ID,
      queries: [
        Query.equal('canvas', canvasId),
        Query.limit(200),
      ],
    });

    // Parse rows into Assumption[] (extract blockTypes from M:M relationship)
    const assumptions: Assumption[] = result.rows.map((row: Record<string, unknown>) => {
      let blockTypes: BlockType[] = [];
      if (Array.isArray(row.blocks)) {
        blockTypes = (row.blocks as Array<{ blockType?: string }>)
          .map(b => b.blockType as BlockType)
          .filter(Boolean);
      }
      return {
        $id: row.$id as string,
        canvasId,
        statement: (row.assumptionText as string) ?? '',
        category: (row.category as Assumption['category']) ?? 'product',
        status: (row.status as Assumption['status']) ?? 'untested',
        riskLevel: (row.riskLevel as Assumption['riskLevel']) ?? 'medium',
        severityScore: (row.severityScore as number) ?? 0,
        confidenceScore: (row.confidenceScore as number) ?? 0,
        source: (row.source as Assumption['source']) ?? 'ai',
        blockTypes,
        segmentIds: [],
        linkedValidationItemIds: [],
        createdAt: (row.createdAt as string) ?? '',
        updatedAt: (row.updatedAt as string) ?? '',
      };
    });

    const heatmap: Record<BlockType, RiskMetrics> = {} as Record<BlockType, RiskMetrics>;
    for (const blockType of ALL_BLOCK_TYPES) {
      heatmap[blockType] = calculateRiskMetrics(blockType, assumptions);
    }

    return NextResponse.json(heatmap);
  } catch (error) {
    console.error('Error calculating risk heatmap:', error);
    return NextResponse.json({ error: 'Failed to calculate risk heatmap' }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add lib/utils/risk.ts app/api/canvas/\[canvasId\]/risk-heatmap/route.ts
git commit -m "feat: add risk calculation utilities and risk heatmap API endpoint"
```

---

## Phase 3: AI Tools

### Task 8: Add New AI Tools

**Files:**
- Modify: `lib/ai/tools.ts`
- Modify: `lib/ai/agents.ts`

**Step 1: Add identifyAssumptions tool**

In `lib/ai/tools.ts`, add after the existing `extractAssumptions` tool (around line 57):

```typescript
export const identifyAssumptions = tool({
  description: 'Identify hidden assumptions in a block with risk assessment and impact analysis. Use this alongside analyzeBlock to extract structured assumptions with risk levels.',
  inputSchema: z.object({
    assumptions: z.array(z.object({
      statement: z.string().describe('The assumption being made — specific and testable'),
      riskLevel: z.enum(['high', 'medium', 'low']).describe('How bad if this assumption is wrong: high=business fails, medium=delays/pivots, low=minor adjustment'),
      reasoning: z.string().describe('Why this risk level was assigned'),
      affectedBlocks: z.array(z.string()).describe('Which block types fail if this is wrong (e.g. "value_prop", "revenue_streams")')
    }))
  }),
  execute: async (params) => params
});

export const suggestExperiment = tool({
  description: 'Suggest the cheapest/fastest experiment to validate a specific assumption. Prioritize free/low-cost methods and short timelines.',
  inputSchema: z.object({
    experimentType: z.enum(['survey', 'interview', 'mvp', 'ab_test', 'research', 'other']),
    description: z.string().describe('Step-by-step instructions for running the experiment'),
    successCriteria: z.string().describe('How to know if the assumption is validated (specific, measurable)'),
    costEstimate: z.string().describe('$0, $50, $500, etc.'),
    durationEstimate: z.string().describe('5 min, 1 week, 1 month, etc.'),
    reasoning: z.string().describe('Why this is the cheapest/fastest validation method')
  }),
  execute: async (params) => params
});

export const calculateConfidence = tool({
  description: 'Calculate confidence score (0-100) based on experiment evidence quality. Consider sample size, methodology rigor, and relevance.',
  inputSchema: z.object({
    confidenceScore: z.number().min(0).max(100),
    reasoning: z.string().describe('Why this confidence level based on evidence'),
    evidenceQuality: z.enum(['strong', 'moderate', 'weak']),
    recommendedNextSteps: z.array(z.string()).describe('What else to test to increase confidence')
  }),
  execute: async (params) => params
});
```

**Step 2: Register tools**

In the `allTools` object (around line 533), add:

```typescript
  identifyAssumptions,
  suggestExperiment,
  calculateConfidence,
```

**Step 3: Update agents to include identifyAssumptions**

In `lib/ai/agents.ts`, update the `toolNames` array (line 8):

```typescript
const toolNames: string[] = ['analyzeBlock', 'identifyAssumptions', 'proposeBlockEdit', 'createBlockItems', 'createSegments'];
```

**Step 4: Verify**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/ai/tools.ts lib/ai/agents.ts
git commit -m "feat(ai): add identifyAssumptions, suggestExperiment, calculateConfidence tools"
```

---

## Phase 4: UI — Kanban Board

### Task 9: Create AssumptionCard Component

**Files:**
- Create: `app/components/canvas/AssumptionCard.tsx`

**Step 1: Implement card component**

```typescript
'use client';

import type { Assumption } from '@/lib/types/canvas';
import { BLOCK_DEFINITIONS } from './constants';

interface AssumptionCardProps {
  assumption: Assumption;
  onDesignTest?: () => void;
  onUpdateProgress?: () => void;
  onViewEvidence?: () => void;
}

function getBlockLabel(blockType: string): string {
  const def = BLOCK_DEFINITIONS.find(d => d.type === blockType);
  return def?.bmcLabel ?? blockType.replace(/_/g, ' ');
}

export function AssumptionCard({
  assumption,
  onDesignTest,
  onUpdateProgress,
  onViewEvidence,
}: AssumptionCardProps) {
  const riskColor =
    assumption.riskLevel === 'high' ? 'var(--state-critical)'
    : assumption.riskLevel === 'medium' ? 'var(--state-warning)'
    : 'var(--state-healthy)';

  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-2">
      {/* Statement */}
      <p className="text-sm leading-relaxed">{assumption.statement}</p>

      {/* Block pills */}
      {assumption.blockTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {assumption.blockTypes.map(bt => (
            <span key={bt} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-foreground-muted">
              {getBlockLabel(bt)}
            </span>
          ))}
        </div>
      )}

      {/* Experiment hint */}
      {assumption.suggestedExperiment && assumption.status === 'untested' && (
        <p className="text-[10px] text-foreground-muted/70 leading-relaxed">
          AI suggests: {assumption.suggestedExperiment}
          {assumption.suggestedExperimentDuration && ` (${assumption.suggestedExperimentDuration})`}
        </p>
      )}

      {/* Confidence bar */}
      {assumption.confidenceScore > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${assumption.confidenceScore}%`,
                backgroundColor: riskColor,
              }}
            />
          </div>
          <span className="text-[10px] text-foreground-muted">{assumption.confidenceScore}%</span>
        </div>
      )}

      {/* Action */}
      {assumption.status === 'untested' && onDesignTest && (
        <button onClick={onDesignTest} className="w-full ui-btn ui-btn-xs ui-btn-secondary text-[10px]">
          Design Test
        </button>
      )}
      {assumption.status === 'testing' && onUpdateProgress && (
        <button onClick={onUpdateProgress} className="w-full ui-btn ui-btn-xs ui-btn-secondary text-[10px]">
          Update Progress
        </button>
      )}
      {(assumption.status === 'validated' || assumption.status === 'refuted') && onViewEvidence && (
        <button onClick={onViewEvidence} className="w-full ui-btn ui-btn-xs ui-btn-ghost text-[10px]">
          View Evidence
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/canvas/AssumptionCard.tsx
git commit -m "ui: create AssumptionCard component with risk indicators"
```

---

### Task 10: Rewrite AssumptionsView as Kanban Board

**Files:**
- Modify: `app/components/canvas/AssumptionsView.tsx`

This is a full rewrite. The new component:
1. Fetches assumptions from the new CRUD API (not the analyze/extract endpoint)
2. Groups into 6 kanban columns: High/Med/Low Risk Untested, Testing, Validated, Refuted
3. Keeps the "Extract Assumptions" button for AI extraction (existing behavior)
4. Adds "+ New Assumption" button for manual creation
5. Uses `AssumptionCard` for each card

**Step 1: Rewrite the component**

Replace the entire contents of `app/components/canvas/AssumptionsView.tsx`. The component should:

- Accept `canvasId: string` as prop (remove `initialAssumptions` — fetch from API instead)
- Use `useState` + `useEffect` to load assumptions from `GET /api/canvas/${canvasId}/assumptions`
- Group assumptions by: `{ highRiskUntested, medRiskUntested, lowRiskUntested, testing, validated, refuted }`
- Render 6 scrollable columns in a horizontal flex container
- Keep the "Extract Assumptions" flow (the existing streaming SSE call to `/api/canvas/${canvasId}/assumptions/analyze`)
- Add state for `showCreateModal` and `showExperimentModal`
- Export the component (no longer export `AssumptionItem` — use `Assumption` from types)

**Key implementation notes:**
- The column layout uses `flex gap-4 overflow-x-auto` with `w-64 shrink-0` columns
- Each column header shows count and risk color indicator
- Import `AssumptionCard` from `./AssumptionCard`
- The "Extract Assumptions" button triggers the existing SSE flow but now also refreshes the kanban after completion
- Group logic:
  - `highRiskUntested`: `status === 'untested' && riskLevel === 'high'`
  - `medRiskUntested`: `status === 'untested' && riskLevel === 'medium'`
  - `lowRiskUntested`: `status === 'untested' && riskLevel === 'low'`
  - `testing`: `status === 'testing'`
  - `validated`: `status === 'validated'`
  - `refuted`: `status === 'refuted'`

**Step 2: Update CanvasClient import**

In `app/canvas/[slug]/CanvasClient.tsx`, update the import to remove `AssumptionItem`:

```typescript
// Old:
import { AssumptionsView, type AssumptionItem } from "@/app/components/canvas/AssumptionsView";

// New:
import { AssumptionsView } from "@/app/components/canvas/AssumptionsView";
```

Also update the `AssumptionsView` usage — remove `initialAssumptions` prop:

```tsx
{activeTab === "assumptions" && (
  <AssumptionsView canvasId={canvasId} />
)}
```

Remove `initialAssumptions` from `CanvasClientProps` and the server-side data loading if present.

**Step 3: Verify**

Run: `npm run dev`
Navigate to canvas → Assumptions tab → verify kanban columns render (empty initially).

**Step 4: Commit**

```bash
git add app/components/canvas/AssumptionsView.tsx app/canvas/\[slug\]/CanvasClient.tsx
git commit -m "ui: rewrite AssumptionsView as risk-first kanban board"
```

---

### Task 11: Create Manual Assumption Modal

**Files:**
- Create: `app/components/canvas/ManualAssumptionModal.tsx`

**Step 1: Implement modal**

The modal should have:
- Text input for statement
- Radio buttons for riskLevel (high/medium/low) with color-coded labels
- Category dropdown (market/product/ops/legal)
- Checkboxes for related blocks (all 9 block types from `BLOCK_DEFINITIONS`)
- Submit → `POST /api/canvas/${canvasId}/assumptions` → calls `onCreated` callback
- Cancel button
- Uses Radix Dialog or a simple `fixed inset-0` overlay

**Step 2: Wire into AssumptionsView**

Add `ManualAssumptionModal` to `AssumptionsView`:
- State: `const [showCreateModal, setShowCreateModal] = useState(false)`
- Button: "+ New Assumption" → `setShowCreateModal(true)`
- On created: close modal, refresh assumption list

**Step 3: Commit**

```bash
git add app/components/canvas/ManualAssumptionModal.tsx app/components/canvas/AssumptionsView.tsx
git commit -m "ui: add manual assumption creation modal"
```

---

### Task 12: Create Experiment Design Modal

**Files:**
- Create: `app/components/canvas/ExperimentDesignModal.tsx`

**Step 1: Implement modal**

Props: `{ assumption: Assumption; canvasId: string; isOpen: boolean; onClose: () => void; onCreated: () => void }`

The modal should:
- Show the assumption statement being tested
- Pre-fill with AI suggestion if `assumption.suggestedExperiment` exists
- Form fields: type (dropdown), description (textarea), success criteria (textarea), cost estimate, duration estimate
- Optional: "Ask AI" button that calls `suggestExperiment` tool via a new API endpoint
- Submit → `POST /api/canvas/${canvasId}/assumptions/${assumption.$id}/experiments`
- On created: close modal, refresh

**Step 2: Wire into AssumptionCard**

In `AssumptionsView`, pass `onDesignTest` callback to `AssumptionCard` that opens the modal with the selected assumption.

**Step 3: Commit**

```bash
git add app/components/canvas/ExperimentDesignModal.tsx app/components/canvas/AssumptionsView.tsx
git commit -m "ui: add experiment design modal with AI suggestions"
```

---

### Task 13: Create Evidence Collection Modal

**Files:**
- Create: `app/components/canvas/EvidenceCollectionModal.tsx`

**Step 1: Implement modal**

Props: `{ assumption: Assumption; experiment: Experiment; canvasId: string; isOpen: boolean; onClose: () => void; onUpdated: () => void }`

The modal should:
- Show experiment description and success criteria
- Evidence textarea (what was observed)
- Result radio: supports / contradicts / mixed / inconclusive
- Source URL input
- Status: planned → running → completed
- "Mark Complete" button → `PATCH /api/canvas/${canvasId}/assumptions/${assumptionId}/experiments/${id}` with `{ status: 'completed', result, evidence }`
- Backend auto-updates assumption status and confidence

**Step 2: Wire into AssumptionCard**

Pass `onUpdateProgress` callback that fetches the assumption's experiments and opens the modal for the active experiment.

**Step 3: Commit**

```bash
git add app/components/canvas/EvidenceCollectionModal.tsx app/components/canvas/AssumptionsView.tsx
git commit -m "ui: add evidence collection modal with auto status updates"
```

---

## Phase 5: Risk Heatmap

### Task 14: Add Risk Overlay to BlockCell

**Files:**
- Modify: `app/components/canvas/BlockCell.tsx`

**Step 1: Accept risk metrics as prop**

Add to `BlockCellProps`:

```typescript
riskMetrics?: RiskMetrics;
```

**Step 2: Apply risk-based border class**

Import `getRiskBorderClass` from `@/lib/utils/risk`. Apply the class to the block cell's outer container based on `riskMetrics.riskScore` and `riskMetrics.confidenceScore`.

**Step 3: Show confidence badge**

If `riskMetrics` exists and has assumptions, show a small badge in the corner:
- Risk score indicator (red/amber/green dot)
- Confidence percentage

**Step 4: Commit**

```bash
git add app/components/canvas/BlockCell.tsx
git commit -m "ui: add risk-based border glow and confidence badge to BlockCell"
```

---

### Task 15: Fetch Risk Heatmap in CanvasClient

**Files:**
- Modify: `app/canvas/[slug]/CanvasClient.tsx`

**Step 1: Add state and fetch**

```typescript
const [riskHeatmap, setRiskHeatmap] = useState<Record<BlockType, RiskMetrics> | null>(null);

useEffect(() => {
  fetch(`/api/canvas/${canvasId}/risk-heatmap`)
    .then(res => res.json())
    .then(data => setRiskHeatmap(data))
    .catch(err => console.error('Risk heatmap fetch error:', err));
}, [canvasId]);
```

**Step 2: Pass risk metrics to BlockCell**

When rendering `BMCGrid` / `BlockCell` components, pass the relevant `riskHeatmap[blockType]` as `riskMetrics` prop.

**Step 3: Commit**

```bash
git add app/canvas/\[slug\]/CanvasClient.tsx
git commit -m "feat: fetch and pass risk heatmap data to canvas blocks"
```

---

## Phase 6: Block Focus Panel & Analysis Tab Integration

### Task 16: Add Risk Section to Block Focus Panel

**Files:**
- Modify: `app/components/canvas/BlockFocusPanel.tsx`

**Step 1: Add assumptions filtered by current block**

Accept `assumptions: Assumption[]` as prop. Filter to show only assumptions where `blockTypes.includes(currentBlockType)`. Sort by riskLevel (high first), then status (untested first).

**Step 2: Render risk section above content**

Show a collapsible "Risk Analysis" section at the top of the focus panel:
- Overall risk indicator for this block
- List of linked assumptions with risk colors
- Quick "Design Test" buttons

**Step 3: Commit**

```bash
git add app/components/canvas/BlockFocusPanel.tsx
git commit -m "ui: add risk analysis section to block focus panel"
```

---

### Task 17: Add Risk Overview to Analysis Tab

**Files:**
- Modify: `app/components/canvas/AnalysisView.tsx`

**Step 1: Add risk overview section**

At the top of the Analysis tab, above the existing consistency checker:
- Canvas-wide risk summary (overall risk score, average confidence)
- Top 5 assumptions to test (sorted by risk, untested only)
- Critical blocks list (blocks with highest risk scores)

**Step 2: Fetch assumptions in AnalysisView**

Load assumptions from `GET /api/canvas/${canvasId}/assumptions` and risk heatmap from `GET /api/canvas/${canvasId}/risk-heatmap`.

**Step 3: Commit**

```bash
git add app/components/canvas/AnalysisView.tsx
git commit -m "ui: add risk overview section to analysis tab"
```

---

## Phase 7: Enhanced Block Analysis Integration

### Task 18: Auto-Create Assumptions from Block Analysis

**Files:**
- Modify: `app/api/canvas/[canvasId]/blocks/[blockType]/analyze/route.ts`

**Step 1: Add identifyAssumptions to the tool call**

When the block analyze endpoint calls the AI, include `identifyAssumptions` in the available tools alongside `analyzeBlock`. The AI can then return both block analysis AND structured assumptions in one call.

**Step 2: Persist assumptions**

After getting `identifyAssumptions` results from the tool call:
- For each assumption: create a row in the assumptions table via `serverTablesDB.createRow()`
- Set `source: 'ai'`, `status: 'untested'`, `confidenceScore: 0`
- Link to the current block via the M:M relationship

**Step 3: Optionally call suggestExperiment**

For each high-risk assumption, make a second AI call to populate `suggestedExperiment` and `suggestedExperimentDuration`.

**Step 4: Commit**

```bash
git add app/api/canvas/\[canvasId\]/blocks/\[blockType\]/analyze/route.ts
git commit -m "feat(ai): auto-create assumptions with risk levels from block analysis"
```

---

### Task 19: Enhance Consistency Checker with Risk Context

**Files:**
- Modify: `lib/ai/prompts.ts`

**Step 1: Include assumption data in canvas context**

Update `buildCanvasContext` (or the equivalent function that serializes canvas state for AI) to include tracked assumptions when available:

```
## Tracked Assumptions:
[UNTESTED | HIGH RISK] Users will pay $50/mo (affects: value_prop, revenue_streams) - Confidence: 0%
[VALIDATED | MEDIUM RISK] Cafes waste 2hrs/day on admin (affects: customer_segments) - Confidence: 85%
```

**Step 2: Update consistency checker prompt**

Add instructions for the AI to:
- Flag contradictions between assumptions and block content
- Identify refuted assumptions still reflected in blocks
- Recommend which untested high-risk assumptions to validate first

**Step 3: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat(ai): include assumption context in consistency checker"
```

---

## Phase 8: Polish & Cleanup

### Task 20: Update Server-Side Data Loading

**Files:**
- Modify: `app/canvas/[slug]/page.tsx`

**Step 1: Remove server-side assumption loading**

Since AssumptionsView now fetches from the API client-side, remove the `initialAssumptions` prop from the server component if it was being passed.

**Step 2: Commit**

```bash
git add app/canvas/\[slug\]/page.tsx
git commit -m "refactor: remove server-side assumption loading (now client-side)"
```

---

### Task 21: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update "Current State" section**

Add:

```markdown
- ✅ Risk Engine (Assumption → Experiment → Evidence)
  - Risk-first kanban board (6 columns by risk level and status)
  - Manual and AI-powered assumption creation
  - Experiment design with AI suggestions
  - Evidence collection with auto-status updates
  - Canvas risk heatmap (risk-based block borders)
  - Block Focus Panel risk analysis section
  - Analysis tab risk overview
```

**Step 2: Add Gotcha for experiments table**

```markdown
- **Experiments table**: Must be created manually in Appwrite console (see docs/plans/2026-02-16-risk-engine-implementation.md Task 1)
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Risk Engine in CLAUDE.md"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Schema & Types | 1-3 | Appwrite schema, TypeScript types, table constants |
| 2: API Routes | 4-7 | Full CRUD for assumptions + experiments, risk heatmap endpoint |
| 3: AI Tools | 8 | identifyAssumptions, suggestExperiment, calculateConfidence |
| 4: UI Kanban | 9-13 | AssumptionCard, kanban board, 3 modals (create, experiment, evidence) |
| 5: Risk Heatmap | 14-15 | Risk borders on blocks, confidence badges |
| 6: Panel Integration | 16-17 | Block focus panel risk section, analysis tab risk overview |
| 7: AI Integration | 18-19 | Auto-create assumptions from analysis, enhanced consistency checker |
| 8: Polish | 20-21 | Cleanup, documentation |

**Total: 21 tasks across 8 phases.**
