# BlockCard and SegmentCard Component Redesign

**Date:** 2026-02-16
**Status:** Approved
**Context:** Remake BlockCard and SegmentCard components based on current atomic block data structure

## Problem Statement

The current `BlockItemCard` component is based on an outdated data structure where items were stored as JSON arrays within a block's `contentJson` field. The codebase has since migrated to an atomic block architecture where:

1. Each card is a separate row in the `blocks` table
2. Blocks use M:M relationships with segments (via Appwrite relationships)
3. `contentJson` now stores `{ text: string, tags?: string[] }` not `{ bmc, lean, items[] }`
4. Multiple blocks of the same `blockType` can coexist

Current TypeScript errors show the type mismatch between old component expectations and new data structure.

## Solution Overview

Create two new components following the atomic block architecture:

1. **BlockCard** - Display and edit individual block records with segments, tags, confidence score
2. **SegmentCard** - Reusable segment display component extracted from BlockCell inline rendering

Update type definitions to reflect clean atomic structure (no backward compatibility). Update BlockCell to use both new components.

## Architecture

### Type System Updates

**File:** `lib/types/canvas.ts`

#### BlockContent Interface (Clean Atomic Structure)

```typescript
/** Content stored as JSON in contentJson column */
export interface BlockContent {
  text: string;      // Main content (multiline)
  tags?: string[];   // Optional categorization tags
}
```

**Changes:**
- Remove `bmc`, `lean`, `items` fields entirely
- Clean, atomic structure only
- No legacy support

#### BlockItem Interface (DELETE)

```typescript
// ❌ DELETE lines 24-30 completely
// Items are now separate block records, not nested objects
```

#### BlockData Interface (Updated)

```typescript
export interface BlockData {
  $id: string;              // Appwrite row ID
  blockType: BlockType;
  contentJson: string;      // JSON.stringify(BlockContent)
  state: BlockState;
  segments: Segment[];      // M:M relationship (auto-loaded by Appwrite)
  aiAnalysis: AIAnalysis | null;
  confidenceScore: number;  // 0-100
  riskScore: number;        // 0-100
  deepDiveData: MarketResearchData | null;
  lastUsage?: AIUsage | null;
}
```

**Changes:**
- Replace `content: BlockContent` with `contentJson: string`
- Rename `linkedSegments` to `segments` for clarity
- Remove `cards` field (legacy)
- Make `$id` required (was optional)

---

## Component 1: BlockCard

### Purpose
Display and edit a single atomic block record with segments, tags, and confidence score.

### File
`app/components/canvas/BlockCard.tsx`

### Props Interface

```typescript
interface BlockCardProps {
  block: {
    $id: string;
    blockType: BlockType;
    contentJson: string;     // JSON.stringify({ text, tags? })
    confidenceScore: number; // 0-100
    riskScore: number;       // 0-100
    segments: Segment[];     // Pre-loaded from M:M relationship
  };
  allSegments: Segment[];    // All canvas segments for LinkPicker
  allBlockItems?: Map<BlockType, BlockData[]>; // For cross-block links (future)
  onUpdate: (blockId: string, updates: { contentJson: string }) => void;
  onDelete: (blockId: string) => void;
  onSegmentToggle: (blockId: string, segmentId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
```

### Visual Layout

```
┌─────────────────────────────────────────────┐
│ Multi-line text content                     │ ← Click to edit (textarea)
│ that displays fully without truncation      │
│                                             │
│ [tag1] [tag2] [+tag]                       │ ← Optional tags
│                                             │
│ ● ● ● 85% [🔗 Link] [×]                   │ ← Segment badges, confidence, actions
└─────────────────────────────────────────────┘
```

### Component States

1. **View Mode**
   - Display full text content (no truncation, natural wrap)
   - Show tags as removable chips
   - Display segment color badges (first 3, "+N more" if >3)
   - Show confidence score as percentage with color coding
   - Show Link and Delete buttons

2. **Edit Mode**
   - Textarea replaces text display
   - Autosave after 500ms idle (debounced)
   - ESC key cancels and reverts
   - Blur saves and exits edit mode

3. **Link Picker Open**
   - Popover overlay with segment checkboxes
   - Toggle segments on/off
   - Immediate save on toggle

### Key Features

