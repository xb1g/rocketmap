---
name: RocketMap
description: AI-powered Business Model Canvas validation for startup founders
colors:
  parchment-ground: "#f5f0e3"
  parchment-surface: "#faf7ef"
  parchment-elevated: "#ffffff"
  ink-primary: "#2a2520"
  ink-muted: "#7a7268"
  ink-subtle: "#a39a8d"
  amber-ink: "#c4a35a"
  amber-ink-hover: "#d4b36a"
  amber-ink-deep: "#a08040"
  ultramarine-intelligence: "#6366f1"
  madder-lake: "#ec4899"
  raw-umber: "#f59e0b"
  azurite: "#06b6d4"
  sap-green: "#22c55e"
  ochre-caution: "#f59e0b"
  vermilion-alert: "#ef4444"
  sepia-line: "#e6dfd0"
typography:
  display:
    fontFamily: "Crimson Text, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Crimson Text, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.7rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "#c4a35a"
    textColor: "#2a2520"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#d4b36a"
    textColor: "#2a2520"
  button-secondary:
    backgroundColor: "rgba(42, 37, 32, 0.06)"
    textColor: "#2a2520"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "rgba(42, 37, 32, 0.03)"
    textColor: "#7a7268"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  input-soft:
    backgroundColor: "#ffffff"
    textColor: "#2a2520"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  card-canvas:
    backgroundColor: "#ffffff"
    textColor: "#2a2520"
    rounded: "{rounded.xl}"
    padding: "20px"
  card-stat:
    backgroundColor: "rgba(255, 255, 255, 0.7)"
    textColor: "#2a2520"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: RocketMap

## 1. Overview

**Creative North Star: "The Sunlit Studio"**

RocketMap is the founder's drafting table — morning light across aged paper, ink still wet, sketches pinned to a warm wooden wall. The interface should feel like sitting down with a fresh sheet of parchment and a pen that knows what to ask. Every surface carries the warmth of handmade paper and the quiet confidence of tools that have been used for centuries.

This system rejects the cold minimalism of modern SaaS dashboards and the dopamine-driven gamification of consumer apps. It embraces daylight, texture, and the deliberate slowness of serious thought. The light ground is not "light mode" — it is the page itself, the medium onto which an idea is pressed.

**Key Characteristics:**
- Warm parchment-dominant surfaces with subtle paper grain
- Renaissance serif display type for headings, humanist sans for body, drafting mono for data
- State expressed through colored top borders and warm ink accents, not badges or banners
- Chromatic accents (indigo, pink, cyan, amber) used sparingly for AI presence and ink effects
- Every interactive element responds with physical weight — lift on hover, press on active

## 2. Themes

RocketMap supports two creative directions, selected by the user and persisted across sessions:

### Light — "The Sunlit Studio" (default)
The page is warm parchment, text is walnut ink, and the primary action is amber brass. This is the canonical daytime, focused-work experience.

### Dark — "Da Vinci's Workshop"
The page is midnight workshop, text is chalk, and the primary action is verdigris green. The dark palette is the candlelit counterpart — identical structure, different time of day.

### Implementation
Theme selection is handled by `next-themes` with `attribute="class"`. The `dark` class on `<html>` swaps CSS custom properties (`--background`, `--foreground`, `--primary`, etc.). Components should use these variables or Tailwind token classes (`bg-background`, `text-foreground`, `border-border`) and never hardcode theme-specific surface colors.

## 3. Colors

The palette draws from a sunlit maker's studio: aged parchment, walnut ink, brass instruments, and the bright pigments kept in small glass jars.

### Primary
- **Amber Ink** (`#c4a35a` light / `#e6b84a` dark): The primary action color — warm brass and sepia ink in light, brighter gold against midnight in dark. Used for primary buttons and the main CTA.
- **Amber Ink Hover** (`#d4b36a` light / `#f0c85e` dark): The lighter end of the primary gradient, used for hover states.
- **Amber Ink Deep** (`#a08040` light / `#c49a3a` dark): The darker end, used for button shadows and pressed states.

### Secondary
- **Ultramarine Intelligence** (`#6366f1`): The AI accent — the precious blue pigment ground from lapis lazuli. Used for AI-generated content indicators, chromatic borders, holographic effects, and the intelligent glow around AI-active elements. This color says "thought" not "tech."

### Tertiary
- **Madder Lake** (`#ec4899`): A warm rose pigment used in chromatic gradient accents and holographic effects.
- **Azurite** (`#06b6d4`): A mineral cyan used in chromatic gradients and cool-state accents.
- **Raw Umber** (`#f59e0b`): An earth pigment used for warning states and warm chromatic accents.

