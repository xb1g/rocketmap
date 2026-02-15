# RocketMap Design Guidelines

**Last Updated:** 2026-02-14
**Status:** Living document - update after each design iteration

---

## Table of Contents

1. [Typography System](#typography-system)
2. [Color System](#color-system)
3. [Component Architecture](#component-architecture)
4. [State & Interaction Patterns](#state--interaction-patterns)
5. [AI Agent Requirements](#ai-agent-requirements)
6. [Design Validation Checklist](#design-validation-checklist)

---

## Typography System

### Font Stack (CANONICAL)

**⚠️ CRITICAL: These are the ONLY fonts allowed in RocketMap**

| Usage               | Font         | Weight        | Sizes     | CSS Variable          |
| ------------------- | ------------ | ------------- | --------- | --------------------- |
| **Body Text**       | Lexend Deca  | 400           | 12px–16px | `var(--font-body)`    |
| **Headings/Titles** | Crimson Text | 400, 600, 700 | 24px–48px | `var(--font-display)` |
| **Monospace/Data**  | Geist Mono   | 400, 500      | 10px–14px | `var(--font-mono)`    |

### Font Loading (Next.js)

```tsx
// ✅ CORRECT - from app/layout.tsx
import { Lexend_Deca, Crimson_Text, Geist_Mono } from "next/font/google";

const lexendDeca = Lexend_Deca({ variable: "--font-body", subsets: ["latin"] });
const crimsonText = Crimson_Text({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
```

### Usage Rules

#### Body Text (Lexend Deca)

- **Default:** `font-family: var(--font-body)`
- **When:** Description text, UI labels, microcopy, form inputs
- **Weight:** 400 (regular)
- **Size:** 12px (small), 14px (standard), 16px (large)
- **Line Height:** 1.5–1.6
- **Example:** "Enter your startup idea"

#### Display/Headings (Crimson Text)

- **Default:** `font-family: var(--font-display)`
- **CSS Class:** `.font-display`
- **When:** Page titles, section headings, brand name, canvas block titles
- **Weights (Size-Dependent):**
  - **Logo/Brand:** 700 (bold) – Logotype, brand text, logo mark
  - **<20px:** 500–700 (semibold to bold) – Small headings, labels, tabs
  - **20–32px:** 500 (semibold) – Section headings, block titles
  - **>32px:** 400–500 (regular to semibold) – Hero titles, emphasis
- **Size:** 14px (small label, bold), 24px (section), 32px (page), 48px (hero)
- **Line Height:** 1.2
- **Letter Spacing:** -0.02em (for elegance)
- **Example:** "Business Model Canvas" (32px, weight 500)
- **Small Label Example:** "Customer Segments" (14px, weight 700)
- **Logo Example:** "RocketMap" (weight 700, display font)

#### Monospace Data (Geist Mono)

- **Default:** `font-family: var(--font-mono)`
- **CSS Class:** `.font-mono`
- **When:** Code, metrics, identifiers, timestamps, versioning
- **Weight:** 400–500
- **Size:** 10px–12px
- **Example:** `v1.0` or `$2.5M TAM`

### CSS Classes (Apply These)

```css
.font-body {
  font-family: var(--font-body), system-ui, sans-serif;
}
.font-display {
  font-family: var(--font-display), Georgia, serif;
}
.font-display-small {
  font-family: var(--font-display), Georgia, serif;
  font-weight: 600;
  font-size: 14px;
}
.font-mono {
  font-family: var(--font-mono), monospace;
}
```

**Usage:**

- `.font-display` for large headings (>20px)
- `.font-display-small` for small labels/titles (<20px) – automatically bolds
- `.font-body` for regular text
- `.font-mono` for data/metrics

### ANTI-PATTERNS ❌

❌ Mix fonts arbitrarily (don't use random Google Fonts)
❌ Use system fonts directly (always use CSS variables)
❌ Apply display font to body text or vice versa
❌ Use weights outside the specified range per font
❌ Ignore line-height in multi-line text

---

## Color System

### State-Based Palette

| State         | CSS Variable       | Hex Value | Use Case                 |
| ------------- | ------------------ | --------- | ------------------------ |
| **Calm**      | `--state-calm`     | `#3a3a3a` | Default block, neutral   |
| **Healthy**   | `--state-healthy`  | `#22c55e` | Validated, good data     |
| **Warning**   | `--state-warning`  | `#f59e0b` | Fragile, needs attention |
| **Critical**  | `--state-critical` | `#ef4444` | Contradiction, high risk |
| **AI Active** | `--state-ai`       | `#6366f1` | Analysis in progress     |

### Chromatic Palette (Accents)

| Color  | CSS Variable      | Hex Value | Purpose                     |
| ------ | ----------------- | --------- | --------------------------- |
| Indigo | `--chroma-indigo` | `#6366f1` | Primary accent, holographic |
| Cyan   | `--chroma-cyan`   | `#06b6d4` | Secondary accent, depth     |
| Pink   | `--chroma-pink`   | `#ec4899` | Emphasis, criticals         |
| Amber  | `--chroma-amber`  | `#f59e0b` | Warnings, attention         |

### Background & Text

| Element            | CSS Variable         | Hex Value |
| ------------------ | -------------------- | --------- |
| Background         | `--background`       | `#07070a` |
| Canvas Surface     | `--canvas-surface`   | `#1a1a1a` |
| Foreground (Text)  | `--foreground`       | `#ffffff` |
| Foreground (Muted) | `--foreground-muted` | `#a1a1a1` |

### Color Usage Rules

✅ **DO:**

- Use state colors for block states (calm/healthy/warning/critical)
- Layer chromatic colors in gradients for depth
- Use high contrast white on dark backgrounds
- Apply glow effects based on state

❌ **DON'T:**

- Use arbitrary colors not in the palette
- Mix multiple states in one component
- Use pure black or white for text (use CSS variables)
- Apply colors without corresponding state

---

## Component Architecture

### Block Component States

Every BMC block must support these states:

| State         | Visual                    | Behavior                  |
| ------------- | ------------------------- | ------------------------- |
| **Calm**      | Muted gray, subtle border | Default, lowest attention |
| **Focused**   | Slight color shift, glow  | User interaction          |
| **Healthy**   | Green-blue shimmer        | Validated/coherent        |
| **Warning**   | Amber-gold glow           | Needs attention           |
| **Critical**  | Pink-red pulse            | High priority             |
| **AI Active** | Cyan-purple scan          | LLM processing            |

### CSS Classes (Apply These)

```css
.glow-calm {
  box-shadow: 0 0 14px rgba(58, 58, 58, 0.21);
}
.glow-healthy {
  box-shadow:
    0 0 14px rgba(34, 197, 94, 0.28),
    0 0 28px rgba(34, 197, 94, 0.14);
}
.glow-warning {
  box-shadow:
    0 0 14px rgba(245, 158, 11, 0.28),
    0 0 28px rgba(245, 158, 11, 0.14);
}
.glow-critical {
  box-shadow:
    0 0 21px rgba(239, 68, 68, 0.42),
    0 0 42px rgba(236, 72, 153, 0.28),
    0 0 63px rgba(99, 102, 241, 0.14);
}
.glow-ai {
  box-shadow:
    0 0 14px rgba(99, 102, 241, 0.35),
    0 0 28px rgba(6, 182, 212, 0.21);
}
```

### Spacing & Layout

- **Gap between blocks:** 6px
- **Border radius (blocks):** 10px
- **Border radius (cards):** 14px
- **Padding (cards):** 1.25rem
- **Container max-width:** 1100px

### Animations

| Animation        | Duration          | Use                  |
| ---------------- | ----------------- | -------------------- |
| State transition | 300ms ease-out    | Calm → Warning, etc. |
| Expansion        | 400ms spring      | Block expand         |
| Glow pulse       | 2s ease-in-out    | Critical state       |
| Shimmer          | 20s ease infinite | Holographic effect   |
| Hover            | 200ms ease-out    | Interactive feedback |

---

## State & Interaction Patterns

### Canvas Block Lifecycle

```
DEFAULT (Calm)
    ↓ [User fills content]
FOCUSED (Slight glow)
    ↓ [AI analyzes]
HEALTHY or WARNING or CRITICAL
    ↓ [State stabilizes or user fixes]
HEALTHY (Green, validated)
```

### Error/Warning Display

- **Minor issues:** Warning state (amber) on specific blocks
- **Contradictions:** Critical state (red) on conflicting blocks
- **AI suggestions:** Cyan overlay with scan effect

### Transition Rules

✅ **Smooth transitions** between states (300–500ms)
✅ **Preserve focus** during state changes
✅ **Animate glows** not borders (better performance)
✅ **Debounce** rapid state changes (min 200ms)

❌ **No jarring color flashes**
❌ **No simultaneous overlapping animations**
❌ **No animations on prefers-reduced-motion**

---

## AI Agent Requirements

### LLM Prompt Guidelines

**Every AI-generated response must respect these design constraints:**

#### 1. Font Usage in Suggestions

❌ **BAD:**

```
"Consider using a sans-serif font for better readability"
```

✅ **GOOD:**

```
"Use Lexend Deca for body text (already configured)"
```

**Rule:** Never suggest fonts outside the design system. Reference variables: `var(--font-body)`, `var(--font-display)`, `var(--font-mono)`.

#### 2. Color Suggestions

❌ **BAD:**

```
"Use #FF5733 for warnings"
```

✅ **GOOD:**

```
"Apply var(--state-warning) (#f59e0b) to indicate fragility"
```

**Rule:** Only suggest colors from the palette. Always include CSS variable names.

#### 3. Component State Descriptions

❌ **BAD:**

```
"Make the block look 'urgent' with bright red and pulsing"
```

✅ **GOOD:**

```
"Apply critical state: var(--state-critical) with .glow-critical class for 2s pulse animation"
```

**Rule:** Reference state names and CSS classes. Include animation details.

#### 4. Spacing & Layout

❌ **BAD:**

```
"Add padding to make it look better"
```

✅ **GOOD:**

```
"Add padding: 1.25rem (standard card padding) with 6px gap between elements"
```

**Rule:** Use the established spacing scale. Refer to component architecture section.

#### 5. Design Rationale in Responses

Every AI response touching design should include **why** the guideline exists:

```
Block borders should use var(--state-calm) because:
- Reduces visual noise during normal operations
- Reserves chromatic effects for critical states only
- Aligns with "Calm Until Critical" philosophy
```

### System Prompt for LLMs

Include this in every LLM prompt context:

```
## DESIGN SYSTEM CONSTRAINTS

RocketMap uses a strict design system:

TYPOGRAPHY:
- Body: Lexend Deca (var(--font-body))
- Display: Crimson Text (var(--font-display))
- Monospace: Geist Mono (var(--font-mono))

COLORS (use only these):
- Calm: #3a3a3a, Healthy: #22c55e, Warning: #f59e0b, Critical: #ef4444, AI: #6366f1

COMPONENTS:
- Block glow states: .glow-calm, .glow-healthy, .glow-warning, .glow-critical, .glow-ai
- State transitions: 300-500ms ease-out
- Border radius: 10px (blocks), 14px (cards)

PHILOSOPHY:
"Calm Until Critical" - visual emphasis only when blocks need attention

When suggesting UI changes, ALWAYS:
1. Reference design variables/classes (var(--*), .class-name)
2. Provide CSS variable names (e.g., var(--state-warning))
3. Explain why the constraint exists
4. Avoid arbitrary design choices
```

---

## Design Validation Checklist

Use this before shipping any UI changes:

### Typography ✓

- [ ] All body text uses `var(--font-body)` (Lexend Deca)
- [ ] All headings use `var(--font-display)` (Crimson Text) or `.font-display` class
- [ ] All data/metrics use `var(--font-mono)` (Geist Mono)
- [ ] No fonts outside the canonical three
- [ ] Line height matches guidelines (1.5–1.6 for body, 1.2 for display)
- [ ] Font weights match specified ranges per typeface

### Colors ✓

- [ ] All state colors use CSS variables (var(--state-\*))
- [ ] No arbitrary hex colors (#XXXXXX) in components
- [ ] Color palette uses only defined chromatic colors
- [ ] Sufficient contrast for accessibility (WCAG AA minimum)
- [ ] Glow effects use appropriate state class (.glow-\*)

### Components ✓

- [ ] Blocks support all six states (calm/focused/healthy/warning/critical/ai-active)
- [ ] State transitions are 300–500ms smooth (no jarring changes)
- [ ] Spacing matches guidelines (6px gaps, 1.25rem padding, etc.)
- [ ] Border radius consistent (10px blocks, 14px cards)
- [ ] Animations respect prefers-reduced-motion

### Interactions ✓

- [ ] Hover states provide clear feedback (glow shift, border change)
- [ ] Keyboard navigation works without visual degradation
- [ ] Touch targets meet 44px minimum (mobile)
- [ ] Loading states are clearly indicated (spinner, glow animation)
- [ ] Error states use critical state visuals (red glow)

### Responsiveness ✓

- [ ] Layout works at 320px (mobile) and 2560px (desktop)
- [ ] Font sizes scale appropriately
- [ ] Touch-friendly spacing on mobile (48px+ buttons)
- [ ] Animations perform at 60fps (use DevTools Performance tab)

### AI Compliance ✓

- [ ] No LLM-generated content suggests fonts outside the system
- [ ] AI suggestions reference design variables
- [ ] Color recommendations include CSS variable names
- [ ] State descriptions use official state class names
- [ ] Design rationale is documented in AI responses

---

## Quick Reference

### CSS Variables (Copy-Paste)

```css
/* Typography */
--font-body: Lexend Deca --font-display: Crimson Text --font-mono: Geist Mono
  /* States */ --state-calm: #3a3a3a --state-healthy: #22c55e --state-warning:
  #f59e0b --state-critical: #ef4444 --state-ai: #6366f1 /* Chromatic */
  --chroma-indigo: #6366f1 --chroma-cyan: #06b6d4 --chroma-pink: #ec4899
  --chroma-amber: #f59e0b /* Backgrounds */ --background: #07070a
  --canvas-surface: #1a1a1a --foreground: #ffffff --foreground-muted: #a1a1a1;
```

### Common Component Pattern

```tsx
<div
  className={`
  rounded-lg border
  font-body text-sm
  ${state === "critical" ? "glow-critical" : "glow-calm"}
  state-transition
`}
>
  <h2 className="font-display text-lg font-semibold">{blockTitle}</h2>
  <p className="font-body text-foreground-muted">{blockDescription}</p>
</div>
```

---

## How to Update This Guide

1. **Typography changes:** Update font imports in `app/layout.tsx` AND this guide
2. **Color changes:** Update CSS variables in `app/globals.css` AND this guide
3. **Component patterns:** Update examples here and add corresponding CSS classes
4. **AI constraints:** Add to "AI Agent Requirements" section
5. **New state types:** Add to state table, create corresponding `.glow-*` class

**Review cycle:** Every 2 weeks or when design changes are made.
