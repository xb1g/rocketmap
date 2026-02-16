# Mobile Canvas Experience - Design Plan

## Context

RocketMap currently has a desktop-first canvas implementation with a fixed 10-column BMC grid and resizable sidebar focus panel. On mobile devices, this layout becomes unusable - the grid is too dense, the sidebar overlaps content, and navigation is unclear.

This design creates an exceptional mobile experience that:
- **Maintains Value Propositions as the always-visible anchor** (center of the business model)
- **Splits canvas into left (resources) and right (customers)** sections with VP as the pivot
- **Uses horizontal swipe navigation** between sections (natural mobile gesture)
- **Opens focus content in adaptive bottom sheet** that shows focused block on top
- **Scales gracefully** from portrait phones (375px) to tablets (1024px)

User requirements:
1. Canvas should split: Partnerships→Value | Value→Customer (VP always visible)
2. Focus panel becomes bottom sheet modal with focused block visible on top
3. Bottom sheet is adaptive height (starts 60%, expandable to full screen)
4. Horizontal swipe between sections for navigation

## Design Overview

### Mobile Layout Architecture (< 768px)

```
┌─────────────────────────────────────────────────┐
│  Toolbar (compact: back icon, title, actions)  │
├─────────────────────────────────────────────────┤
│  Section Indicators (• ◦ ◦) [swipeable]        │
├─────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐     │
│ │ Section 1 │ │ Section 2 │ │ Section 3 │     │
│ │           │ │           │ │           │     │
│ │ KP        │ │    VP     │ │    CS     │     │
│ │ KA        │ │ (ANCHOR)  │ │    CH     │     │
│ │ KR        │ │           │ │    CR     │     │
│ │           │ │           │ │    RS     │     │
│ │           │ │           │ │    C$     │     │
│ └───────────┘ └───────────┘ └───────────┘     │
│  ← swipe left/right, snap to section →        │
└─────────────────────────────────────────────────┘

When block tapped:
┌─────────────────────────────────────────────────┐
│  Dimmed canvas with focused block highlighted   │
│  ┌───────────┐                                  │
│  │ Focused   │ ← scaled up slightly             │
│  │ Block     │                                  │
│  └───────────┘                                  │
├─────────────────────────────────────────────────┤ ← drag handle
│ ╔═══════════════════════════════════════════╗ │
│ ║ Bottom Sheet (60% initial, 100% expanded)║ │
│ ║                                            ║ │
│ ║ • Segments (if applicable)                ║ │
│ ║ • Content/analysis                        ║ │
│ ║ • Chat section                            ║ │
│ ║                                            ║ │
│ ║ [Expand to Full Screen button]            ║ │
│ ╚═══════════════════════════════════════════╝ │
└─────────────────────────────────────────────────┘
```

### Section Distribution

**Section 1 (Left - Resources & Activities):**
- Key Partnerships (top)
- Key Activities (middle)
- Key Resources (bottom)

**Section 2 (Center - Value Anchor):**
- Value Propositions (solo, always visible)

**Section 3 (Right - Customers & Revenue):**
- Customer Segments (top)
- Channels (second)
- Customer Relationships (third)
- Revenue Streams (fourth)
- Cost Structure (bottom)

## Technical Implementation

### 1. Responsive Breakpoints

```typescript
// Mobile breakpoints
const BREAKPOINTS = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)'
};
```

**Behavior by breakpoint:**
- `mobile` (< 768px): Horizontal carousel + bottom sheet
- `tablet` (768-1023px): Hybrid (2-column grid or side-by-side panels, TBD)
- `desktop` (1024px+): Existing 10-column grid + sidebar

### 2. Canvas Carousel Component

**New component: `MobileCanvasCarousel.tsx`**

```typescript
interface Section {
  id: 'left' | 'center' | 'right';
  blocks: BlockType[];
  title: string;
}

const sections: Section[] = [
  {
    id: 'left',
    blocks: ['key_partnerships', 'key_activities', 'key_resources'],
    title: 'Resources'
  },
  {
    id: 'center',
    blocks: ['value_propositions'],
    title: 'Value'
  },
  {
    id: 'right',
    blocks: ['customer_segments', 'channels', 'customer_relationships',
             'revenue_streams', 'cost_structure'],
    title: 'Customers'
  }
];
```

**Scroll behavior:**
- CSS scroll-snap-type: `x mandatory`
- scroll-snap-align: `center` on each section
- Smooth scroll with momentum
- Section indicators (dots) above carousel
- Touch gestures handled by native browser scroll

**Implementation approach:**
```tsx
<div className="carousel-container">
  <div className="section-indicators">
    {sections.map((s, i) => (
      <button
        className={currentSection === i ? 'active' : ''}
        onClick={() => scrollToSection(i)}
      >
        {s.title}
      </button>
    ))}
  </div>

  <div className="carousel-scroll" ref={scrollRef}>
    {sections.map(section => (
      <div className="carousel-section" key={section.id}>
        {section.blocks.map(blockType => (
          <BlockCell
            blockType={blockType}
            onTap={() => openFocusSheet(blockType)}
          />
        ))}
      </div>
    ))}
  </div>
</div>
```

