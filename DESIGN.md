---
name: RocketMap
description: AI-powered Business Model Canvas validation for startup founders
colors:
  workshop-midnight: "#07070a"
  parchment-ash: "#1a1a1a"
  chalk-white: "#ffffff"
  soot-grey: "#a1a1a1"
  verdigris-action: "#34b64a"
  verdigris-deep: "#238636"
  ultramarine-intelligence: "#6366f1"
  madder-lake: "#ec4899"
  raw-umber: "#f59e0b"
  azurite: "#06b6d4"
  sap-green: "#22c55e"
  ochre-caution: "#f59e0b"
  vermilion-alert: "#ef4444"
  candle-glow: "#f0f6fc"
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
    backgroundColor: "#34b64a"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#3bc553"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "rgba(240, 246, 252, 0.14)"
    textColor: "#f0f6fc"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "#a1a1a1"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  input-soft:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "#f0f6fc"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  card-canvas:
    backgroundColor: "rgba(255, 255, 255, 0.025)"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "20px"
  card-stat:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: RocketMap

## 1. Overview

**Creative North Star: "Da Vinci's Workshop"**

RocketMap is the inventor's studio — candlelit, ink-stained, full of half-finished sketches and precision instruments. The interface should feel like sitting at a heavy wooden desk in Renaissance Florence, sketching the anatomy of a business idea. Every surface carries the warmth of parchment and the gravity of craft. The AI is not a flashy assistant; it is a patient apprentice handing you the right lens at the right moment.

This system rejects the sterile minimalism of modern SaaS dashboards and the dopamine-driven gamification of consumer apps. It embraces depth, texture, and the quiet confidence of tools that have weight in the hand. The dark ground is not "dark mode" — it is the darkness between candle and window, the void against which ideas become visible.

**Key Characteristics:**
- Dark-dominant surfaces with tactile depth (inset highlights, layered shadows)
- Renaissance serif display type for headings, humanist sans for body, drafting mono for data
- State expressed through colored top borders and ambient glows, not badges or banners
- Chromatic accents (indigo, pink, cyan, amber) used sparingly for AI presence and holographic effects
- Every interactive element responds with physical weight — lift on hover, press on active

## 2. Colors

The palette draws from a Renaissance workshop: deep midnight walls, aged parchment, the green patina of brass instruments, and the precious pigments of the master's palette.

### Primary
- **Verdigris Action** (`#34b64a`): The primary action color — the patina that forms on copper tools, the color of growth and forward motion. Used for primary buttons, success states, and the main CTA. Carries a sense of "go" without the cheapness of pure green.
- **Verdigris Deep** (`#238636`): The darker end of the verdigris gradient, used for button shadows and pressed states.

### Secondary
- **Ultramarine Intelligence** (`#6366f1`): The AI accent — the precious blue pigment ground from lapis lazuli. Used for AI-generated content indicators, chromatic borders, holographic effects, and the intelligent glow around AI-active elements. This color says "thought" not "tech."

### Tertiary
- **Madder Lake** (`#ec4899`): A warm rose pigment used in chromatic gradient accents and holographic effects.
- **Azurite** (`#06b6d4`): A mineral cyan used in chromatic gradients and cool-state accents.
- **Raw Umber** (`#f59e0b`): An earth pigment used for warning states and warm chromatic accents.

### Neutral
- **Workshop Midnight** (`#07070a`): The ground — not pure black, but the deep blue-black of a workshop at night. Used for page backgrounds and the void behind content.
- **Parchment Ash** (`#1a1a1a`): The surface color — aged paper in dim light. Used for cards, panels, and elevated surfaces.
- **Chalk White** (`#ffffff`): Primary text — the bright stroke of chalk on dark paper.
- **Soot Grey** (`#a1a1a1`): Muted text, secondary labels, timestamps — the grey of charcoal dust.
- **Candle Glow** (`#f0f6fc`): The warm white of candlelight on frosted glass. Used for input text, secondary button text, and soft highlights.

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

The system uses **layered tonal depth with directional shadows** — surfaces feel like physical objects resting on a desk under warm overhead light. Depth is conveyed through a combination of inset highlights (simulating top-light), ambient shadows (simulating the desk surface), and state glows (simulating instrument indicators).

There is no pure flatness. Even the ground has texture — a subtle noise grain overlay at 2.5% opacity creates the feeling of aged paper or canvas.

