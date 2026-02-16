# Assumptions Layer Design: Risk Engine

**Date:** 2026-02-16
**Goal:** Transform RocketMap from static canvas into a validation tool by implementing an Assumption → Experiment → Evidence workflow that identifies risky assumptions and guides founders through validation.

## Core Philosophy

> "Founders don't fail from bad canvases. They fail from untested assumptions."

RocketMap should be a **judgment amplifier for assumption validation**, not just a canvas builder.

## What This Changes

### From Static Canvas → Validation Tool

**Before:**
- User fills 9 blocks with content
- AI suggests improvements
- Consistency checker finds contradictions
- **Result:** A nice-looking business model canvas

**After:**
- User fills blocks → AI **automatically identifies risky assumptions**
- Each assumption shows **cheapest experiment to validate**
- Canvas displays **risk heatmap** showing fragile blocks
- User runs experiments → collects evidence → **confidence scores update**
- Refuted assumptions **trigger warnings** to update block content
- **Result:** A battle-tested, validated business model

---

## Architecture Overview

### Core Workflow: Assumption → Experiment → Evidence

Every assumption flows through 5 stages:

1. **Identified** - AI spots hidden assumption or user creates it
2. **Risk Assessed** - High/Medium/Low risk level (how bad if wrong?)
3. **Experiment Designed** - AI suggests cheapest validation test
4. **Evidence Collected** - Run experiment, record results
5. **Confidence Scored** - 0-100 based on evidence quality

### Data Model

**Three new entities:**

1. **Assumption** - A belief that must be validated
   - Statement (e.g., "Users will pay $50/mo")
   - Risk level (high/medium/low)
   - Status (untested/testing/validated/refuted/inconclusive)
   - Confidence score (0-100)
   - Linked blocks (M:M - one assumption can affect multiple blocks)
   - Linked segments (optional filtering)
   - Source (ai/user)

2. **Experiment** - A test designed to validate an assumption
   - Type (survey/interview/mvp/ab_test/research)
   - Description, success criteria
   - Status (planned/running/completed)
   - Result (supports/contradicts/mixed/inconclusive)
   - Cost/duration estimates

3. **Risk Heatmap** - Canvas visualization showing block fragility
   - Risk score per block (0-100)
   - Confidence score per block (0-100)
   - Top 3 risky assumptions per block
   - Visual indicators (red/amber/green borders)

---

## Data Schema

### Appwrite Collections

**`assumptions` table:**
```
$id               : string (auto)
canvas            : relationship (canvases.$id, cascade)
statement         : string (max 500, required)
status            : enum ['untested','testing','validated','refuted','inconclusive']
riskLevel         : enum ['high','medium','low']
confidenceScore   : number (0-100, default 0)
source            : enum ['ai','user']
blockTypes        : string (JSON array, e.g. '["value_prop","revenue_streams"]')
segmentIds        : string (JSON array)
linkedValidationItemIds : string (JSON array - links to deep-dive ValidationItems)
suggestedExperiment : string (nullable - AI-generated test suggestion)
suggestedExperimentDuration : string (nullable - e.g. "5 min", "1 week")
createdAt         : datetime
updatedAt         : datetime
lastTestedAt      : datetime (nullable)
```

**Indexes:**
- `canvas` (required)
- `status`
- `riskLevel`

**`experiments` table:**
```
$id               : string (auto)
assumption        : relationship (assumptions.$id, cascade)
type              : enum ['survey','interview','mvp','ab_test','research','other']
description       : string (longtext, required)
successCriteria   : string (required)
status            : enum ['planned','running','completed']
result            : enum ['supports','contradicts','mixed','inconclusive'] (nullable)
evidence          : string (longtext)
sourceUrl         : string (nullable)
costEstimate      : string (nullable - e.g. "$0", "$50", "$500")
durationEstimate  : string (nullable - e.g. "5 min", "1 week", "1 month")
createdAt         : datetime
completedAt       : datetime (nullable)
```