### 3. Adaptive Bottom Sheet Component

**New component: `MobileFocusSheet.tsx`**

**Sheet states:**
1. **Collapsed (60% height):** Shows segments + top of content, canvas visible behind
2. **Expanded (100% height):** Full-screen, hides canvas entirely
3. **Dismissed:** Closed, returns to carousel

**Sheet behavior:**
- Slides up from bottom with spring animation (300ms ease-out)
- Drag handle at top (visual affordance)
- Swipe down to dismiss (velocity threshold: 0.5)
- Drag handle to expand/collapse
- Backdrop dims canvas (rgba(0,0,0,0.6))
- Focused block on canvas gets `.mobile-focused` class (scale: 1.05, glow)

**Implementation approach:**
```tsx
<AnimatePresence>
  {focusedBlock && (
    <>
      {/* Backdrop */}
      <motion.div
        className="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeSheet}
      />

      {/* Sheet */}
      <motion.div
        className="focus-sheet"
        initial={{ y: '100%' }}
        animate={{ y: sheetExpanded ? 0 : '40%' }}
        exit={{ y: '100%' }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <div className="drag-handle" />

        <div className="sheet-content">
          {/* Render BlockFocusPanel content here */}
          <BlockFocusPanel
            blockType={focusedBlock}
            mode="mobile"
          />
        </div>

        <button onClick={() => setSheetExpanded(true)}>
          Expand to Full Screen
        </button>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### 4. Responsive Toolbar

**Mobile toolbar adaptations (< 768px):**
- Back button: Icon only (←)
- Title: Truncate with ellipsis at 20 chars
- Settings: Icon only (⚙️)
- Mode toggle: Hidden on mobile (or icon-only in overflow menu)
- Convert button: Moved to overflow menu (⋮)

**Toolbar layout:**
```tsx
// Desktop: [← Back] [Title] [Settings] [BMC/Lean toggle] [Convert]
// Mobile:  [←] [Title...] [⚙️] [⋮]
```

### 5. Block Cell Adaptations

**Mobile block sizing:**
- Section width: 100vw - 32px (16px padding each side)
- Block cell height: `auto` (content-driven, min 120px)
- Gap between blocks in section: 12px vertical
- Font size: Responsive via existing `--canvas-font-zoom` (clamp at 0.9-1.1 for mobile)

**Block state visual feedback:**
- Normal: Muted gray chromatic border
- Focused: Scale 1.05 + `.glow-ai` class
- Warning/Critical: Existing state colors maintained

### 6. CSS Changes

**New CSS classes (globals.css):**

```css
/* Mobile carousel */
.carousel-container {
  @apply relative h-full overflow-hidden;
}

