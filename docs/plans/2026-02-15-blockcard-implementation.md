# BlockCard Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign BlockItemCard to BlockCard, representing atomic block records with M:M segment relationships

**Architecture:** Each card is a separate row in blocks table. Remove items array from contentJson. Block relationships managed via Appwrite M:M relationships.

**Tech Stack:** React 19, TypeScript, Radix UI, Tailwind CSS, Appwrite TablesDB

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `lib/types/canvas.ts`

### Step 1: Update BlockContent interface

Remove `items` array, change to new structure:

```typescript
/** Content stored as JSON in contentJson column */
export interface BlockContent {
  text: string;      // Main content (multiline)
  tags?: string[];   // Optional categorization tags
}
```

**Location:** `lib/types/canvas.ts:17-22`
**Action:** Replace entire interface

### Step 2: Remove BlockItem interface

**Location:** `lib/types/canvas.ts:24-30`
**Action:** Delete entire interface (no longer needed - blocks are atomic now)

### Step 3: Mark BlockCard interface as deprecated

**Location:** `lib/types/canvas.ts:32-37`
**Action:** Add deprecation comment:

```typescript
/** @deprecated Legacy type, will be removed */
export interface BlockCard {
  $id: string;
  name: string;
  description?: string;
  order: number;
}
```

### Step 4: Update BlockData interface

**Location:** `lib/types/canvas.ts:84-95`
**Action:** Update to reflect new structure:

```typescript
export interface BlockData {
  $id: string;
  blockType: BlockType;
  contentJson: string; // JSON.stringify(BlockContent)
  confidenceScore: number; // 0-100
  riskScore: number; // 0-100
  segments: Segment[]; // Loaded from M:M relationship
  aiAnalysis: AIAnalysis | null;
  deepDiveData: MarketResearchData | null;
  lastUsage?: AIUsage | null;
}
```

### Step 5: Commit type changes

```bash
git add lib/types/canvas.ts
git commit -m "refactor(types): update BlockContent to atomic structure, remove BlockItem"
```

---

## Task 2: Create BlockCard Component (Basic Structure)

**Files:**
- Create: `app/components/canvas/BlockCard.tsx`
- Keep: `app/components/canvas/BlockItemCard.tsx` (will delete after migration)

### Step 1: Create new BlockCard component file

```typescript
"use client";

import { useState, useCallback, forwardRef } from "react";
import type { BlockType, Segment, BlockContent } from "@/lib/types/canvas";

interface BlockCardProps {
  block: {
    $id: string;
    blockType: BlockType;
    contentJson: string;
    confidenceScore: number;
    riskScore: number;
    segments: Segment[];
  };
  allSegments: Segment[];
  onUpdate: (blockId: string, updates: { contentJson: string }) => void;
  onDelete: (blockId: string) => void;
  onSegmentToggle: (blockId: string, segmentId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const BlockCard = forwardRef<HTMLDivElement, BlockCardProps>(
  function BlockCard(
    { block, allSegments, onUpdate, onDelete, onSegmentToggle, onMouseEnter, onMouseLeave },
    ref
  ) {
    // Parse contentJson with fallback
    const parseContent = (json: string): BlockContent => {
      try {
        return JSON.parse(json);
      } catch {
        return { text: json, tags: [] };
      }
    };

    const [content, setContent] = useState<BlockContent>(() => parseContent(block.contentJson));
    const [isEditing, setIsEditing] = useState(false);

    return (
      <div
        ref={ref}
        className="block-item-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="p-1.5">
          <div className="text-[10px] text-foreground/80">
            {content.text || "Enter block content..."}
          </div>
        </div>
      </div>
    );
  }
);
```

**Location:** Create `app/components/canvas/BlockCard.tsx`

### Step 2: Test basic rendering

Run dev server and verify component compiles:

```bash
npm run dev
```

Expected: No TypeScript errors

### Step 3: Commit basic structure

```bash
git add app/components/canvas/BlockCard.tsx
git commit -m "feat(components): create BlockCard component skeleton"
```

