# Market Research Deep-Dive Layer (Customer Segments)

## Context

The BMC canvas has 9 blocks at Layer 0, with a BlockFocusPanel (Layer 1) for expanded editing + AI analysis. **No Layer 2 exists yet.** This plan adds the first deep-dive layer: Market Research for the Customer Segments block, with 5 sub-modules (TAM/SAM/SOM, Segmentation, Personas, Validation, Competitive Landscape). Each sub-module has its own AI tool. Results feed back into the consistency checker.

---

## Phase 1: Foundation

### 1.1 Add types to `lib/types/canvas.ts`

New types:
- `DeepDiveModule` union: `'tam_sam_som' | 'segmentation' | 'personas' | 'market_validation' | 'competitive_landscape'`
- `MarketSizeEstimate` — value (USD), methodology, sources[], confidence level
- `TamSamSomData` — industry, geography, targetCustomerType, tam/sam/som estimates, reasoning
- `CustomerSegment` — id, name, description, dimensions (demographics/psychographics/behavioral/geographic), estimatedSize, priority
- `SegmentationData` — segments[]
- `Persona` — id, name, age, occupation, segmentId, goals[], frustrations[], behaviors[], quote
- `PersonasData` — personas[]
- `ValidationItem` — claim, status (confirmed/questioned/contradicted), evidence, source
- `MarketValidationData` — validations[], overallAssessment
- `Competitor` — id, name, positioning, strengths[], weaknesses[], marketShareEstimate, threatLevel
- `CompetitiveLandscapeData` — competitors[]
- `MarketResearchData` — aggregate of all 5 sub-module data objects

### 1.2 Add `deepDiveJson` column to Appwrite blocks collection

- Type: string (longtext), not required, default null
- Single field stores the full `MarketResearchData` JSON — keeps 1:1 with block, avoids new collection

### 1.3 Update data loading

- `lib/ai/canvas-state.ts` → `getCanvasBlocks()`: parse `deepDiveJson` field alongside existing fields
- `app/canvas/[slug]/page.tsx`: pass parsed deep-dive data through to client

### 1.4 Add state management in `app/canvas/[slug]/CanvasClient.tsx`

New state:
```
deepDiveBlock: BlockType | null        // which block's deep-dive is open
activeModule: DeepDiveModule           // which tab is active
deepDiveData: MarketResearchData | null // the data
generatingModule: DeepDiveModule | null // loading state
```

### 1.5 Build `DeepDiveOverlay` component

- `app/components/blocks/DeepDiveOverlay.tsx` — full-screen overlay (replaces focus panel)
- Layout: breadcrumb header (block name > "Market Research" + close button) + tab bar (5 tabs) + content area
- Uses existing `glass-morphism` styling, dark background backdrop
- Generic wrapper — only `customer_segments` provides content for now

### 1.6 Add "Deep Dive" button to `BlockFocusPanel`

- Visible only when `blockType === 'customer_segments'`
- Placed between the Analyze button and AI Results
- Triggers `onDeepDive` callback → sets `deepDiveBlock` in CanvasClient
- Styled as secondary action with chromatic-border on hover

---

## Phase 2: API & AI Tools

### 2.1 Add 5 AI tools to `lib/ai/tools.ts`

Following the existing `tool()` + Zod schema pattern:

| Tool | Input Schema | Purpose |
|------|-------------|---------|
| `estimateMarketSize` | tam/sam/som objects with value, methodology, sources, confidence + reasoning | Market sizing |
| `generateSegments` | segments[] with id, name, description, dimensions, estimatedSize, priority | Customer segmentation |
| `generatePersonas` | personas[] with id, name, age, occupation, segmentId, goals, frustrations, behaviors, quote | Persona creation |
| `validateMarketSize` | validations[] with claim, status, evidence, source + overallAssessment | Validate TAM estimates |
| `analyzeCompetitors` | competitors[] with id, name, positioning, strengths, weaknesses, marketShareEstimate, threatLevel | Competitive mapping |

Update `getToolsForAgent()` to include these in its registry.

### 2.2 Add deep-dive prompts to `lib/ai/prompts.ts`

New `DEEP_DIVE_PROMPTS: Record<DeepDiveModule, string>` with module-specific instructions. New `buildDeepDivePrompt()` function that:
- Includes `BASE_SYSTEM_PROMPT`
- Adds module-specific guidance
- Serializes full canvas state for cross-referencing
- Includes existing deep-dive data (e.g., persona prompt receives segments data)
- Includes user inputs (industry, geography, etc.)

### 2.3 Create API route

**`POST /api/canvas/[canvasId]/blocks/[blockType]/deep-dive/route.ts`**

- Request: `{ module: DeepDiveModule, inputs: Record<string, string> }`
- Auth check, load blocks, build deep-dive prompt
- Call `generateText()` with the module-specific tool
- Merge result into existing `deepDiveJson`
- Persist to Appwrite
- Return: `{ result: ..., updatedDeepDive: MarketResearchData }`

**`PUT /api/canvas/[canvasId]/blocks/[blockType]/deep-dive/route.ts`**

- For manual field edits (user types in segment name, edits competitor data, etc.)
- Request: `{ deepDiveJson: string }`
- Persists to Appwrite

---

## Phase 3: Sub-Module Components

All in `app/components/blocks/market-research/`

### 3.1 `MarketResearchView.tsx`
- Tab container that renders active sub-module based on `activeModule` state
- Passes data + callbacks to each module