**Inline Text Editing:**
- Click text area → enter edit mode (textarea)
- Autosave after 500ms debounce
- ESC cancels, blur saves

**Tag Management:**
- Click `+` button → prompt for new tag
- Click `×` on tag → remove tag
- Changes save immediately

**Segment Badges:**
- Color dots matching segment colors (from `colorHex` or priority-based)
- Show first 3 segments, "+N more" if >3
- Click badge → highlight linked segment (future)

**Link Button:**
- Opens LinkPicker popover
- Shows all canvas segments with checkboxes
- Toggle segments on/off
- Immediate API call on toggle

**Delete Button:**
- Confirm before deletion: "Delete this block? This cannot be undone."
- Only delete on explicit confirmation
- Show success/error feedback

**Confidence Indicator:**
- Percentage display (85%)
- Color coding:
  - 70-100: Green (healthy)
  - 40-69: Amber (warning)
  - 0-39: Red (critical)

### Component Structure

```typescript
"use client";

import { useState, useCallback, forwardRef, useMemo } from "react";
import type { BlockType, Segment, BlockContent } from "@/lib/types/canvas";
import { LinkPicker } from "./LinkPicker";

export const BlockCard = forwardRef<HTMLDivElement, BlockCardProps>(
  function BlockCard(
    { block, allSegments, onUpdate, onDelete, onSegmentToggle, onMouseEnter, onMouseLeave },
    ref
  ) {
    // Parse contentJson with fallback
    const content: BlockContent = useMemo(() => {
      try {
        return JSON.parse(block.contentJson);
      } catch {
        return { text: block.contentJson || '', tags: [] };
      }
    }, [block.contentJson]);

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(content.text);
    const [linkPickerOpen, setLinkPickerOpen] = useState(false);

    // Debounced autosave (500ms)
    const handleSave = useDebouncedCallback(() => {
      onUpdate(block.$id, {
        contentJson: JSON.stringify({ text: editText, tags: content.tags })
      });
      setIsEditing(false);
    }, 500);

    // Confidence color
    const confidenceColor =
      block.confidenceScore >= 70 ? 'var(--state-healthy)' :
      block.confidenceScore >= 40 ? 'var(--state-warning)' :
      'var(--state-critical)';

    return (
      <div
        ref={ref}
        className="block-item-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="p-1.5 space-y-1">
          {/* Text content (view or edit) */}
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                handleSave();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditText(content.text);
                  setIsEditing(false);
                }
              }}
              onBlur={handleSave}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] text-foreground outline-none border border-white/12 focus:border-white/25 resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-[10px] text-foreground/80 hover:text-foreground text-left w-full transition-colors whitespace-pre-wrap"
            >
              {content.text || 'Enter block content...'}
            </button>
          )}

          {/* Tags row */}
          {content.tags && content.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {content.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[8px] px-1.5 py-px rounded bg-white/8 text-foreground-muted/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Segment badges + confidence + actions */}
          <div className="flex items-center gap-1.5">
            {/* Segment color dots */}
            {block.segments.slice(0, 3).map(seg => (
              <span
                key={seg.$id}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: seg.colorHex || 'var(--state-calm)' }}
                title={seg.name}
              />
            ))}
            {block.segments.length > 3 && (
              <span className="text-[8px] text-foreground-muted/40">
                +{block.segments.length - 3}
              </span>
            )}

            {/* Confidence score */}
            <span
              className="text-[9px] font-mono ml-auto"
              style={{ color: confidenceColor }}
            >
              {block.confidenceScore}%
            </span>

            {/* Link button */}
            <button
              onClick={() => setLinkPickerOpen(!linkPickerOpen)}
              className="text-[9px] px-1.5 py-0.5 rounded text-foreground-muted/40 hover:text-foreground-muted hover:bg-white/5 transition-colors"
              title="Link to segments"
            >
              🔗
            </button>

            {/* Delete button */}
            <button
              onClick={() => {
                if (confirm('Delete this block? This cannot be undone.')) {
                  onDelete(block.$id);
                }
              }}
              className="text-[9px] px-1.5 py-0.5 rounded text-red-400/50 hover:text-red-400 transition-colors"
              title="Delete block"
            >
              ×
            </button>
          </div>
        </div>

        {/* Link Picker Popover */}
        {linkPickerOpen && (
          <LinkPicker
            item={{ id: block.$id, segments: block.segments }}
            segments={allSegments}
            onToggleSegment={(segId) => onSegmentToggle(block.$id, segId)}
            onClose={() => setLinkPickerOpen(false)}
          />
        )}
      </div>
    );
  }
);
```