---

## Task 3: Implement Text Editing with Autosave

**Files:**
- Modify: `app/components/canvas/BlockCard.tsx`

### Step 1: Add edit state and handlers

Add after state declarations:

```typescript
const [editText, setEditText] = useState(content.text);
const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

// Autosave handler with 500ms debounce
const handleTextChange = useCallback((newText: string) => {
  setEditText(newText);

  // Clear existing timeout
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  // Set new timeout
  const timeoutId = setTimeout(() => {
    const updatedContent: BlockContent = {
      ...content,
      text: newText
    };
    setContent(updatedContent);
    onUpdate(block.$id, { contentJson: JSON.stringify(updatedContent) });
  }, 500);

  setSaveTimeoutId(timeoutId);
}, [block.$id, content, onUpdate, saveTimeoutId]);

// Cancel handler
const handleCancel = useCallback(() => {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }
  setEditText(content.text);
  setIsEditing(false);
}, [content.text, saveTimeoutId]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }
  };
}, [saveTimeoutId]);
```

### Step 2: Add edit mode UI

Replace the content div with:

```typescript
{isEditing ? (
  <textarea
    value={editText}
    onChange={(e) => handleTextChange(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Escape") handleCancel();
    }}
    onBlur={() => setIsEditing(false)}
    className="w-full bg-white/5 rounded px-1.5 py-1 text-[10px] text-foreground outline-none border border-white/12 focus:border-white/25 resize-none min-h-[40px]"
    placeholder="Enter block content..."
    autoFocus
    rows={3}
  />
) : (
  <button
    onClick={() => {
      setEditText(content.text);
      setIsEditing(true);
    }}
    className="w-full text-left text-[10px] text-foreground/80 hover:text-foreground transition-colors whitespace-pre-wrap"
  >
    {content.text || "Enter block content..."}
  </button>
)}
```

### Step 3: Add missing import

Add at top:

```typescript
import { useEffect } from "react";
```

### Step 4: Test editing manually

Run dev server, click text, verify:
- Textarea appears
- Typing works
- ESC cancels
- Click outside saves (after 500ms)

### Step 5: Commit text editing

```bash
git add app/components/canvas/BlockCard.tsx
git commit -m "feat(BlockCard): add inline text editing with autosave"
```

---

## Task 4: Add Tag Management

**Files:**
- Modify: `app/components/canvas/BlockCard.tsx`

### Step 1: Add tag state and handlers

Add after text edit handlers:

```typescript
const handleAddTag = useCallback((tag: string) => {
  if (!tag.trim()) return;
  const updatedContent: BlockContent = {
    ...content,
    tags: [...(content.tags || []), tag.trim()]
  };
  setContent(updatedContent);
  onUpdate(block.$id, { contentJson: JSON.stringify(updatedContent) });
}, [block.$id, content, onUpdate]);

const handleRemoveTag = useCallback((index: number) => {
  const updatedContent: BlockContent = {
    ...content,
    tags: content.tags?.filter((_, i) => i !== index) || []
  };
  setContent(updatedContent);
  onUpdate(block.$id, { contentJson: JSON.stringify(updatedContent) });
}, [block.$id, content, onUpdate]);
```

### Step 2: Add tag input state

```typescript
const [isAddingTag, setIsAddingTag] = useState(false);
const [newTagInput, setNewTagInput] = useState("");
```

### Step 3: Add tags UI

Add after text editing section:

