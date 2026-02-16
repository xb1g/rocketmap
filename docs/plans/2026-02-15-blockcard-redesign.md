# BlockCard Component Redesign

**Date:** 2026-02-15
**Status:** Approved
**Context:** Migrate from items-in-JSON to atomic block records with Many-to-Many segment relationships

## Problem Statement

The current `BlockItemCard` component treats items as JSON objects stored within a block's `contentJson` field. This creates architectural issues:

1. Items can't use Appwrite relationships (segments, assumptions)
2. Querying/filtering individual items is inefficient
3. Relationship management is manual and error-prone
4. No referential integrity for item-level links

## Solution: Atomic Block Records

Each "card" or "item" becomes a separate row in the `blocks` table. Multiple blocks of the same `blockType` can exist (e.g., 3 cost_structure blocks for different costs).

### Key Architectural Change

**Before:**
```
1 block (type: cost_structure)
  → contentJson: {
      bmc: "...",
      lean: "...",
      items: [
        { name: "AWS", linkedSegmentIds: [...] },
        { name: "Salaries", linkedSegmentIds: [...] }
      ]
    }
```

**After:**
```
block 1 (type: cost_structure)
  → contentJson: { text: "AWS Hosting - $500/mo", tags: ["fixed", "cloud"] }
  → segments: [segment_1, segment_3] (M:M relationship)

block 2 (type: cost_structure)
  → contentJson: { text: "Engineer salaries", tags: ["variable", "team"] }
  → segments: [segment_1]
```

## Data Structure

### contentJson Format

```typescript
interface BlockContentData {
  text: string;      // Main content (multiline, no truncation)
  tags?: string[];   // Optional tags for categorization
}
```

**Storage:** JSON string in `contentJson` column
**Example:** `{"text":"AWS Hosting - $500/mo","tags":["fixed","cloud"]}`

### Existing Schema Fields

From `blocks` table:
- `$id`: String (Appwrite ID)
- `blockType`: Enum (customer_segments, value_prop, etc.)
- `contentJson`: LongText (stores BlockContentData as JSON string)
- `confidenceScore`: Double (0-100, validation confidence)
- `riskScore`: Double (0-100, risk level)
- `segments`: Relationship (Many-to-Many with segments)
- `assumptions`: Relationship (Many-to-Many with assumptions, managed separately)
- `canvas`: Relationship (Many-to-One with canvases)

## Component Design

### Rename: BlockItemCard → BlockCard

The component represents a single block entity, not an item within a block.

### Props Interface

```typescript
interface BlockCardProps {
  block: {
    $id: string;
    blockType: BlockType;
    contentJson: string; // JSON.parse → { text, tags? }
    confidenceScore: number; // 0-100
    riskScore: number; // 0-100
    segments: Segment[]; // Pre-loaded from relationship
  };
  allSegments: Segment[]; // All available segments in canvas
  onUpdate: (blockId: string, updates: { contentJson: string }) => void;
  onDelete: (blockId: string) => void;
  onSegmentToggle: (blockId: string, segmentId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
```

### Component Responsibilities

1. Parse `contentJson` to display text and tags
2. Show linked segments as color badges
3. Display confidence score as visual indicator
4. Inline text editing with autosave
5. Tag management (add/remove tags)
6. Link button → opens LinkPicker for segment selection
7. Delete button with confirmation

### Parent (BlockCell) Responsibilities

1. Fetch blocks with segments relationship loaded
2. Handle API calls to update block
3. Handle API calls to toggle segment relationships
4. Manage hover states for connection lines

## UI/UX Design

### Visual Layout

```
┌─────────────────────────────────────┐
│ Text content that can span          │ ← Click to edit
│ multiple lines without truncation   │
│ Shows full text always              │
│                                     │
│ [tag1] [tag2] [+]                  │ ← Tags
│                                     │
│ ● ● ●  [85%] [🔗 Link] [×]        │ ← Segments, confidence, actions
└─────────────────────────────────────┘
```

### Interaction Patterns

**Text Editing:**
- Click text → Edit mode (textarea)
- Type → Autosave after 500ms debounce
- ESC → Cancel and revert changes
- Click outside → Save and exit edit mode

**Tag Management:**
- Click + → Add new tag
- Click × on tag → Remove tag
- Changes autosave immediately

**Segment Linking:**
- Click 🔗 → Open LinkPicker popover
- Toggle checkboxes → Update segments relationship
- Changes save immediately via API

**Deletion:**
- Click × → Show confirmation modal
- Confirm → Delete block
- Cancel → Close modal

### States

1. **View Mode:** Full multiline text, tags, segment badges, confidence %, link/delete buttons
2. **Edit Mode:** Textarea with autosave, ESC to cancel, click outside to save
3. **Link Picker Open:** Popover showing all segments with checkboxes

## Data Flow

### Loading Blocks