### Neutral
- **Parchment Ground** (`#f5f0e3` light / `#07070a` dark): The page — warm aged paper in light, midnight workshop in dark. Used for page backgrounds and the void behind content.
- **Parchment Surface** (`#faf7ef` light / `#1a1a1a` dark): The elevated surface — a cleaner sheet in light, aged paper in dim light in dark. Used for cards, panels, and raised surfaces.
- **Parchment Elevated** (`#ffffff` light / `#1a1a1a` dark): The brightest surface in light; the same aged surface in dark.
- **Ink Primary** (`#2a2520` light / `#ffffff` dark): Primary text — walnut ink on parchment, or chalk on dark paper.
- **Ink Muted** (`#7a7268` light / `#a1a1a1` dark): Muted text, secondary labels, timestamps.
- **Ink Subtle** (`#a39a8d` light / `#6b6b6b` dark): Placeholders, disabled text, tertiary information.
- **Sepia Line** (`#e6dfd0` light / `rgba(255,255,255,0.1)` dark): Borders, dividers, and hairlines.

### Named Rules
**The Pigment Rarity Rule.** The chromatic palette (ultramarine, madder lake, azurite, raw umber) appears on ≤15% of any given screen. Its rarity is the point — these are precious pigments, not wall paint. When they appear, they signal intelligence, energy, or state.

## 3. Typography

**Display Font:** Crimson Text (with Georgia fallback)
**Body Font:** Inter (with system-ui fallback)
**Label/Mono Font:** Geist Mono (with monospace fallback)

**Character:** The pairing evokes a Renaissance sketchbook — the serif carries the weight of editorial authority and craft history, while the sans and mono handle the mechanical precision of data and interface labels. The display font is never used for body text; it is reserved for headlines and moments of narrative emphasis.

### Hierarchy
- **Display** (700, clamp(2rem, 5vw, 3.5rem), line-height 1.1): Hero headlines, landing page title. Used sparingly — once per major view.
- **Headline** (600, 1.75rem, line-height 1.2): Section headings, modal titles, dashboard headers.
- **Title** (600, 1.15rem, line-height 1.3): Card titles, block headers, sub-section labels. Inter sans.
- **Body** (400, 0.875rem, line-height 1.6): All readable text, descriptions, form content. Max line length 70ch.
- **Label** (500, 0.7rem, line-height 1.4, letter-spacing 0.08em, uppercase): Data labels, timestamps, metadata, stat headers. Geist Mono. The uppercase + wide tracking creates a drafting-table aesthetic.

### Named Rules
**The One Voice Rule.** The display font (Crimson Text) is used for at most one headline per screen. Everything else is Inter or Geist Mono. The serif is a privilege, not a default.

## 4. Elevation

The system uses **layered tonal depth with warm directional shadows** — surfaces feel like sheets of paper resting on a wooden desk under soft window light. Depth is conveyed through a combination of subtle borders, soft shadows, and state glows.

There is no pure flatness. The ground carries a subtle noise grain overlay at 2.5% opacity to suggest the texture of aged paper.

### Shadow Vocabulary
- **Surface Rest** (`box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 18px rgba(42,37,32,0.06), 0 0 0 1px rgba(42,37,32,0.06)`): Default state for BMC cells and panels. The inset top highlight suggests fresh paper; the ambient shadow grounds the surface.
- **Surface Hover** (`box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 10px 20px rgba(42,37,32,0.08), 0 0 0 1px rgba(42,37,32,0.08)`): Hover state — the surface lifts slightly, the shadow deepens.
- **Card Hover** (`box-shadow: 0 8px 32px rgba(99,102,241,0.06), 0 0 0 1px rgba(99,102,241,0.08)`): Canvas cards on hover — a subtle indigo aura suggests the card is "charging" with attention.
- **Glow AI** (`box-shadow: 0 0 14px rgba(99,102,241,0.22), 0 0 28px rgba(6,182,212,0.12)`): AI-active elements pulse with ultramarine and azurite — the assistant's inkwell.
- **Glow Critical** (`box-shadow: 0 0 21px rgba(239,68,68,0.28), 0 0 42px rgba(236,72,153,0.18), 0 0 63px rgba(99,102,241,0.08)`): Critical state — urgent but not alarming, like a sketch that needs revision.

### Named Rules
**The Daylight Rule.** In light mode, shadows are warm-tinted (`rgba(42,37,32,...)`). In dark mode, shadows are neutral (`rgba(0,0,0,...)`). Highlights come from above in both modes, simulating a tall window to the left of the desk.