### Error Handling

**Parse errors (invalid contentJson):**
```typescript
try {
  return JSON.parse(block.contentJson);
} catch {
  return { text: block.contentJson || '', tags: [] }; // Fallback to plain text
}
```

**Autosave failures:**
- Show toast notification: "Failed to save changes"
- Keep edit mode open
- Retry after 2s or allow manual retry

**Delete confirmation:**
- Always confirm before deletion
- Show modal: "Delete this block? This cannot be undone."
- Only delete on explicit confirmation

**Empty blocks:**
- Allow empty text (user might be planning)
- Show placeholder: "Enter block content..."
- No validation required

---

## Component 2: SegmentCard

### Purpose
Reusable segment display component extracted from BlockCell inline rendering. Supports two modes: compact (1-line for non-CS blocks) and full (multi-line with actions for CS block).

### File
`app/components/canvas/SegmentCard.tsx`

### Props Interface

```typescript
interface SegmentCardProps {
  segment: Segment;
  mode: 'compact' | 'full';  // Compact for non-CS blocks, full for CS block
  isEditing?: boolean;       // Only for full mode
  onEdit?: () => void;       // Only for full mode
  onSave?: (updates: { name: string; description: string }) => void;
  onCancel?: () => void;     // Only for full mode
  onFocus?: () => void;      // Only for full mode (expand in focus panel)
  onLink?: () => void;       // Click handler for linking
  segmentRefCallback?: (el: HTMLElement | null) => void;
}
```

### Visual Layouts

**Compact Mode** (for non-customer_segments blocks):
```
┌─────────────────────────────────┐
│ ● Segment Name    [EA] 85      │ ← Dot, name, EA badge, score
└─────────────────────────────────┘
```

**Full Mode** (for customer_segments block):
```
┌─────────────────────────────────────┐
│ ● Segment Name               [EA]  │
│   Description text here...         │
│                                    │
│   [👁 Focus] [🔗 Link]             │ ← Action buttons
└─────────────────────────────────────┘
```

**Edit Mode** (full only):
```
┌─────────────────────────────────────┐
│ [Input: Segment name]              │
│ [Textarea: Description...]         │
│                                    │
│ [Save] [Cancel]                    │
└─────────────────────────────────────┘
```

### Key Features

**Two Display Modes:**
- **Compact:** Single line, click to link, shows dot + name + EA badge + score
- **Full:** Multi-line with description, Focus/Link buttons, inline editing

**Color Indicator:**
- Dot color from `segment.colorHex` (if available)
- Fallback to priority-based color:
  - priorityScore >= 70: Green (healthy)
  - priorityScore >= 40: Amber (warning)
  - priorityScore < 40: Red (critical)

**Early Adopter Badge:**
- Show "EA" chip if `segment.earlyAdopterFlag === true`
- Green badge with emerald color

**Priority Score:**
- Numeric display (0-100) in compact mode
- Visual indicator (dot color) in full mode

**Inline Editing (Full Mode Only):**
- Click segment → enter edit mode
- Edit name and description
- Save/Cancel buttons
- ESC key cancels

**Actions (Full Mode Only):**
- **Focus button:** Opens segment in focus panel (expand view)
- **Link button:** Opens link picker to link segment to other blocks

### Component Structure