```typescript
{/* Tags */}
{(content.tags && content.tags.length > 0) || isAddingTag ? (
  <div className="flex items-center gap-1 mt-1 flex-wrap">
    {content.tags?.map((tag, idx) => (
      <span
        key={idx}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-white/8 text-foreground-muted"
      >
        {tag}
        <button
          onClick={() => handleRemoveTag(idx)}
          className="hover:text-foreground transition-colors"
        >
          ×
        </button>
      </span>
    ))}
    {isAddingTag ? (
      <input
        value={newTagInput}
        onChange={(e) => setNewTagInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && newTagInput.trim()) {
            handleAddTag(newTagInput);
            setNewTagInput("");
            setIsAddingTag(false);
          }
          if (e.key === "Escape") {
            setNewTagInput("");
            setIsAddingTag(false);
          }
        }}
        onBlur={() => {
          if (newTagInput.trim()) {
            handleAddTag(newTagInput);
          }
          setNewTagInput("");
          setIsAddingTag(false);
        }}
        className="w-16 bg-white/5 rounded px-1 py-0.5 text-[8px] text-foreground outline-none border border-white/12"
        placeholder="tag"
        autoFocus
      />
    ) : (
      <button
        onClick={() => setIsAddingTag(true)}
        className="text-[8px] px-1 py-0.5 rounded text-foreground-muted/40 hover:text-foreground-muted hover:bg-white/5 transition-colors"
      >
        + tag
      </button>
    )}
  </div>
) : (
  <button
    onClick={() => setIsAddingTag(true)}
    className="text-[8px] px-1 py-0.5 rounded text-foreground-muted/40 hover:text-foreground-muted hover:bg-white/5 transition-colors mt-1"
  >
    + tag
  </button>
)}
```

### Step 4: Test tag management

Verify:
- Click "+ tag" shows input
- Enter saves tag
- ESC cancels
- Click × removes tag

### Step 5: Commit tag management

```bash
git add app/components/canvas/BlockCard.tsx
git commit -m "feat(BlockCard): add tag management with add/remove"
```

---

## Task 5: Add Segment Badges and Confidence Display

**Files:**
- Modify: `app/components/canvas/BlockCard.tsx`

### Step 1: Add segment badges UI

Add after tags section:

```typescript
{/* Footer: Segments, Confidence, Actions */}
<div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-white/5">
  {/* Segment color badges */}
  {block.segments && block.segments.length > 0 && (
    <div className="flex items-center gap-0.5 shrink-0">
      {block.segments.slice(0, 3).map((seg) => (
        <span
          key={seg.$id}
          className="segment-badge"
          style={{ background: seg.colorHex ?? "#6366f1" }}
          title={seg.name}
        />
      ))}
      {block.segments.length > 3 && (
        <span className="text-[7px] text-foreground-muted/40">
          +{block.segments.length - 3}
        </span>
      )}
    </div>
  )}

  {/* Confidence score */}
  {block.confidenceScore > 0 && (
    <span
      className="text-[7px] font-mono px-1 py-px rounded bg-green-400/10 text-green-400/70 shrink-0"
      title={`Confidence: ${block.confidenceScore}%`}
    >
      {Math.round(block.confidenceScore)}%
    </span>
  )}
</div>
```

### Step 2: Add segment-badge CSS class

Check if exists in `app/globals.css`, if not add:

```css
.segment-badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
```

**Location:** `app/globals.css` (check if already exists)

### Step 3: Test visual display

Verify segments show as colored dots and confidence appears as percentage.

### Step 4: Commit visual elements

```bash
git add app/components/canvas/BlockCard.tsx
git commit -m "feat(BlockCard): add segment badges and confidence display"
```

---

## Task 6: Add Link and Delete Buttons

**Files:**
- Modify: `app/components/canvas/BlockCard.tsx`

### Step 1: Add delete confirmation state

```typescript
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

### Step 2: Add link picker state

```typescript
const [showLinkPicker, setShowLinkPicker] = useState(false);
```

### Step 3: Add action buttons UI

Add to footer section (after confidence):

```typescript
  <div className="flex-1" />

  {/* Link button */}
  <button
    onClick={() => setShowLinkPicker(!showLinkPicker)}
    className="flex items-center gap-1 text-[9px] text-foreground-muted/40 hover:text-foreground-muted transition-colors px-1 py-0.5 rounded hover:bg-white/5"
    title="Link to segments"
  >
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
    Link
  </button>

  {/* Delete button */}
  <button
    onClick={() => setShowDeleteConfirm(true)}
    className="text-[9px] text-red-400/40 hover:text-red-400 transition-colors px-1 py-0.5 rounded hover:bg-red-400/5"
    title="Delete block"
  >
    ×
  </button>