## 5. Components

### Buttons
- **Shape:** Gently rounded (12px radius) with physical depth.
- **Primary:** Amber ink gradient (`linear-gradient(180deg, #c4a35a 0%, #a08040 100%)`) with translucent amber border and dark ink text (`#2a2520`), plus an inset top highlight. Feels like a brass inkwell cap.
- **Hover / Focus:** Lifts 2px (`translateY(-2px)`), gradient brightens, shadow deepens. Active state presses down 1px.
- **Secondary:** Soft parchment tint over translucent border. Ink text. For secondary actions that still need presence.
- **Ghost:** Barely-there surface, muted text, warms to full ink on hover. For tertiary actions.
- **Danger:** Vermilion gradient with red glow shadow. Used for destructive actions.

### Inputs / Fields
- **Style:** `.input-soft` — 12px radius, white paper background, 1px sepia border, ink text.
- **Focus:** Border shifts to amber ink at 55% opacity, with a 3px amber glow ring (`0 0 0 3px rgba(196,163,90,0.14)`). The field feels like it ignites with intention.
- **Placeholder:** Ink muted at 55% opacity — visible but deferential.

### Cards / Containers
- **Canvas Card:** 14px radius, `#ffffff` background, 1px sepia border. On hover: lifts 4px, border shifts to indigo at 16% opacity, indigo ambient shadow appears. A subtle gradient overlay (indigo to madder lake at 3% opacity) fades in on hover.
- **Stat Card:** 14px radius, translucent white background, 1px sepia border. The stat number uses an ink-to-amber gradient text fill.
- **BMC Cell Panel:** 10px radius, state-colored 2px top border (calm: sepia, healthy: sap green, warning: raw umber, critical: vermilion, AI: ultramarine). Layered background with subtle border and warm shadow.

### Navigation
- **Dashboard Sidebar:** Parchment surface with subtle border separation. Links use label typography (Geist Mono, uppercase, wide tracking). Active state uses a subtle left-border accent or background tint.
- **Mobile:** Bottom sheet with slide-up animation, full-width actions.

### Tags / Chips
- **Tag Pill:** 100px radius (fully rounded), 11px Geist Mono uppercase, indigo border at 15% opacity, indigo background at 5% opacity, pulsing indigo dot. Used for AI-generated labels and segment markers.

### Signature Component: Chromatic Border
- A custom pattern used for AI-highlighted content and premium surfaces. The border is a conic or linear gradient through the full chromatic palette (ultramarine → madder lake → raw umber → azurite) masked over a transparent border. The background is the surface color padded inside. Optional shimmer animation rotates the gradient over 3-20 seconds.

## 6. Do's and Don'ts

### Do:
- **Do** use CSS variables (`--background`, `--foreground`, `--primary`, etc.) or Tailwind token classes so components work in both themes.
- **Do** use the Daylight Rule — warm-tinted shadows in light mode, neutral shadows in dark mode.
- **Do** let the parchment/midnight ground dominate. The background should cover 80%+ of any screen.
- **Do** use state-colored top borders (2px) on BMC cells to indicate health.
- **Do** use Crimson Text display font for one headline per view. Let it breathe.
- **Do** use Geist Mono with uppercase + 0.08em tracking for all data labels and metadata.
- **Do** respect `prefers-reduced-motion` — the shimmer and pulse animations are decorative, not functional.

### Don't:
- **Don't** use corporate blue dashboards (McKinsey, Salesforce aesthetics) — PRODUCT.md explicitly prohibits this.
- **Don't** use Notion-clone minimalism (endless white space, ghostly typography) — PRODUCT.md explicitly prohibits this.
- **Don't** use gamified/confetti UI (celebration animations, progress badges, dopamine loops) — PRODUCT.md explicitly prohibits this.
- **Don't** use the hero-metric template (big number, small label, supporting stats, gradient accent) — this is an absolute ban in the shared design laws.
- **Don't** use side-stripe borders (border-left or border-right > 1px as a colored accent on cards, lists, or callouts) — absolute ban.
- **Don't** use gradient text (`background-clip: text` with gradients) for body or headings. The landing page title shimmer is the sole exception — it is a brand moment, not a pattern.
- **Don't** use glassmorphism as a default. The blur backdrop on stat cards is purposeful and rare; don't spread it everywhere.
- **Don't** use identical card grids (icon + heading + text, repeated endlessly) — absolute ban.
- **Don't** make modals the first solution. Exhaust inline and progressive alternatives.
- **Don't** use em dashes — use commas, colons, semicolons, periods, or parentheses.