```typescript
"use client";

import { useState, forwardRef } from "react";
import type { Segment } from "@/lib/types/canvas";

export const SegmentCard = forwardRef<HTMLDivElement, SegmentCardProps>(
  function SegmentCard(
    { segment, mode, isEditing, onEdit, onSave, onCancel, onFocus, onLink, segmentRefCallback },
    ref
  ) {
    const [editName, setEditName] = useState(segment.name);
    const [editDesc, setEditDesc] = useState(segment.description || '');

    // Compute dot color
    const dotColor = segment.colorHex || (
      segment.priorityScore >= 70 ? 'var(--state-healthy)' :
      segment.priorityScore >= 40 ? 'var(--state-warning)' :
      'var(--state-critical)'
    );

    // Compact mode: single line button
    if (mode === 'compact') {
      return (
        <button
          ref={ref}
          className="flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors group/seg"
          onClick={onLink}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: dotColor }}
          />
          <span className="text-[10px] text-foreground-muted/70 group-hover/seg:text-foreground-muted truncate flex-1">
            {segment.name}
          </span>
          {segment.earlyAdopterFlag && (
            <span className="text-[8px] font-mono px-1 py-px rounded bg-emerald-400/10 text-emerald-400/70 shrink-0">
              EA
            </span>
          )}
          <span className="text-[9px] font-mono text-foreground-muted/40 shrink-0">
            {segment.priorityScore}
          </span>
        </button>
      );
    }

    // Full mode: multi-line card with edit state
    return (
      <div
        ref={ref}
        className="rounded-md border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
      >
        {isEditing ? (
          // Edit mode
          <div className="p-1.5 space-y-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground outline-none border border-white/12 focus:border-white/25"
              placeholder="Segment name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancel?.();
              }}
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full bg-white/5 rounded px-1.5 py-0.5 text-[10px] text-foreground-muted outline-none border border-white/12 focus:border-white/25 resize-none"
              placeholder="Description..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancel?.();
              }}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSave?.({ name: editName, description: editDesc })}
                className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-foreground hover:bg-white/12 transition-colors"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                className="text-[9px] px-1.5 py-0.5 rounded text-foreground-muted/50 hover:text-foreground-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // View mode
          <div className="p-1.5">
            <div className="flex items-start gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-[3px]"
                style={{ background: dotColor }}
              />
              <div className="flex-1 min-w-0">
                <button
                  onClick={onEdit}
                  className="text-[10px] font-medium text-foreground/80 hover:text-foreground text-left w-full truncate transition-colors"
                >
                  {segment.name}
                </button>
                {segment.description && (
                  <p className="text-[9px] text-foreground-muted/50 line-clamp-2 mt-0.5 leading-tight">
                    {segment.description}
                  </p>
                )}
              </div>
              {segment.earlyAdopterFlag && (
                <span className="text-[7px] font-mono px-1 py-px rounded bg-emerald-400/10 text-emerald-400/70 shrink-0">
                  EA
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
              <button
                onClick={onFocus}
                className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
                title="Open in focus view"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Focus
              </button>
              <button
                onClick={onLink}
                className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
                title="Link to other blocks"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Link
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
```

---

## BlockCell Integration

### Updated Props

**File:** `app/components/canvas/BlockCell.tsx`

```typescript
interface BlockCellProps {
  definition: BlockDefinition;
  mode: CanvasMode;
  value: string;         // Legacy text content (for migration, optional)
  state: BlockState;
  blocks?: BlockData[];  // NEW: array of atomic blocks for this blockType
  linkedSegments?: Segment[];
  allSegments?: Segment[];
  allBlockItems?: Map<BlockType, BlockData[]>;

  // Existing props
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onExpand: () => void;
  onAddToChat: () => void;
  onAnalyze: () => void;

  // Segment props (unchanged)
  onSegmentClick?: (segmentId: string) => void;
  onAddSegment?: (name: string, description?: string) => Promise<void>;
  onSegmentUpdate?: (segmentId: string, updates: Partial<Pick<Segment, "name" | "description">>) => Promise<void>;
  onSegmentFocus?: (segmentId: string) => void;

  // NEW: Block CRUD props
  onBlockCreate?: () => void;
  onBlockUpdate?: (blockId: string, updates: { contentJson: string }) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockToggleSegment?: (blockId: string, segmentId: string) => void;
  onBlockHover?: (blockId: string | null) => void;

  // Refs
  blockRefCallback?: (blockId: string, el: HTMLElement | null) => void;
  segmentRefCallback?: (segmentId: string, el: HTMLElement | null) => void;
}
```

### Key Changes

**1. Remove inline segment rendering (lines 486-731)**
   - Extract to `SegmentCard` component
   - Use `SegmentCard` with `mode="full"` for customer_segments block
   - Use `SegmentCard` with `mode="compact"` for segment sub-rows in other blocks

**2. Add block cards rendering**
   - Display `blocks` array using `BlockCard` components
   - Show "+ Add block" button if `onBlockCreate` provided
   - Handle block CRUD via new callback props