### 3.2 `TamSamSomModule.tsx` (build first — highest demo impact)
- **Inputs:** industry, geography, target customer type (3 text fields, editable)
- **"Estimate with AI" button** → calls deep-dive API with module='tam_sam_som'
- **Results:** TAM/SAM/SOM values formatted as currency, methodology text, source citations, confidence badges
- **All fields editable** — user can tweak AI-generated values, methodology, sources
- **Visual:** `TamSamSomVisual.tsx` — nested circles SVG (TAM outer > SAM middle > SOM inner) with values labeled

### 3.3 `SegmentationModule.tsx`
- **"Generate Segments" button** → AI suggests segments from block content
- **Segment cards** (`SegmentCard.tsx`): name, description, 4 dimension fields (all editable), estimated size, priority badge
- **Add/remove segments manually**
- Auto-saves edits via debounced PUT

### 3.4 `PersonaModule.tsx`
- **"Generate Personas" button** → AI creates personas linked to segments
- **Persona cards** (`PersonaCard.tsx`): avatar placeholder (initials/seed), name, age, occupation, goals list, frustrations list, quote
- **All fields editable** — user can refine personas after generation
- Receives segment data so personas link to segments

### 3.5 `MarketValidationModule.tsx`
- **"Validate Estimates" button** → AI cross-checks TAM/SAM/SOM
- **Validation items** (`ValidationItem.tsx`): claim text, status badge (green confirmed / amber questioned / red contradicted), evidence, source
- Overall assessment summary (editable)

### 3.6 `CompetitiveLandscapeModule.tsx`
- **"Analyze Competitors" button** → AI researches competitors
- **Competitor cards** (`CompetitorCard.tsx`): name, positioning, strengths/weaknesses lists, market share estimate, threat level badge (color-coded)
- **All fields editable** + add/remove competitors manually

**Each module follows a consistent pattern:**
1. Input/context section (user-editable)
2. "Generate with AI" button (disabled during generation, shows glow-ai)
3. Results display with **editable fields**
4. Auto-saves on field changes (debounced PUT to deep-dive endpoint)

---

## Phase 4: Consistency Checker Integration

### 4.1 Extend `serializeCanvasState()` in `lib/ai/prompts.ts`

When deep-dive data exists for a block, append a summary:
```
[Customer Segments]: "B2B SaaS companies..."
  [Deep Dive - Market Size]: TAM $45B, SAM $8B, SOM $500M
  [Deep Dive - Segments]: 3 segments (Enterprise, Mid-market, SMB)
  [Deep Dive - Competitors]: 5 competitors mapped
```

This gives the consistency checker context to flag issues like TAM not supporting revenue projections.

---

## Files to Create/Modify

**New files:**
- `app/components/blocks/DeepDiveOverlay.tsx`
- `app/components/blocks/market-research/MarketResearchView.tsx`
- `app/components/blocks/market-research/TamSamSomModule.tsx`
- `app/components/blocks/market-research/TamSamSomVisual.tsx`
- `app/components/blocks/market-research/SegmentationModule.tsx`
- `app/components/blocks/market-research/SegmentCard.tsx`
- `app/components/blocks/market-research/PersonaModule.tsx`
- `app/components/blocks/market-research/PersonaCard.tsx`
- `app/components/blocks/market-research/MarketValidationModule.tsx`
- `app/components/blocks/market-research/ValidationItem.tsx`
- `app/components/blocks/market-research/CompetitiveLandscapeModule.tsx`
- `app/components/blocks/market-research/CompetitorCard.tsx`
- `app/api/canvas/[canvasId]/blocks/[blockType]/deep-dive/route.ts`

**Modified files:**
- `lib/types/canvas.ts` — add all deep-dive types
- `lib/ai/tools.ts` — add 5 new AI tools, update `getToolsForAgent()`
- `lib/ai/prompts.ts` — add `DEEP_DIVE_PROMPTS`, `buildDeepDivePrompt()`, extend `serializeCanvasState()`
- `lib/ai/canvas-state.ts` — parse `deepDiveJson` in `getCanvasBlocks()`
- `app/canvas/[slug]/page.tsx` — pass deep-dive data to client
- `app/canvas/[slug]/CanvasClient.tsx` — add deep-dive state, render DeepDiveOverlay
- `app/components/canvas/BlockFocusPanel.tsx` — add "Deep Dive" button for customer_segments

**Appwrite (manual):**
- Add `deepDiveJson` longtext column to blocks collection

---

## Build Order

1. Types + Appwrite column + data loading updates
2. DeepDiveOverlay + "Deep Dive" button in BlockFocusPanel + CanvasClient state
3. AI tools + prompts + API route (POST + PUT)
4. TamSamSomModule + TamSamSomVisual
5. SegmentationModule + SegmentCard
6. PersonaModule + PersonaCard
7. MarketValidationModule + ValidationItem
8. CompetitiveLandscapeModule + CompetitorCard
9. Consistency checker integration (extend serializeCanvasState)

---

## Verification

1. **Navigation flow:** Click Customer Segments block → BlockFocusPanel opens → click "Deep Dive" → full-screen overlay with 5 tabs
2. **TAM/SAM/SOM:** Enter industry/geography → click "Estimate with AI" → nested circles render with values → edit values manually
3. **Segmentation:** Click "Generate Segments" → segment cards appear → edit dimension fields → add new segment manually
4. **Personas:** Click "Generate Personas" → persona cards with goals/frustrations → edit persona details
5. **Validation:** Click "Validate" → validation items with status badges
6. **Competitors:** Click "Analyze" → competitor cards with threat levels → add competitor manually
7. **Persistence:** Reload page → all deep-dive data preserved
8. **Consistency:** Run consistency check → it references deep-dive data in its analysis
9. **Build:** `npm run build` passes without errors