.carousel-scroll {
  @apply flex overflow-x-auto snap-x snap-mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.carousel-section {
  @apply flex-none w-full snap-center px-4 py-6 flex flex-col gap-3;
  min-width: 100vw;
}

.section-indicators {
  @apply flex justify-center gap-2 py-3;
}

.section-indicator {
  @apply w-2 h-2 rounded-full bg-gray-500 transition-all;
}

.section-indicator.active {
  @apply bg-iris-400 w-6;
}

/* Mobile focus sheet */
.sheet-backdrop {
  @apply fixed inset-0 bg-black/60 z-40;
}

.focus-sheet {
  @apply fixed inset-x-0 bottom-0 z-50 bg-gray-900 rounded-t-3xl;
  max-height: 100vh;
}

.drag-handle {
  @apply mx-auto w-12 h-1 bg-gray-600 rounded-full my-3;
}

.mobile-focused {
  @apply scale-105 transition-transform;
  box-shadow: 0 0 24px var(--state-ai-glow);
}

/* Hide desktop-only elements on mobile */
@media (max-width: 767px) {
  .desktop-only {
    @apply hidden;
  }
}
```

### 7. State Management

**New mobile state in CanvasClient:**
```typescript
const [isMobile, setIsMobile] = useState(false);
const [currentSection, setCurrentSection] = useState<0 | 1 | 2>(1); // Start at VP
const [focusedBlock, setFocusedBlock] = useState<BlockType | null>(null);
const [sheetExpanded, setSheetExpanded] = useState(false);

useEffect(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  setIsMobile(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

**Interaction flow:**
1. User swipes carousel → `currentSection` updates → scroll snaps to section
2. User taps block → `focusedBlock` set → sheet slides up → canvas block scales
3. User drags sheet down → velocity check → dismiss if > threshold
4. User taps backdrop → `focusedBlock` = null → sheet slides down

## Files to Create

1. **app/canvas/[slug]/MobileCanvasCarousel.tsx** (new)
   - Carousel container with 3 sections
   - Scroll snap logic
   - Section indicators
   - Block cells rendered vertically per section

2. **app/components/canvas/MobileFocusSheet.tsx** (new)
   - Bottom sheet with framer-motion animations
   - Drag-to-dismiss logic
   - Adaptive height (60% / 100%)
   - Renders BlockFocusPanel content in mobile mode

## Files to Modify

1. **app/canvas/[slug]/CanvasClient.tsx**
   - Add mobile breakpoint detection (< 768px)
   - Conditional render: desktop BMCGrid vs MobileCanvasCarousel
   - Pass mobile state to child components
   - Handle focusedBlock state for mobile sheet

2. **app/components/canvas/BMCGrid.tsx**
   - Wrap in conditional: only render on desktop/tablet
   - Add `className="desktop-only"` for fallback hiding

3. **app/components/canvas/BlockFocusPanel.tsx**
   - Accept `mode?: 'desktop' | 'mobile'` prop
   - When `mode="mobile"`: remove resize handle, adjust padding
   - Render content-only (no backdrop, handled by sheet)

4. **app/components/canvas/CanvasToolbar.tsx**
   - Add responsive classes: hide mode toggle on mobile
   - Truncate title on mobile (max 20 chars)
   - Move "Convert" to overflow menu on mobile

5. **app/components/canvas/BlockCell.tsx**
   - Accept `onTap?: () => void` prop for mobile
   - On mobile: onClick → onTap instead of setFocusedBlock
   - Mobile styling: larger tap targets, adjusted font sizes

6. **app/globals.css**
   - Add carousel CSS classes
   - Add focus-sheet CSS classes
   - Add mobile-focused block styles
   - Add desktop-only media query

## Design System Alignment

**Typography:**
- Mobile blocks: Crimson Text 600 for block titles (14-16px via zoom)
- Sheet content: Lexend Deca for body text (13-14px)
- Toolbar: Lexend Deca 500 for labels (12px)

**Colors:**
- Sheet background: `var(--gray-surface)` (#18181B)
- Backdrop: rgba(0, 0, 0, 0.6)
- Focused block glow: `var(--state-ai-glow)` (cyan-purple)
- Section indicators: active `var(--iris-400)`, inactive `var(--gray-500)`

**Animations:**
- Sheet slide-up: 300ms ease-out spring
- Focused block scale: 200ms ease-out
- Backdrop fade: 200ms ease-out
- Carousel scroll: smooth with momentum (native)

**Spacing:**
- Mobile padding: 16px (vs 20px desktop)
- Block gaps in section: 12px vertical
- Sheet border-radius: 24px top corners
- Drag handle: 48px wide, 4px tall, 12px margin-top

## Accessibility

1. **Keyboard navigation:**
   - Arrow keys navigate between sections
   - Tab cycles through blocks in current section
   - Enter opens focus sheet
   - Escape closes sheet

2. **Screen reader:**
   - Announce section changes: "Showing Resources section (1 of 3)"
   - Announce sheet state: "Focus panel expanded" / "Focus panel collapsed"
   - Label drag handle: "Drag to resize panel"

3. **Touch targets:**
   - Minimum 44x44px for block cells on mobile
   - Section indicators: 48x48px touch area
   - Drag handle: 48px tall touch area

## Verification Steps

After implementation:

1. **Mobile carousel:**
   - [ ] Swipe left/right navigates between sections
   - [ ] Scroll snaps to section center
   - [ ] Section indicators update on scroll
   - [ ] VP section always visible in center position
   - [ ] Blocks render correctly in vertical stacks per section

2. **Focus sheet:**
   - [ ] Tapping block opens sheet at 60% height
   - [ ] Focused block scales up and glows on canvas
   - [ ] Backdrop dims canvas behind sheet
   - [ ] Drag handle expands/collapses sheet
   - [ ] Swipe down dismisses sheet (velocity check)
   - [ ] "Expand to Full Screen" button works
   - [ ] Sheet content renders BlockFocusPanel correctly

3. **Responsive behavior:**
   - [ ] Desktop (≥1024px): Shows existing BMCGrid + sidebar
   - [ ] Mobile (<768px): Shows carousel + bottom sheet
   - [ ] Toolbar adapts correctly (icons only, truncated title)
   - [ ] Font zoom applies correctly on mobile

4. **Interactions:**
   - [ ] Deep-dive still works from mobile sheet
   - [ ] Chat section accessible in mobile sheet
   - [ ] Analysis section renders in mobile sheet
   - [ ] Mode toggle (BMC/Lean) works on mobile

5. **Performance:**
   - [ ] Carousel scroll is smooth (60fps)
   - [ ] Sheet animations don't jank
   - [ ] No layout shift when opening/closing sheet
   - [ ] Canvas re-render is efficient on section change