```

### Step 4: Add delete confirmation modal

Add after main content div:

```typescript
{/* Delete Confirmation Modal */}
{showDeleteConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-[#1a1a1f] border border-white/12 rounded-lg p-4 max-w-sm">
      <h3 className="text-sm font-medium text-foreground mb-2">Delete Block?</h3>
      <p className="text-xs text-foreground-muted mb-4">
        This action cannot be undone.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowDeleteConfirm(false)}
          className="px-3 py-1 text-xs rounded bg-white/5 text-foreground hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onDelete(block.$id);
            setShowDeleteConfirm(false);
          }}
          className="px-3 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 5: Test buttons

Verify:
- Link button exists (functionality in next task)
- Delete shows modal
- Cancel closes modal
- Delete calls onDelete

### Step 6: Commit buttons

```bash
git add app/components/canvas/BlockCard.tsx
git commit -m "feat(BlockCard): add link and delete buttons with confirmation"
```

---

## Task 7: Integrate LinkPicker for Segments

**Files:**
- Modify: `app/components/canvas/BlockCard.tsx`
- Modify: `app/components/canvas/LinkPicker.tsx`

### Step 1: Import LinkPicker

Add to imports:

```typescript
import { LinkPicker } from "./LinkPicker";
```

### Step 2: Add LinkPicker in render

Add after delete modal:

```typescript
{/* Link Picker for Segments */}
{showLinkPicker && (
  <div className="relative">
    <LinkPicker
      currentSegmentIds={block.segments.map(s => s.$id)}
      allSegments={allSegments}
      onToggleSegment={(segmentId) => {
        onSegmentToggle(block.$id, segmentId);
      }}
      onClose={() => setShowLinkPicker(false)}
    />
  </div>
)}
```

### Step 3: Update LinkPicker props interface

**File:** `app/components/canvas/LinkPicker.tsx`

Update interface to simpler version:

```typescript
interface LinkPickerProps {
  currentSegmentIds: string[];
  allSegments: Segment[];
  onToggleSegment: (segmentId: string) => void;
  onClose: () => void;
}
```

### Step 4: Simplify LinkPicker component

Remove blockType, allBlockItems, item props. Keep only segment tab. Update to:

```typescript
export function LinkPicker({
  currentSegmentIds,
  allSegments,
  onToggleSegment,
  onClose,
}: LinkPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 w-52 rounded-lg border border-white/12 bg-[#1a1a1f] shadow-xl shadow-black/40"
      style={{ bottom: "100%", left: 0, marginBottom: 4 }}
    >
      <div className="p-2 max-h-64 overflow-y-auto">
        <div className="text-[9px] text-foreground-muted/50 mb-1.5 px-1">
          Segments
        </div>
        {allSegments.length === 0 ? (
          <div className="text-[9px] text-foreground-muted/30 px-1 py-2">
            No segments available
          </div>
        ) : (
          allSegments.map((seg) => {
            const isLinked = currentSegmentIds.includes(seg.$id);
            return (
              <button
                key={seg.$id}
                onClick={() => onToggleSegment(seg.$id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isLinked}
                  onChange={() => {}}
                  className="w-3 h-3 rounded border border-white/20"
                />
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: seg.colorHex ?? "#6366f1" }}
                />
                <span className="text-[10px] text-foreground truncate flex-1 text-left">
                  {seg.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
```

### Step 5: Test LinkPicker integration

Verify:
- Click Link opens popover
- Checkboxes reflect current segments
- Toggle calls onSegmentToggle
- Click outside closes

### Step 6: Commit LinkPicker integration

```bash
git add app/components/canvas/BlockCard.tsx app/components/canvas/LinkPicker.tsx
git commit -m "feat(BlockCard): integrate simplified LinkPicker for segments"
```

