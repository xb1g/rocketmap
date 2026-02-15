# Implementation Plan: Normalizing Canvas Blocks & Atomic Card Management

**Date:** 2026-02-15
**Status:** Draft / Proposed
**Context:** Moving from "JSON-in-DB" (where cards live as an array inside a block string) to a normalized structure for better AI surgical edits, referential integrity, and multi-user concurrency.

## 1. Problem Statement

Currently, all items (cards) within a BMC block are stored in a single `contentJson` column as a serialized array.

- **Last-Write-Wins:** Simultaneous updates (user vs helper AI) cause data loss.
- **AI Token Waste:** AI must read/write the entire block just to change one card.
- **Broken Links:** Links between cards across blocks (e.g. Value Prop -> Customer Segment) are manually maintained strings and prone to orphaned references.

## 2. Proposed Architecture

### 2.1 Schema Updates (Appwrite)

We will introduce a new collection for atomic card management and update the existing `blocks` schema.

#### New Collection: `cards`

| Attribute     | Type         | Description                                        |
| ------------- | ------------ | -------------------------------------------------- |
| `$id`         | string (UID) | Appwrite internal ID                               |
| `id`          | string       | Stable ID for internal linking (e.g. "card_123")   |
| `blockId`     | integer      | Reference to the parent block row                  |
| `canvasId`    | integer      | Reference to the parent canvas (for fast indexing) |
| `name`        | string       | Card title                                         |
| `description` | longtext     | Optional detailed content                          |
| `order`       | integer      | Position within the block grid/list                |
| `createdAt`   | datetime     | ISO timestamp                                      |

#### New Collection: `card_links` (Optional/Phase 2)

| Attribute  | Type   | Description                                 |
| ---------- | ------ | ------------------------------------------- |
| `sourceId` | string | ID of the source card                       |
| `targetId` | string | ID of the target card or segment            |
| `linkType` | string | e.g. "addresses_problem", "targets_segment" |

### 2.2 Data Migration Path

1. **Parallel Storage:** Update API to write to _both_ `contentJson` (legacy) and the new `cards` collection.
2. **Backfill Script:** Run a script to parse all existing `contentJson` blobs and insert records into `cards`.
3. **Deprecation:** Update frontend to read primarily from `cards` collection.

## 3. Implementation Steps

### Phase 1: Infrastructure & API

- [ ] Create `cards` collection in Appwrite.
- [ ] Add indexes for `canvasId` and `blockId`.
- [ ] Create `POST /api/canvas/[canvasId]/blocks/[blockType]/cards` (Create atomic card).
- [ ] Create `PATCH /api/cards/[cardId]` (Surgical card edit).
- [ ] Create `DELETE /api/cards/[cardId]` (Atomic delete).

### Phase 2: AI Tooling Updates

Update `lib/ai/tools.ts` to include surgical tools:

- **`addCard`**: AI adds a specific item to a block.
- **`modifyCard`**: AI fixes context/wording on one specific card.
- **`linkCards`**: AI explicitly creates a relationship between two items.

### Phase 3: Frontend Refactor

- [ ] Update `CanvasClient.tsx` to fetch blocks and their associated cards (via collection list).
- [ ] Implement Optimistic Updates in the UI for atomic card changes.
- [ ] Update the "Consistency Checker" to query the `cards` collection directly for validation.

## 4. Risks & Mitigations

- **Overfetching:** Listing 9 blocks x ~10 cards each might lead to 10+ network requests.
  - _Mitigation:_ Use Appwrite's `listDocuments` with a query for `canvasId` to fetch _all_ cards for a canvas in a single response, then group them client-side by `blockId`.
- **Syncing Errors:** Cards being added while a block-level AI analysis is running.
  - _Mitigation:_ Decouple `aiAnalysisJson` (block-level) from the card data. AI analysis remains on the block, card content lives in the cards table.