```typescript
// Parent (BlockCell) fetches blocks with segments loaded
const blocks = await serverTablesDB.listRows({
  databaseId: DATABASE_ID,
  tableId: BLOCKS_TABLE_ID,
  queries: [
    Query.equal('canvas', canvasId),
    Query.equal('blockType', 'cost_structure')
  ]
});
// Note: segments relationship auto-loaded (can't be in Query.select)
```

### Updating Block Content

```typescript
// User edits text → debounced autosave → parent calls:
onUpdate(blockId, {
  contentJson: JSON.stringify({
    text: newText,
    tags: existingTags
  })
});

// Parent handles API call:
await serverTablesDB.updateRow({
  databaseId: DATABASE_ID,
  tableId: BLOCKS_TABLE_ID,
  rowId: blockId,
  data: { contentJson }
});
```

### Toggling Segment Links

```typescript
// User clicks segment in LinkPicker → parent calls:
onSegmentToggle(blockId, segmentId);

// Parent handles relationship update:
// Appwrite manages M:M via junction table automatically
// If adding: append to segments relationship
// If removing: remove from segments relationship
```

### Delete Block

```typescript
// User confirms deletion → parent calls:
onDelete(blockId);

// Parent handles:
await serverTablesDB.deleteRow({
  databaseId: DATABASE_ID,
  tableId: BLOCKS_TABLE_ID,
  rowId: blockId
});
// Cascade delete handles cleanup automatically
```

## Error Handling

### Parse Error (Invalid contentJson)

```typescript
try {
  const content = JSON.parse(block.contentJson);
} catch {
  // Fallback: treat as plain text
  return { text: block.contentJson, tags: [] };
}
```

### Autosave Failure

- Show error toast/notification
- Keep edit mode open
- Allow retry or manual save

### Delete Confirmation

- Show modal: "Delete this block? This cannot be undone."
- Only delete on explicit confirmation
- Show success/error feedback

### Empty Text

- Allow empty blocks (user might be planning)
- Show placeholder: "Enter block content..."

### Segment Relationship Error

- If segment toggle fails, revert UI immediately
- Show error notification
- Don't leave UI in inconsistent state

## Edge Cases

- **Very long text:** No truncation, natural wrap with scroll if needed
- **No segments available:** Disable/hide link button
- **Block without segments:** Show empty state in badge area
- **Rapid edits:** Debounce handles this (last edit wins)
- **Concurrent edits:** Last write wins (no conflict resolution for MVP)

## Migration Notes

### Type Changes

**Remove from `BlockItem` interface:**
- `linkedSegmentIds: string[]` (now managed via relationship)

**Update `BlockContent` interface:**
```typescript
// OLD
interface BlockContent {
  bmc: string;
  lean: string;
  items: BlockItem[]; // ❌ Remove this
}

// NEW
interface BlockContent {
  text: string;
  tags?: string[];
}
```

### Component Rename

- `BlockItemCard.tsx` → `BlockCard.tsx`
- Update all imports in parent components

### API Changes

**No separate items API needed:**
- Delete: `app/api/canvas/[canvasId]/blocks/[blockType]/cards/route.ts` ✅ Already deleted
- Delete: `app/api/canvas/[canvasId]/cards/route.ts` ✅ Already deleted
- Delete: `app/api/cards/[cardId]/route.ts` ✅ Already deleted

**Blocks API handles everything:**
- Create block: `serverTablesDB.createRow()`
- Update block: `serverTablesDB.updateRow()`
- Delete block: `serverTablesDB.deleteRow()`
- Segment relationships: Appwrite manages automatically

## Design Decisions

### Why not store items in contentJson?

**Rejected:** Storing items as JSON array prevents using Appwrite relationships, makes querying inefficient, and requires manual relationship management.

**Chosen:** Each card is a separate block record. Leverages Appwrite's relationship system, enables efficient querying, and provides referential integrity.

### Why autosave instead of Save/Cancel buttons?

**Better UX:** Reduces friction, matches modern editing patterns (Notion, Google Docs), fewer clicks.

### Why show full text instead of truncating?

**Context matters:** Users need to see full content to understand blocks. Truncation hides information and requires extra clicks.

### Cross-block relationships

**Decision:** Cross-block relationships are implicit via shared segments. If two blocks link to the same segment, they're related. This is simpler than managing explicit block-to-block links.

**Not needed now:** `linkedItemIds` removed from BlockItem interface. Can be added later if needed.

## Implementation Plan

See implementation plan in separate document (will be generated via writing-plans skill).

## Success Criteria

1. ✅ BlockCard displays single block entity with text, tags, segments
2. ✅ Inline text editing with autosave works smoothly
3. ✅ Segment linking updates M:M relationship correctly
4. ✅ Multiple blocks of same blockType can coexist
5. ✅ Delete with confirmation prevents accidents
6. ✅ Error handling provides clear feedback
7. ✅ Component is reusable across all block types
