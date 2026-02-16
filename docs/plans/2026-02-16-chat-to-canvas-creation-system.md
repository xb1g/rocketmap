# Chat-to-Canvas Creation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make guided chat create a canvas using the new atomic block format, create segments, link segments to created blocks, and redirect users to the new canvas page.

**Architecture:** Keep `/api/canvas/guided-create` as the single orchestration endpoint, but upgrade `generateCanvas` input/output contracts so the model can emit structured block items plus segment references. Persist in this order: canvas -> segments -> blocks (with `segments` relationship IDs), then surface `{ slug, canvasId, title }` to UI and redirect from modal once tool completion is detected.

**Tech Stack:** Next.js App Router, AI SDK tools (`ai`), Appwrite TablesDB relationships, Vitest + Testing Library.

---

### Task 1: Define Guided-Create Contract For New Block Type

**Files:**
- Modify: `lib/ai/tools.ts`
- Modify: `lib/ai/prompts.ts`
- Test: `tests/lib/ai/guided-create-schema.test.ts`

**Step 1: Write the failing schema test**

Create `tests/lib/ai/guided-create-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("guided-create generateCanvas schema", () => {
  it("accepts atomic block items with segment references", () => {
    const payload = {
      title: "Acme",
      segments: [
        {
          name: "SMB cafes",
          description: "Independent coffee shops",
          demographics: "Owner-operated",
          psychographics: "Growth-focused",
          behavioral: "Actively tests tools",
          geographic: "Bangkok",
          estimatedSize: "2,500 shops",
          priority: "high",
        },
      ],
      channels: [
        { text: "Outbound founder-led sales", tags: ["sales"], segmentRefs: ["SMB cafes"] },
      ],
    };
    expect(payload.channels[0].segmentRefs?.[0]).toBe("SMB cafes");
  });
});
```

**Step 2: Define atomic item input schema**

In `lib/ai/tools.ts`, introduce:
- `atomicBlockItemSchema = z.object({ text, tags?, segmentRefs? })`
- Block arrays (`key_partnerships`, `channels`, etc.) accept `z.array(atomicBlockItemSchema)` first.
- Backward compatibility: also accept `string[]` temporarily via `z.union`.

**Step 3: Align onboarding prompt with schema**

In `lib/ai/prompts.ts`:
- Update `ONBOARDING_SYSTEM_PROMPT` examples to emit object arrays (`{ text, tags, segmentRefs }`) instead of plain strings.
- Standardize naming to `value_prop` (not `value_propositions`).

**Step 4: Run test to verify schema contract**

Run: `npm run test -- tests/lib/ai/guided-create-schema.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/ai/tools.ts lib/ai/prompts.ts tests/lib/ai/guided-create-schema.test.ts
git commit -m "feat: define atomic guided-create schema with segment refs"
```

---

### Task 2: Persist Segments And Build Deterministic Link Lookup

**Files:**
- Modify: `lib/ai/tools.ts`
- Test: `tests/lib/ai/generate-canvas-tool.test.ts`

**Step 1: Write failing persistence test**

In `tests/lib/ai/generate-canvas-tool.test.ts`, add assertion that segment creation returns stable IDs usable for linking:

```ts
expect(createdSegmentIdsByName.get("smb cafes")).toBeDefined();
```

**Step 2: Implement segment lookup map**

In `createGenerateCanvasTool` (`lib/ai/tools.ts`):
- After creating segments, store maps:
  - `segmentIdByNameNormalized`
  - `segmentIdByIndex`
- Normalize names using `trim().toLowerCase()`.

**Step 3: Add helper for segment ref resolution**

Add helper:
- Input: `segmentRefs?: string[]`
- Output: `string[]` of unique segment IDs
- Resolution order: exact normalized name -> numeric index string (`"1"`, `"2"`) -> empty.

**Step 4: Run targeted test**

Run: `npm run test -- tests/lib/ai/generate-canvas-tool.test.ts -v`
Expected: PASS for segment lookup assertions

**Step 5: Commit**

```bash
git add lib/ai/tools.ts tests/lib/ai/generate-canvas-tool.test.ts
git commit -m "feat: add deterministic segment lookup for guided-create linking"
```

---

### Task 3: Create Blocks In New Atomic Format And Link Segments

**Files:**
- Modify: `lib/ai/tools.ts`
- Test: `tests/lib/ai/generate-canvas-tool.test.ts`

**Step 1: Extend failing test for block payload shape**

Add assertions:

```ts
expect(createdBlock.data.contentJson).toContain('"text"');
expect(createdBlock.data.contentJson).not.toContain('"bmc"');
expect(createdBlock.data.segments).toEqual(expect.arrayContaining([expect.any(String)]));
```