### Shadow Vocabulary
- **Surface Rest** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 18px rgba(0,0,0,0.2)`): Default state for BMC cells and panels. The inset highlight suggests a light source from above; the ambient shadow grounds the surface.
- **Surface Hover** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.04), 0 10px 20px rgba(0,0,0,0.24)`): Hover state — the surface lifts slightly, the highlight brightens, the shadow deepens.
- **Card Hover** (`box-shadow: 0 8px 32px rgba(99,102,241,0.08), 0 0 0 1px rgba(99,102,241,0.1)`): Canvas cards on hover — a subtle indigo aura suggests the card is "charging" with attention.
- **Glow AI** (`box-shadow: 0 0 14px rgba(99,102,241,0.35), 0 0 28px rgba(6,182,212,0.21)`): AI-active elements pulse with ultramarine and azurite — the apprentice's lantern.
- **Glow Critical** (`box-shadow: 0 0 21px rgba(239,68,68,0.42), 0 0 42px rgba(236,72,153,0.28), 0 0 63px rgba(99,102,241,0.14)`): Critical state — urgent but not alarming, like a furnace that needs attention.

### Named Rules
**The Candlelight Rule.** All inset highlights are white at low opacity (8-14%), simulating a single warm light source from above. Never use colored inset highlights — that breaks the physical metaphor.

## 5. Components

### Buttons
- **Shape:** Gently rounded (12px radius) with physical depth.
- **Primary:** Verdigris gradient (`linear-gradient(180deg, #34b64a 0%, #238636 100%)`) with translucent green border, white text, and an inset top highlight. Feels like a polished brass lever.
- **Hover / Focus:** Lifts 2px (`translateY(-2px)`), gradient brightens, shadow deepens. Active state presses down 1px.
- **Secondary:** Frosted glass gradient over translucent border. Cool white text. For secondary actions that still need presence.
- **Ghost:** Barely-there gradient, muted text, warms to full white on hover. For tertiary actions.
- **Danger:** Vermilion gradient with red glow shadow. Used for destructive actions.

### Inputs / Fields
- **Style:** `.input-soft` — 12px radius, subtle top-to-bottom gradient background (`rgba(255,255,255,0.06)` to `rgba(255,255,255,0.03)`), 1px frosted border, candle-glow text.
- **Focus:** Border shifts to verdigris at 55% opacity, with a 3px verdigris glow ring (`0 0 0 3px rgba(46,160,67,0.16)`). The field feels like it ignites with intention.
- **Placeholder:** Candle glow at 45% opacity — visible but deferential.

### Cards / Containers
- **Canvas Card:** 14px radius, `rgba(255,255,255,0.025)` background, 1px border at 6% white opacity. On hover: lifts 4px, border shifts to indigo at 20% opacity, indigo ambient shadow appears. A subtle gradient overlay (indigo to madder lake at 4% opacity) fades in on hover.
- **Stat Card:** 14px radius, `rgba(255,255,255,0.03)` background, blur backdrop (`blur(12px)`), 1px border at 6% white. The stat number uses a white-to-indigo gradient text fill.
- **BMC Cell Panel:** 10px radius, state-colored 2px top border (calm: frosted, healthy: sap green, warning: ochre, critical: vermilion, AI: ultramarine). Layered gradient background with inset highlights and ambient shadow.

### Navigation
- **Dashboard Sidebar:** Dark surface with subtle border separation. Links use label typography (Geist Mono, uppercase, wide tracking). Active state uses a subtle left-border accent or background tint.
- **Mobile:** Bottom sheet with slide-up animation, full-width actions.

### Tags / Chips
- **Tag Pill:** 100px radius (fully rounded), 11px Geist Mono uppercase, indigo border at 15% opacity, indigo background at 5% opacity, pulsing indigo dot. Used for AI-generated labels and segment markers.

### Signature Component: Chromatic Border
- A custom pattern used for AI-highlighted content and premium surfaces. The border is a conic or linear gradient through the full chromatic palette (ultramarine → madder lake → raw umber → azurite) masked over a transparent border. The background is the surface color padded inside. Optional shimmer animation rotates the gradient over 3-20 seconds.

## 6. Do's and Don'ts

### Do:
- **Do** use the Candlelight Rule — inset white highlights on all elevated surfaces.
- **Do** let the dark ground dominate. The Workshop Midnight background should cover 80%+ of any screen.
- **Do** use state-colored top borders (2px) on BMC cells to indicate health — this is the primary state communication pattern.
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