---

## Task 8: Update BlockCell to Use BlockCard

**Files:**
- Modify: `app/components/canvas/BlockCell.tsx`

### Step 1: Import new BlockCard

Update import:

```typescript
import { BlockCard } from "./BlockCard";
```

### Step 2: Update BlockCell to render multiple blocks

Current BlockCell likely expects one block per blockType. Update to handle multiple blocks:

**Find the section that renders BlockItemCard** (around line 438-469).

**Replace with:**

```typescript
{/* Block cards - multiple blocks per blockType */}
{blocks?.map((block) => (
  <div key={block.$id} className="relative">
    <BlockCard
      ref={(el) => {
        itemRefCallback?.(`${definition.type}:${block.$id}`, el);
      }}
      block={block}
      allSegments={allSegments ?? []}
      onUpdate={(blockId, updates) => onBlockUpdate?.(blockId, updates)}
      onDelete={(blockId) => onBlockDelete?.(blockId)}
      onSegmentToggle={(blockId, segmentId) =>
        onBlockSegmentToggle?.(blockId, segmentId)
      }
      onMouseEnter={() => onBlockHover?.(block.$id)}
      onMouseLeave={() => onBlockHover?.(null)}
    />
  </div>
))}
```

### Step 3: Update BlockCell props interface

Add/update callback props:

```typescript
interface BlockCellProps {
  // ... existing props
  blocks?: Array<{
    $id: string;
    blockType: BlockType;
    contentJson: string;
    confidenceScore: number;
    riskScore: number;
    segments: Segment[];
  }>;
  onBlockUpdate?: (blockId: string, updates: { contentJson: string }) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockSegmentToggle?: (blockId: string, segmentId: string) => void;
  onBlockHover?: (blockId: string | null) => void;
}
```

### Step 4: Remove old item-related code

Search for and remove:
- `onItemUpdate`, `onItemDelete`, `onItemToggleSegment`, `onItemToggleLink`
- Old BlockItemCard rendering logic
- Item state management

### Step 5: Test manually

Run dev server, verify:
- Blocks render correctly
- Multiple blocks of same type can coexist
- All interactions work

### Step 6: Commit BlockCell updates

```bash
git add app/components/canvas/BlockCell.tsx
git commit -m "refactor(BlockCell): migrate from BlockItemCard to BlockCard"
```

---

## Task 9: Update Parent Canvas Component

**Files:**
- Modify: `app/canvas/[slug]/CanvasClient.tsx` (or wherever blocks are fetched)

### Step 1: Update data fetching to load blocks

Find where blocks are fetched. Update to load multiple blocks per type:

```typescript
// Fetch all blocks for this canvas
const blocksResponse = await serverTablesDB.listRows({
  databaseId: DATABASE_ID,
  tableId: BLOCKS_TABLE_ID,
  queries: [Query.equal('canvas', canvasId)]
});

// Group by blockType
const blocksByType = blocksResponse.rows.reduce((acc, block) => {
  const type = block.blockType;
  if (!acc[type]) acc[type] = [];
  acc[type].push(block);
  return acc;
}, {} as Record<BlockType, any[]>);
```

### Step 2: Update block update handler

```typescript
const handleBlockUpdate = async (blockId: string, updates: { contentJson: string }) => {
  try {
    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      rowId: blockId,
      data: updates
    });
    // Refresh or optimistically update state
  } catch (error) {
    console.error('Failed to update block:', error);
    // Show error toast
  }
};
```

### Step 3: Update segment toggle handler

```typescript
const handleSegmentToggle = async (blockId: string, segmentId: string) => {
  try {
    // Appwrite handles M:M relationship
    // Get current block
    const block = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      rowId: blockId
    });

    const currentSegmentIds = block.segments?.map(s => s.$id) || [];
    const isLinked = currentSegmentIds.includes(segmentId);

    // Toggle: add or remove
    const updatedSegmentIds = isLinked
      ? currentSegmentIds.filter(id => id !== segmentId)
      : [...currentSegmentIds, segmentId];

    await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      rowId: blockId,
      data: { segments: updatedSegmentIds }
    });

    // Refresh state
  } catch (error) {
    console.error('Failed to toggle segment:', error);
  }
};
```