**3. Rendering logic**
```typescript
export function BlockCell({
  definition,
  blocks,
  linkedSegments,
  allSegments,
  allBlockItems,
  onBlockCreate,
  onBlockUpdate,
  onBlockDelete,
  onBlockToggleSegment,
  onBlockHover,
  ...
}) {
  const isSegmentBlock = definition.type === 'customer_segments';

  return (
    <div className="bmc-cell ...">
      {/* Header, actions, text content (unchanged) */}

      {/* Block cards - NEW */}
      {blocks && blocks.length > 0 && (
        <div className="block-items-container">
          {blocks.map(block => (
            <BlockCard
              key={block.$id}
              block={block}
              allSegments={allSegments ?? []}
              allBlockItems={allBlockItems}
              onUpdate={onBlockUpdate!}
              onDelete={onBlockDelete!}
              onSegmentToggle={onBlockToggleSegment!}
              onMouseEnter={() => onBlockHover?.(block.$id)}
              onMouseLeave={() => onBlockHover?.(null)}
            />
          ))}
          {onBlockCreate && (
            <button onClick={onBlockCreate} className="...">
              + Add block
            </button>
          )}
        </div>
      )}

      {/* Segments (customer_segments block) - UPDATED to use SegmentCard */}
      {isSegmentBlock && linkedSegments && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-1.5 space-y-1">
          {linkedSegments.map(seg => (
            <SegmentCard
              key={seg.$id}
              segment={seg}
              mode="full"
              isEditing={editingSegmentId === seg.$id}
              onEdit={() => setEditingSegmentId(seg.$id)}
              onSave={(updates) => handleSegmentSave(seg.$id, updates)}
              onCancel={() => setEditingSegmentId(null)}
              onFocus={() => onSegmentFocus?.(seg.$id)}
              onLink={() => onSegmentClick?.(seg.$id)}
              segmentRefCallback={(el) => segmentRefCallback?.(seg.$id, el)}
            />
          ))}
          {/* Add new segment button */}
        </div>
      )}

      {/* Segment sub-rows (non-segment blocks) - UPDATED to use SegmentCard */}
      {!isSegmentBlock && linkedSegments && linkedSegments.length > 0 && (
        <div className="px-2 pb-0.5 space-y-0.5">
          {linkedSegments.slice(0, 4).map(seg => (
            <SegmentCard
              key={seg.$id}
              segment={seg}
              mode="compact"
              onLink={() => onSegmentClick?.(seg.$id)}
              segmentRefCallback={(el) => segmentRefCallback?.(seg.$id, el)}
            />
          ))}
          {linkedSegments.length > 4 && (
            <span className="text-[9px] text-foreground-muted/40">
              +{linkedSegments.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Data Flow

### Parent Component (CanvasClient)

**Load blocks by blockType:**
```typescript
const loadBlocks = async (canvasId: string) => {
  const allBlocks = await serverTablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: BLOCKS_TABLE_ID,
    queries: [Query.equal('canvas', canvasId)]
  });

  // Group by blockType
  const blocksByType = new Map<BlockType, BlockData[]>();
  allBlocks.rows.forEach(block => {
    const existing = blocksByType.get(block.blockType) || [];
    blocksByType.set(block.blockType, [...existing, block]);
  });

  return blocksByType;
};
```

**Create new block:**
```typescript
const handleBlockCreate = async (blockType: BlockType) => {
  const newBlock = await serverTablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: BLOCKS_TABLE_ID,
    data: {
      canvas: canvasId,
      blockType,
      contentJson: JSON.stringify({ text: '', tags: [] }),
      confidenceScore: 0,
      riskScore: 0,
      state: 'calm'
    }
  });
  // Update local state: add to blocksByType[blockType]
};
```

**Update block:**
```typescript
const handleBlockUpdate = async (blockId: string, updates: { contentJson: string }) => {
  await serverTablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: BLOCKS_TABLE_ID,
    rowId: blockId,
    data: updates
  });
  // Update local state
};
```

**Delete block:**
```typescript
const handleBlockDelete = async (blockId: string) => {
  await serverTablesDB.deleteRow({
    databaseId: DATABASE_ID,
    tableId: BLOCKS_TABLE_ID,
    rowId: blockId
  });
  // Update local state: remove from blocksByType
};
```

**Toggle segment relationship:**
```typescript
const handleBlockToggleSegment = async (blockId: string, segmentId: string) => {
  // Appwrite manages M:M via relationship field
  // Check if segment already linked
  const block = findBlockById(blockId);
  const isLinked = block.segments.some(s => s.$id === segmentId);

  if (isLinked) {
    // Remove segment from relationship
    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      rowId: blockId,
      data: {
        segments: block.segments.filter(s => s.$id !== segmentId).map(s => s.$id)
      }
    });
  } else {
    // Add segment to relationship
    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      rowId: blockId,
      data: {
        segments: [...block.segments.map(s => s.$id), segmentId]
      }
    });
  }

  // Update local state
};
```

---

## Migration Strategy

### Phase 1: Create New Components (This Session)
1. ✅ Update types in `lib/types/canvas.ts`
2. ✅ Create `BlockCard.tsx` component
3. ✅ Create `SegmentCard.tsx` component
4. ✅ Update `BlockCell.tsx` props and rendering logic
5. ✅ Test new components in isolation

### Phase 2: Update Parent Integration (Next Session)
1. Update `CanvasClient.tsx` to load blocks by blockType
2. Implement block CRUD handlers
3. Pass new props to BlockCell
4. Test full data flow

### Phase 3: Cleanup (Future Session)
1. Delete `BlockItemCard.tsx` (replaced by BlockCard)
2. Remove legacy `value` prop from BlockCell (if unused)
3. Update all API routes to use new structure
4. Migration script for existing data (if needed)

---

## Files Summary

### Files to Create:
1. ✅ `app/components/canvas/BlockCard.tsx` - Atomic block card component
2. ✅ `app/components/canvas/SegmentCard.tsx` - Reusable segment display component

### Files to Modify:
1. ✅ `lib/types/canvas.ts` - Update BlockContent, remove BlockItem, update BlockData
2. ✅ `app/components/canvas/BlockCell.tsx` - Use new components, update props
3. ⏳ `app/canvas/[slug]/CanvasClient.tsx` - Load blocks, handle CRUD (next session)

### Files to Delete (after full migration):
1. ⏳ `app/components/canvas/BlockItemCard.tsx` - Replaced by BlockCard

---

## Design Decisions

### Why no backward compatibility in types?

**Decision:** Clean break - remove old fields entirely.

**Reasoning:**
- Hybrid approach adds complexity without clear benefit
- Old data structure is fundamentally incompatible with new architecture
- TypeScript errors guide migration (fail fast)
- Easier to reason about with single source of truth

### Why extract SegmentCard from BlockCell?

**Decision:** Create separate reusable component.

**Reasoning:**
- Reduces BlockCell complexity (currently 735 lines)
- Enables reuse in other contexts (focus panel, deep-dive modules)
- Cleaner separation of concerns
- Easier to test in isolation

### Why two modes for SegmentCard (compact/full)?

**Decision:** Single component with mode prop instead of two components.

**Reasoning:**
- Shared styling and behavior
- Avoids duplication
- Mode prop makes intent clear at usage site
- Easy to add third mode if needed

### Why autosave instead of explicit Save/Cancel?

**Decision:** Autosave with 500ms debounce for BlockCard text editing.

**Reasoning:**
- Modern UX pattern (Notion, Google Docs)
- Reduces friction
- ESC key still provides escape hatch
- Fewer clicks for users

### Cross-block relationships?

**Decision:** Remove `linkedItemIds` from old BlockItem structure. Cross-block relationships are implicit via shared segments.

**Reasoning:**
- Simpler mental model
- Segments already provide relationship graph
- Can add explicit block-to-block links later if needed
- MVP doesn't require it

---

## Success Criteria

After implementation:

1. ✅ BlockCard displays single atomic block with text, tags, segments, confidence
2. ✅ SegmentCard works in both compact and full modes
3. ✅ BlockCell renders blocks array using BlockCard
4. ✅ BlockCell renders segments using SegmentCard
5. ✅ All TypeScript errors resolved
6. ✅ Inline editing with autosave works smoothly
7. ✅ Segment linking updates M:M relationship correctly
8. ✅ Multiple blocks of same blockType can coexist
9. ✅ Delete with confirmation prevents accidents
10. ✅ Component is reusable across all block types

---

## Next Steps (Implementation Plan)

See separate implementation plan document (to be created via writing-plans skill).
