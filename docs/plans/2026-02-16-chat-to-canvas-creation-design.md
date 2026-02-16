# Chat-to-Canvas Creation Design

## Objective

Enable guided chat to create a full canvas using atomic block records, create segment records, link blocks to segments, and take users directly to `/canvas/[slug]` after creation.

## Current State

- Guided creation already uses `/api/canvas/guided-create` and calls `generateCanvas`.
- Redirect already exists in `AIGuidedModal` when `generateCanvas` returns `slug`.
- Segments are created, but block-to-segment linking in guided creation is not deterministic.
- Tool/UI contract is partially inconsistent (`value_prop` vs `value_propositions`, legacy block content vs atomic content).

## Approaches

### Approach 1: Heuristic Linking Only

- Model returns blocks and segments without explicit links.
- Backend infers links by keyword similarity.

**Pros**
- Minimal prompt/schema changes.

**Cons**
- Unstable and non-deterministic links.
- Hard to test and explain.

### Approach 2: Strict Explicit Linking

- Model must return `segmentRefs` for every block item.
- Backend only links from explicit refs.

**Pros**
- Deterministic behavior.
- Easy to test.

**Cons**
- More brittle when model omits refs.

### Approach 3: Hybrid Explicit-First (Recommended)

- Model returns explicit `segmentRefs` when available.
- Backend resolves explicit refs first, then applies narrow fallback (optional) for missing refs.
- Store links directly in block `segments` relationship.

**Pros**
- Deterministic in normal path.
- Resilient to partial model output.
- Supports staged rollout with compatibility parsing.

**Cons**
- Slightly more backend logic.

## Recommended Design

Use **Approach 3 (Hybrid Explicit-First)**:

1. Update `generateCanvas` schema to accept atomic block items: `{ text, tags?, segmentRefs? }`.
2. Persist data in order: canvas -> segments -> blocks.
3. During block creation, resolve `segmentRefs` to segment IDs and set block `segments` field.
4. Keep tool result `{ slug, canvasId, title }` for redirect compatibility.
5. Keep one-shot redirect guard in modal and align tool-card field names with schema.

## Data Flow

1. User chats in guided modal.
2. `/api/canvas/guided-create` invokes model + `createGenerateCanvasTool`.
3. Tool creates canvas row.
4. Tool creates segment rows and builds lookup maps.
5. Tool creates atomic block rows with `contentJson = { text, tags }` and `segments = [segmentIds]`.
6. Tool returns `{ slug, canvasId, title }`.
7. Modal detects tool completion and redirects to `/canvas/[slug]`.

## Error Handling

- If segment creation fails: abort and surface tool error.
- If block creation fails: allow Appwrite cascade cleanup on canvas delete path or explicit rollback in follow-up.
- If redirect slug missing: keep "Open canvas" link card and do not auto-close modal.

## Test Strategy

- Unit: schema accepts atomic block payloads + backward-compatible legacy strings.
- Unit: tool links blocks to expected segment IDs.
- Component: modal redirects exactly once on tool completion.
- Regression: card summary uses `value_prop` key.

## Approval Check

Proceed with the implementation plan in `docs/plans/2026-02-16-chat-to-canvas-creation-system.md`.