**Index:**
- `assumption` (required)

### TypeScript Types

**lib/types/canvas.ts additions:**

```typescript
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

export type CanvasTab = "canvas" | "analysis" | "assumptions" | "notes" | "debug";
```

### Key Design Decisions

1. **blockTypes as JSON array** - M:M relationship without junction table (simpler, matches segments pattern)
2. **Risk levels map to priority** - high risk = high priority to test
3. **Confidence from evidence** - Calculated by AI based on experiment quality
4. **Auto-status updates** - Experiment results automatically update assumption status
5. **Canvas-scoped** - All assumptions belong to one canvas

---

## AI Integration

### Auto-Creation from Block Analysis

**Flow:**
1. User clicks "Analyze with AI" on block
2. API calls enhanced `identifyAssumptions` tool (replaces `analyzeBlock.assumptions[]`)
3. AI returns assumptions with risk levels and affected blocks
4. For each assumption:
   - Check for duplicates (fuzzy match ~70% similarity)
   - If new: Create Assumption record with status='untested', confidenceScore=0
   - Call `suggestExperiment` to populate experiment suggestions
5. Store original AI analysis in block.aiAnalysis (backward compatible)
6. Update block risk score and refresh canvas heatmap

### Deduplication Strategy

**Problem:** Re-analyzing a block generates duplicate assumptions.

**Solution:** Before creating, fuzzy match on `statement`:
- If 70%+ similar assumption exists: skip creation (or update updatedAt)
- If new: create record

**Alternative (simpler for MVP):** Allow duplicates, user merges via UI

### New AI Tools

**lib/ai/tools.ts additions:**

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

**Enhanced `checkConsistency` tool:**

Add to existing output:
```typescript
{
  // Existing fields
  contradictions: [...],
  missingLinks: [...],
  overallScore: number,

  // NEW: Risk analysis
  riskHeatmap: Record<BlockType, RiskMetrics>,

  // NEW: Prioritization
  topPriorities: Array<{
    assumption: string,
    riskLevel: string,
    affectedBlocks: string[],
    reason: string,
    suggestedExperiment: string
  }>,

  // NEW: Evidence quality warnings
  weakEvidence: Array<{
    assumption: string,
    issue: string,
    suggestion: string
  }>
}
```

### Consistency Checker Integration

**Updated canvas context sent to AI:**