**Step 2: Normalize incoming block items before create**

In `createGenerateCanvasTool`:
- Convert legacy `string` entries to `{ text: string, tags: [], segmentRefs: [] }`.
- For each normalized item, create one block row:
  - `contentJson: JSON.stringify({ text, tags })`
  - `segments: resolvedSegmentIds`

**Step 3: Update customer-segment block behavior**

Replace single summary block behavior with atomic records:
- Create one `customer_segments` block per segment (or per generated item if provided).
- Link each such block to its source segment ID.

**Step 4: Preserve return payload for redirect**

Keep tool result shape:
- `{ slug, canvasId, title }`

This avoids breaking existing redirect logic in `AIGuidedModal`.

**Step 5: Run targeted test**

Run: `npm run test -- tests/lib/ai/generate-canvas-tool.test.ts -v`
Expected: PASS for atomic content + segment link assertions

**Step 6: Commit**

```bash
git add lib/ai/tools.ts tests/lib/ai/generate-canvas-tool.test.ts
git commit -m "feat: persist atomic blocks with segment relationships in guided-create"
```

---

### Task 4: Fix Guided-Create UI Completion And Redirect Robustness

**Files:**
- Modify: `app/components/dashboard/AIGuidedModal.tsx`
- Modify: `app/components/ai/ChatMessage.tsx`
- Test: `tests/components/dashboard/AIGuidedModal.test.tsx`

**Step 1: Write failing redirect test**

Create `tests/components/dashboard/AIGuidedModal.test.tsx` asserting:
- when a `generateCanvas` tool part arrives with `slug`, `router.push('/canvas/[slug]')` is called once.

**Step 2: Harden one-shot redirect guard**

In `AIGuidedModal.tsx`:
- Keep `creatingRef` lock and ensure `handleCanvasReady` cannot fire twice for the same slug.
- Add idempotency guard with `lastRedirectSlugRef`.

**Step 3: Fix generated-card block key mismatch**

In `app/components/ai/ChatMessage.tsx` (`GenerateCanvasCard`):
- Change `value_propositions` to `value_prop` in `blockKeys`.
- Keep visual summary aligned with tool schema.

**Step 4: Run targeted UI test**

Run: `npm run test -- tests/components/dashboard/AIGuidedModal.test.tsx -v`
Expected: PASS

**Step 5: Commit**

```bash
git add app/components/dashboard/AIGuidedModal.tsx app/components/ai/ChatMessage.tsx tests/components/dashboard/AIGuidedModal.test.tsx
git commit -m "fix: stabilize guided-create redirect and align generate canvas card keys"
```

---

### Task 5: Validate End-to-End Guided Create Flow

**Files:**
- Modify: `app/api/canvas/guided-create/route.ts` (only if needed for tool choice or safety checks)
- Modify: `docs/plans/2026-02-16-chat-to-canvas-creation-system.md` (execution notes)

**Step 1: Add failing integration-style test (optional if mocks are available)**

Add one test that simulates:
- user sends guided messages
- tool result includes slug
- redirect triggered

**Step 2: Verify route stability**

Confirm `/api/canvas/guided-create` still:
- uses `createGenerateCanvasTool(user.$id)`
- returns stream with tool result parts
- leaves `toolChoice` force behavior intact (`>=3` user turns)

**Step 3: Run full related tests**

Run:

```bash
npm run test -- tests/lib/ai/generate-canvas-tool.test.ts tests/lib/ai/guided-create-schema.test.ts tests/components/dashboard/AIGuidedModal.test.tsx -v
```

Expected: PASS

**Step 4: Commit**

```bash
git add app/api/canvas/guided-create/route.ts docs/plans/2026-02-16-chat-to-canvas-creation-system.md
git commit -m "test: validate guided chat creates linked atomic canvas and redirects"
```

---

### Task 6: Follow-Up Migration Guardrail (If Legacy Readers Still Required)

**Files:**
- Modify: `app/canvas/[slug]/page.tsx`
- Modify: `lib/ai/canvas-state.ts`

**Step 1: Add compatibility parser for mixed contentJson**

Support both payloads:
- Legacy: `{ bmc, lean, items }`
- New: `{ text, tags }`

**Step 2: Ensure no data loss while migrating**

If `text` exists:
- map to temporary display field without discarding tags.

**Step 3: Smoke-check canvas load paths**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add app/canvas/[slug]/page.tsx lib/ai/canvas-state.ts
git commit -m "chore: add mixed payload guardrail during atomic canvas rollout"
```