### Step 4: Update delete handler

```typescript
const handleBlockDelete = async (blockId: string) => {
  try {
    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      rowId: blockId
    });
    // Refresh or optimistically update state
  } catch (error) {
    console.error('Failed to delete block:', error);
  }
};
```

### Step 5: Pass handlers to BlockCell

```typescript
<BlockCell
  blocks={blocksByType[blockType]}
  onBlockUpdate={handleBlockUpdate}
  onBlockDelete={handleBlockDelete}
  onBlockSegmentToggle={handleSegmentToggle}
  // ... other props
/>
```

### Step 6: Test full flow

Verify:
- Blocks load from database
- Editing saves to database
- Segment toggling updates relationships
- Delete removes from database

### Step 7: Commit canvas integration

```bash
git add app/canvas/[slug]/CanvasClient.tsx
git commit -m "refactor(canvas): integrate BlockCard with Appwrite M:M relationships"
```

---

## Task 10: Cleanup Old Code

**Files:**
- Delete: `app/components/canvas/BlockItemCard.tsx`
- Search: Remove all references to old types

### Step 1: Delete old component

```bash
git rm app/components/canvas/BlockItemCard.tsx
```

### Step 2: Search for remaining BlockItem references

```bash
grep -r "BlockItem" app/ lib/ --include="*.ts" --include="*.tsx"
```

Remove or update any remaining references.

### Step 3: Remove deprecated BlockCard type from canvas.ts

**File:** `lib/types/canvas.ts:32-37`
**Action:** Delete entire interface

### Step 4: Final verification

Run TypeScript check:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 5: Run build

```bash
npm run build
```

Expected: Successful build

### Step 6: Commit cleanup

```bash
git add -A
git commit -m "refactor: remove legacy BlockItemCard and unused types"
```

---

## Task 11: Manual Testing Checklist

**Test these scenarios:**

### Text Editing
- [ ] Click text, enters edit mode
- [ ] Type, autosaves after 500ms
- [ ] ESC cancels edits
- [ ] Click outside saves
- [ ] Empty text shows placeholder

### Tags
- [ ] Click "+ tag" shows input
- [ ] Enter saves tag
- [ ] ESC cancels tag input
- [ ] Click × removes tag
- [ ] Multiple tags work

### Segments
- [ ] Click Link opens picker
- [ ] Segments show as checkboxes
- [ ] Toggle updates relationship
- [ ] Segment badges show colors
- [ ] Badge count shows correctly

### Delete
- [ ] Click × shows modal
- [ ] Cancel closes modal
- [ ] Delete removes block
- [ ] Block disappears from UI

### Multiple Blocks
- [ ] Multiple blocks of same type render
- [ ] Each block editable independently
- [ ] Each block has own segments

### Confidence
- [ ] Confidence % displays
- [ ] Updates when score changes

---

## Success Criteria

- ✅ BlockCard component renders single block
- ✅ Text editing with autosave works
- ✅ Tag management works
- ✅ Segment linking via M:M relationship works
- ✅ Delete with confirmation works
- ✅ Multiple blocks per blockType supported
- ✅ Old BlockItemCard removed
- ✅ TypeScript compiles without errors
- ✅ Build succeeds

---

## Notes

**Key differences from old design:**
- Each card = separate block row (not item in JSON)
- Segments = M:M relationship (not array in JSON)
- contentJson = { text, tags } (not { bmc, lean, items })
- No cross-block item links (implicit via shared segments)

**Migration:**
- Old contentJson with items should be migrated to separate blocks
- Can be done gradually or with migration script
- Both old and new can coexist during transition

**Future enhancements:**
- Drag and drop reordering
- Bulk actions (delete multiple, link multiple)
- Undo/redo for edits
- Real-time collaboration