```typescript
// lib/ai/prompts.ts
export function buildCanvasContext(
  blocks: BlockData[],
  assumptions?: Assumption[],
  experiments?: Experiment[]
) {
  let context = blocks.map(b => `[${b.blockType}]: ${getBlockValue(b.content, b.blockType, 'bmc')}`).join('\n\n');

  if (assumptions && assumptions.length > 0) {
    const assumptionContext = assumptions.map(a => {
      const experimentCount = experiments?.filter(e => e.assumptionId === a.$id).length ?? 0;
      return `[${a.status.toUpperCase()} | ${a.riskLevel.toUpperCase()} RISK] ${a.statement} (affects: ${a.blockTypes.join(', ')}) - Confidence: ${a.confidenceScore}% - Experiments: ${experimentCount}`;
    }).join('\n');

    context += `\n\n## Tracked Assumptions:\n${assumptionContext}`;
  }

  return context;
}
```

Consistency checker can now:
- Flag contradictions between assumptions and block content
- Identify refuted assumptions still reflected in blocks
- Suggest validation tests for untested high-risk assumptions
- Calculate cross-block risk scores
- Recommend which assumptions to test first

---

## UI/UX Design

### Canvas Risk Heatmap (Primary View)

**Visual overlay on 9-block canvas:**

```
┌────────────────────────────────────────────────────────┐
│  Key Partnerships    Key Activities    Value Props     │
│  🟢 Safe (3 assum.)  ⚠️  Risk (5 unt.) 🔴 Critical (8)│
│  Confidence: 85%     Confidence: 40%    Confidence: 15%│
│                                                         │
│  Customer Rel.              Channels                    │
│  🟡 Moderate (2)           🟢 Safe (4)                  │
│  Confidence: 70%           Confidence: 90%              │
│                                                         │
│  Customer Segments   Cost Structure   Revenue Streams  │
│  🔴 Critical (12)    🟡 Moderate (3)  🔴 Critical (10) │
│  Confidence: 20%     Confidence: 65%  Confidence: 25%  │
└────────────────────────────────────────────────────────┘
```

**Block Border Styling:**
- 🔴 **Critical Risk** (riskScore ≥70): `.glow-critical` (hot pink-red pulse)
- ⚠️ **Risk** (riskScore ≥40): `.glow-warning` (amber-gold shimmer)
- 🟡 **Moderate**: Neutral border
- 🟢 **Safe** (confidenceScore ≥70): `.glow-healthy` (green-blue subtle)

**Risk Score Calculation:**
```typescript
function calculateBlockRisk(block: BlockData, assumptions: Assumption[]): number {
  const linked = assumptions.filter(a => a.blockTypes.includes(block.blockType));

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
```

**Confidence Score:**
```typescript
function calculateBlockConfidence(block: BlockData, assumptions: Assumption[]): number {
  const linked = assumptions.filter(a => a.blockTypes.includes(block.blockType));
  if (linked.length === 0) return 0; // No assumptions = no validation

  return Math.round(linked.reduce((sum, a) => sum + a.confidenceScore, 0) / linked.length);
}
```

**Hover Tooltip:**
```
┌─────────────────────────┐
│ Value Propositions      │
│ Risk: CRITICAL          │
│ Confidence: 15%         │
│                         │
│ Untested assumptions:   │
│ • Users will pay $50/mo │
│ • Feature X is valuable │
│ • Competitors lack this │
│                         │
│ [View Assumptions]      │
└─────────────────────────┘
```

### Global Assumptions Tab - Risk-First Kanban

**New tab in CanvasTabs: "Assumptions"**

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Risk Engine                    [+ New Assumption] [🔥 Risk Heatmap] [Filter]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  🔴 HIGH RISK        ⚠️ MEDIUM RISK      🟢 LOW RISK        ✅ VALIDATED    │
│  UNTESTED (15)       UNTESTED (8)        UNTESTED (6)       (12)            │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│ │🔴 CRITICAL  │    │🟡 MEDIUM    │    │🟢 LOW       │    │🟢 VALIDATED │  │
│ │Users will   │    │Cafes want   │    │Brand recog. │    │Baristas     │  │
│ │pay $50/mo   │    │mobile-first │    │matters      │    │waste 2hrs/  │  │
│ │             │    │             │    │             │    │day on admin │  │
│ │📊 Revenue $  │    │📱 Channels  │    │🎨 Value Prop│    │👥 Cust Seg  │  │
│ │💰 Value Prop│    │             │    │             │    │             │  │
│ │             │    │🔬 No exper. │    │🔬 No exper. │    │✓ Confidence │  │
│ │🔬 AI suggests│   │   designed  │    │   designed  │    │   95%       │  │
│ │   Pricing   │    │             │    │             │    │             │  │
│ │   survey    │    │🎯 [Design   │    │🎯 [Design   │    │📊 3 experi- │  │
│ │             │    │   Test]     │    │   Test]     │    │   ments run │  │
│ │🎯 [Run Test]│    └─────────────┘    └─────────────┘    │             │  │
│ │   (5 min)   │                                           │🔬 Customer  │  │
│ └─────────────┘                                           │   interviews│  │
│                                                            │   (12 ppl)  │  │
│  [+ Add]                                                  │📈 [View]    │  │
│                                                            └─────────────┘  │
│  🔄 TESTING (4)                         ❌ REFUTED (3)                       │
│ ┌─────────────┐                        ┌─────────────┐                      │
│ │🟡 TESTING   │                        │🔴 REFUTED   │                      │
│ │Cafe owners  │                        │Mobile-first │                      │
│ │decide in    │                        │is preferred │                      │
│ │1 week       │                        │             │                      │
│ │             │                        │📱 Channels  │                      │
│ │👥 Cust Rel   │                       │             │                      │
│ │             │                        │❌ Confidence│                      │
│ │🔬 Interview │                        │   10%       │                      │
│ │   in prog.  │                        │             │                      │
│ │   (3/10)    │                        │🔬 A/B test  │                      │
│ │             │                        │   showed    │                      │
│ │📈 [Update]  │                        │   desktop   │                      │
│ │             │                        │   wins 8:2  │                      │
│ └─────────────┘                        │             │                      │
│                                        │⚠️  UPDATE   │                      │
│                                        │   CHANNELS  │                      │
│  [+ Add]                               │   BLOCK!    │                      │
│                                        └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Kanban Columns:**
1. **🔴 HIGH RISK UNTESTED** - Critical assumptions, business fails if wrong
2. **⚠️ MEDIUM RISK UNTESTED** - Important assumptions, delays/pivots if wrong
3. **🟢 LOW RISK UNTESTED** - Minor assumptions, small adjustments if wrong
4. **🔄 TESTING** - Experiments in progress
5. **✅ VALIDATED** - Experiments support assumption (high confidence)
6. **❌ REFUTED** - Experiments contradict assumption (needs block update)

**Card Design:**
```
┌─────────────────────────┐
│ 🔴 Risk Indicator       │  ← Red/Yellow/Green dot
│ Statement (truncated)   │
│                         │
│ 📊 Linked Blocks (pills)│  ← Which blocks depend on this
│                         │
│ 🔬 Experiment Status    │  ← "AI suggests: ..." or "Testing 3/10" or "✓ Validated"
│                         │
│ 📈 Confidence: 0%       │  ← Only if evidence exists
│                         │
│ 🎯 [Action Button]      │  ← Context-specific: [Run Test] [Update] [View]
└─────────────────────────┘
```

**Drag-and-Drop Behavior:**
- Drag to **TESTING**: Prompts to design experiment
- Drag to **VALIDATED/REFUTED**: Requires ≥1 experiment recorded
- Auto-updates status and timestamps

**Filters:**
- Priority (High/Medium/Low)
- Source (AI/Manual)
- Block type
- Segment

**Sort:**
- Priority (default)
- Recently added
- Block type

### Block Focus Panel - Risk-First

**Risk section appears FIRST (above content):**

```
┌─────────────────────────────────────────┐
│ ⚠️ RISK ANALYSIS                        │
│  Overall Risk: HIGH                     │
│  Confidence: 25%                        │
│  Critical Assumptions: 3 untested       │
│                                         │
│  🔴 Users will pay $50/mo              │
│     Risk: CRITICAL (affects revenue)    │
│     🔬 Suggested: Pricing survey (5min) │
│     🎯 [Run Test]                       │
│                                         │
│  🔴 Market is $500M TAM                │
│     Risk: CRITICAL (affects viability)  │
│     🔬 Suggested: TAM calc (30min)     │
│     🎯 [Run Test]                       │
│                                         │
│  🟡 Owners decide in 1 week            │
│     Risk: MEDIUM (affects sales cycle)  │
│     🔬 Testing: Interviews (3/10)      │
│     📈 [Update Progress]                │
│                                         │
│  [+ Add Assumption]                     │
├─────────────────────────────────────────┤
│ CONTENT                     [Collapse]  │
│ [Block editor...]                       │
├─────────────────────────────────────────┤
│ COPILOT PERSPECTIVE                     │
│ [Chat interface...]                     │
└─────────────────────────────────────────┘
```

**Shows assumptions where blockTypes includes current block, sorted by risk.**

### Analysis Tab - Risk Overview

**Add "Risk Overview" section at top:**

```
┌─────────────────────────────────────────┐
│ ANALYSIS                                │
├─────────────────────────────────────────┤
│ 🔥 RISK OVERVIEW                        │
│                                         │
│ Overall Canvas Risk: HIGH ⚠️            │
│ Average Confidence: 42%                 │
│                                         │
│ Critical Blocks (fix first):            │
│ 🔴 Value Propositions (Risk: 85)       │
│    → 8 untested high-risk assumptions  │
│ 🔴 Revenue Streams (Risk: 78)          │
│    → 10 untested assumptions           │
│ 🔴 Customer Segments (Risk: 71)        │
│    → 12 untested assumptions           │
│                                         │
│ Top 5 Assumptions to Test:              │
│ 1. Users will pay $50/mo                │
│    → Pricing survey (5 min, $0)         │
│    [Run Test]                           │
│ 2. Market is $500M TAM                  │
│    → TAM calculation (30 min, $0)       │
│    [Run Test]                           │
│ 3. Cafes want mobile app                │
│    → User interviews (1 week, $50)      │
│    [Run Test]                           │
│                                         │
│ [View All Assumptions →]                │
├─────────────────────────────────────────┤
│ CROSS-BLOCK CONSISTENCY                 │
│ [Existing consistency checker output]   │
└─────────────────────────────────────────┘
```

**Clicking block name navigates to that block in focus panel.**

### Modals

**Experiment Design Modal:**
```
┌──────────────────────────────────────────┐
│ Design Experiment                         │
├──────────────────────────────────────────┤
│ Testing: "Users will pay $50/mo"         │
│                                          │
│ 💡 AI Suggestion:                        │
│ Run pricing survey with target customers │
│ Cost: $0  Duration: 5 min                │
│                                          │
│ Type: [Survey ▾]                         │
│                                          │
│ Description:                             │
│ [Ask 20 cafe owners: "Would you pay     │
│  $50/mo for automated inventory mgmt?"] │
│                                          │
│ Success Criteria:                        │
│ [>70% say "yes" or "maybe"]             │
│                                          │
│ Cost: [$0          ▾] (Free/Low/Med/High)│
│ Duration: [5 minutes  ▾]                 │
│                                          │
│         [Cancel]  [Start Experiment]     │
└──────────────────────────────────────────┘
```

**Evidence Collection Modal:**
```
┌──────────────────────────────────────────┐
│ Record Evidence                           │
├──────────────────────────────────────────┤
│ Experiment: Pricing survey                │
│ Started: 2026-02-16                       │
│                                          │
│ Status: [○ Planned  ● Running            │
│          ○ Completed]                    │
│                                          │
│ Progress: [████████░░] 16/20 responses   │
│                                          │
│ Evidence collected so far:                │
│ [12 said "yes", 4 said "maybe",          │
│  2 said "too expensive", 2 pending...]   │
│                                          │
│ Result: [○ Supports  ○ Contradicts       │
│          ● Mixed     ○ Inconclusive]     │
│                                          │
│ Source/Link:                             │
│ [https://forms.google.com/...         ]  │
│                                          │
│ [Save Progress]  [Mark Complete]         │
└──────────────────────────────────────────┘
```

**Manual Assumption Creation Modal:**
```
┌──────────────────────────────────────────┐
│ Create Assumption                         │
├──────────────────────────────────────────┤
│ Statement:                                │
│ [Coffee shop owners prefer desktop...  ] │
│                                          │
│ Risk Level:                              │
│ [○ 🔴 High - Business fails if wrong    │
│  ● 🟡 Medium - Delays or pivots needed  │
│  ○ 🟢 Low - Minor adjustment needed]    │
│                                          │
│ Related Blocks: (select multiple)        │
│ [☑ Channels  ☑ Customer Relationships   │
│  ☐ Value Propositions  ☐ Key Activities]│
│                                          │
│ Related Segments: (optional)             │
│ [☑ Specialty cafes  ☐ Chain restaurants]│
│                                          │
│ 💡 AI can suggest an experiment after    │
│    you create this assumption            │
│                                          │
│         [Cancel]  [Create & Get Test]    │
└──────────────────────────────────────────┘
```

---

## Workflows

### Workflow 1: Auto-Create Assumptions from AI Analysis

**Trigger:** User clicks "Analyze with AI" on block

**Steps:**
1. API calls `identifyAssumptions` tool
2. AI returns assumptions with risk levels and affected blocks
3. For each assumption:
   - Fuzzy match on statement (70% similarity threshold)
   - If duplicate exists: skip (or update updatedAt)
   - If new: Create Assumption record (status='untested', confidenceScore=0)
4. Call `suggestExperiment` for each new assumption
5. Store original AI analysis in block.aiAnalysis (backward compatible)
6. Calculate block risk score
7. Refresh canvas risk heatmap

**API endpoint:** `POST /api/canvas/[canvasId]/blocks/[blockType]/analyze`

### Workflow 2: Design Experiment

**Trigger:** User clicks [Design Test] or [Run Test] on assumption card

**Steps:**
1. Open Experiment Design Modal pre-filled with AI suggestion
2. User can edit or accept suggestion
3. On [Start Experiment]:
   - Create Experiment record (status='planned')
   - Optionally set status='running' if starting immediately
   - Update assumption card UI

**API endpoint:** `POST /api/canvas/[canvasId]/assumptions/[id]/experiments`

### Workflow 3: Collect Evidence

**Trigger:** User clicks [Update Progress] or [Mark Complete] on assumption card

**Steps:**
1. Open Evidence Collection Modal
2. User updates progress, evidence, result
3. On [Save Progress]: Update Experiment record
4. On [Mark Complete]:
   - Set Experiment.status = 'completed'
   - Call `calculateConfidence` AI tool with evidence
   - Update Assumption.confidenceScore
   - Auto-update Assumption.status based on result:
     - "supports" → `validated`
     - "contradicts" → `refuted`
     - "mixed" → `inconclusive`
   - Set Assumption.lastTestedAt = now
   - Recalculate block risk scores
   - Refresh canvas heatmap

**API endpoints:**
- `PATCH /api/canvas/[canvasId]/assumptions/[id]/experiments/[expId]`
- Auto-triggers risk recalculation

### Workflow 4: Manual Assumption Creation

**Trigger:** User clicks [+ New Assumption] in global tab or block panel

**Steps:**
1. Open Manual Assumption Creation Modal
2. User fills statement, risk level, related blocks/segments
3. On [Create & Get Test]:
   - Create Assumption record (source='user', confidenceScore=0)
   - Call `suggestExperiment` AI tool
   - Show experiment suggestion in modal
   - Option to immediately design experiment

**API endpoint:** `POST /api/canvas/[canvasId]/assumptions`

### Workflow 5: Refuted Assumption → Block Update

**Trigger:** Experiment result='contradicts', assumption status → 'refuted'

**Steps:**
1. System shows warning banner on related blocks:
   ```
   ⚠️ ACTION REQUIRED
   Assumption "Mobile-first preferred" was REFUTED by A/B testing.
   Suggested fix: Update channels to prioritize desktop experience
   [Review Evidence]  [Update Content]
   ```
2. Canvas shows 🔴 critical risk on affected blocks
3. Block Focus Panel highlights refuted assumption at top
4. User reviews evidence and updates block content
5. User can mark assumption as "addressed" (archive it)

**No API call needed - visual indicators based on assumption status**

---

## API Routes

### Assumptions

**`GET /api/canvas/[canvasId]/assumptions`**
- Query params: status, riskLevel, source, blockType
- Returns: Assumption[]

**`POST /api/canvas/[canvasId]/assumptions`**
- Body: { statement, riskLevel, blockTypes, segmentIds }
- Returns: Assumption (auto-calls suggestExperiment)

**`GET /api/canvas/[canvasId]/assumptions/[id]`**
- Returns: Assumption with experiments[]

**`PATCH /api/canvas/[canvasId]/assumptions/[id]`**
- Body: Partial<Assumption>
- Returns: Assumption

**`DELETE /api/canvas/[canvasId]/assumptions/[id]`**
- Cascade deletes experiments
- Returns: success

### Experiments

**`GET /api/canvas/[canvasId]/assumptions/[id]/experiments`**
- Returns: Experiment[]

**`POST /api/canvas/[canvasId]/assumptions/[id]/experiments`**
- Body: { type, description, successCriteria, costEstimate, durationEstimate }
- Returns: Experiment

**`PATCH /api/canvas/[canvasId]/assumptions/[assumptionId]/experiments/[id]`**
- Body: Partial<Experiment>
- If status changed to 'completed': auto-triggers confidence calculation
- Returns: Experiment

**`DELETE /api/canvas/[canvasId]/assumptions/[assumptionId]/experiments/[id]`**
- Returns: success

### Risk Analysis

**`GET /api/canvas/[canvasId]/risk-heatmap`**
- Returns: Record<BlockType, RiskMetrics>
- Calculated on-demand from assumptions

**`POST /api/canvas/[canvasId]/blocks/[blockType]/analyze`** (Enhanced)
- Existing: Returns AI analysis
- NEW: Auto-creates assumption records
- NEW: Auto-calls suggestExperiment for each
- Returns: { analysis, assumptions: Assumption[] }

---

## Frontend Components

### New Components

1. **`app/components/canvas/RiskHeatmapOverlay.tsx`**
   - Renders risk borders on canvas blocks
   - Shows confidence scores
   - Handles hover tooltips

2. **`app/components/canvas/AssumptionsView.tsx`**
   - Risk-first kanban board (replaces placeholder from plan)
   - 6 columns: High/Med/Low Risk Untested, Testing, Validated, Refuted
   - Drag-and-drop status updates

3. **`app/components/canvas/AssumptionCard.tsx`**
   - Kanban card showing assumption details
   - Risk indicator, blocks, experiment status, confidence
   - Context-specific action buttons

4. **`app/components/canvas/ExperimentDesignModal.tsx`**
   - Form for designing experiments
   - Pre-filled with AI suggestions
   - Cost/duration estimates

5. **`app/components/canvas/EvidenceCollectionModal.tsx`**
   - Form for recording experiment results
   - Progress tracking
   - Result classification

6. **`app/components/canvas/ManualAssumptionModal.tsx`**
   - Form for user-created assumptions
   - Risk level selection
   - Block/segment linking

7. **`app/components/canvas/RiskAnalysisPanel.tsx`**
   - Section in Block Focus Panel
   - Lists block-specific assumptions sorted by risk
   - Quick actions for testing

8. **`app/components/canvas/RiskOverviewSection.tsx`**
   - Section in Analysis tab
   - Canvas-wide risk summary
   - Top priorities to test

### Enhanced Components

1. **`app/components/canvas/BlockCell.tsx`**
   - Add risk-based border styling
   - Show confidence score badge
   - Update tooltip with risk info

2. **`app/components/canvas/CanvasTabs.tsx`**
   - Add "Assumptions" tab with icon

3. **`app/components/canvas/AnalysisView.tsx`**
   - Add Risk Overview section at top
   - Keep existing consistency checker below

4. **`app/components/canvas/BlockFocusPanel.tsx`**
   - Add Risk Analysis section above content
   - Collapsible content section
   - Show assumptions filtered by current block

---

## State Management

### Canvas Context Updates

**Add to canvas context:**
```typescript
interface CanvasContext {
  // Existing
  blocks: BlockData[];
  segments: Segment[];
  activeTab: CanvasTab;

  // NEW
  assumptions: Assumption[];
  experiments: Experiment[];
  riskHeatmap: Record<BlockType, RiskMetrics>;

  // NEW actions
  createAssumption: (data: Partial<Assumption>) => Promise<Assumption>;
  updateAssumption: (id: string, updates: Partial<Assumption>) => Promise<void>;
  deleteAssumption: (id: string) => Promise<void>;
  createExperiment: (assumptionId: string, data: Partial<Experiment>) => Promise<Experiment>;
  updateExperiment: (id: string, updates: Partial<Experiment>) => Promise<void>;
  refreshRiskHeatmap: () => Promise<void>;
}
```

**Load assumptions/experiments on canvas mount:**
```typescript
// app/canvas/[slug]/CanvasClient.tsx
useEffect(() => {
  async function loadAssumptions() {
    const response = await fetch(`/api/canvas/${canvasId}/assumptions`);
    const data = await response.json();
    setAssumptions(data);

    // Load experiments for all assumptions
    const allExperiments = await Promise.all(
      data.map(a => fetch(`/api/canvas/${canvasId}/assumptions/${a.$id}/experiments`))
    );
    setExperiments(allExperiments.flat());

    // Calculate risk heatmap
    refreshRiskHeatmap();
  }
  loadAssumptions();
}, [canvasId]);
```

---

## Implementation Strategy

### Phase 1: Data Layer (Week 1)

1. Create Appwrite collections (assumptions, experiments)
2. Add TypeScript types to lib/types/canvas.ts
3. Build API routes for CRUD operations
4. Test with Postman/curl

### Phase 2: AI Integration (Week 1-2)

1. Add new AI tools (identifyAssumptions, suggestExperiment, calculateConfidence)
2. Enhance checkConsistency tool
3. Update block analyze endpoint to auto-create assumptions
4. Test AI tool outputs

### Phase 3: UI Foundation (Week 2)

1. Add "Assumptions" tab to CanvasTabs
2. Create AssumptionsView with kanban layout (no drag-and-drop yet)
3. Create AssumptionCard component
4. Wire up to API (read-only initially)

### Phase 4: Risk Heatmap (Week 2-3)

1. Implement risk/confidence calculation functions
2. Add RiskHeatmapOverlay to canvas
3. Update BlockCell with risk borders
4. Add hover tooltips

### Phase 5: Workflows (Week 3-4)

1. Build ExperimentDesignModal
2. Build EvidenceCollectionModal
3. Build ManualAssumptionModal
4. Wire up all CRUD actions
5. Implement auto-status updates on experiment completion

### Phase 6: Block Focus Panel Integration (Week 4)

1. Add RiskAnalysisPanel section
2. Show block-specific assumptions
3. Quick actions for testing

### Phase 7: Analysis Tab Enhancement (Week 4)

1. Add RiskOverviewSection
2. Calculate top priorities
3. Show critical blocks

### Phase 8: Polish (Week 5)

1. Add drag-and-drop to kanban
2. Refine animations and transitions
3. Add loading states
4. Error handling
5. Mobile responsive

### Phase 9: Testing & Refinement (Week 5-6)

1. User testing with sample canvases
2. AI prompt tuning
3. Performance optimization
4. Bug fixes

---

## Success Metrics

### User Engagement
- % of canvases with ≥1 assumption tracked
- Avg assumptions per canvas
- Avg experiments run per assumption

### Validation Activity
- % of assumptions that get tested
- Avg time from assumption creation → first experiment
- % of high-risk assumptions validated

### Quality Indicators
- Avg confidence score across validated assumptions
- % of refuted assumptions that trigger block updates
- Canvas risk score improvement over time

### Business Impact
- Time saved vs. traditional validation (user survey)
- User retention (do they come back after first canvas?)
- Viral coefficient (do they share/recommend?)

---

## Key Differentiator

RocketMap becomes the **only tool** that:
1. Auto-extracts assumptions from your business model
2. Calculates risk if assumptions are wrong
3. Suggests cheap/fast validation experiments
4. Tracks evidence and confidence
5. Shows you which blocks are fragile **before you waste time/money**

This is a **judgment amplifier for assumption validation**, not just a canvas builder.

> "Founders don't fail from bad canvases. They fail from untested assumptions."

RocketMap validates assumptions **before** you build the wrong thing.
