# Radix UI + Chromatic Theme Design
**Date:** 2026-02-13
**Project:** RocketMap - Playable Business Model Engine

## Overview

Design specification for implementing a sophisticated dark theme with holographic/chromatic effects for the Business Model Canvas application. The theme uses Radix UI Themes as foundation with custom chromatic effects inspired by Ai OS aesthetic.

## Product Context

**Application Purpose:**
The Playable Business Model Engine - a tool that turns business strategy into a living system where users can simulate stress, see collapse paths, and improve structural strength.

**Core Philosophy:**
- AI analyzes structural coherence
- AI extracts hidden assumptions
- AI simulates shock and reveals fragility
- AI plays adversary

**Primary Feature:**
Interactive Business Model Canvas with spatial navigation, zoom in/out, expandable blocks, and layered detail views.

## Design Philosophy: "Calm Until Critical"

The interface maintains a neutral, focused state during normal operation. Visual emphasis emerges only when blocks become fragile or critical, drawing attention to areas that need analysis.

- **Calm state:** Muted, professional, allows focus
- **Warning state:** Subtle color shifts and glows
- **Critical state:** Vibrant chromatic effects demand attention

## 1. Theme Architecture & Color System

### Foundation Colors

**Base (Calm State):**
- Background: `#0a0a0a` (deep black)
- Canvas surface: `#1a1a1a` (very dark gray)
- BMC blocks (neutral): Dark gray with subtle holographic borders
- Text primary: `#ffffff` (high contrast white)
- Text secondary: `#a1a1a1` (muted gray)

### State-Based Color System

**Healthy/Validated:**
- Iridescent green-blue shimmer
- Radix `jade` or `grass` color scales
- Subtle glow effect

**Warning/Fragile:**
- Amber-gold with rainbow edge highlights
- Radix `amber` color scale
- Moderate glow and border emphasis

**Critical/Collapse Risk:**
- Hot pink-red with purple-blue chromatic aberration
- Radix `crimson` → `pink` gradients
- Strong pulsing glow and background gradient

**AI Analysis Active:**
- Cyan-purple holographic gradient
- Radix `iris` or `blue` color scales
- Scanning effects and shimmer

### Chromatic/Holographic Implementation

**Visual Techniques:**
- Multi-color gradient borders with blur/glow
- Radial gradients with multiple color stops (purple → cyan → pink → yellow)
- Glass morphism: semi-transparent cards with backdrop blur
- Hover states: hue shift on interaction, stronger chromatic glow
- Critical blocks: full holographic background (like reference image)

**CSS Implementation Methods:**
- `conic-gradient()` for holographic effects
- Multiple `box-shadow` layers for colored glow
- `filter: blur()` + `backdrop-filter: blur()` for glass effect
- CSS custom properties for animatable color stops

### Typography

- **Primary:** Geist Sans (already installed)
- **Monospace:** Geist Mono for data/metrics
- Clean, modern feel that contrasts well against colorful effects

### Radix Theme Configuration

```tsx
appearance: "dark"
accentColor: "iris"      // Purple-blue for holographic feel
grayColor: "gray"        // Neutral surfaces
radius: "large"          // Modern, friendly curves
scaling: "100%"          // Can adjust for density
```

## 2. Component Architecture & Layout System

### Core Components

#### 1. Business Model Canvas Container
- Full viewport spatial canvas
- Pan/zoom controls using CSS transforms
- Grid layout for 9 BMC blocks
- Responsive scaling based on zoom level

#### 2. BMC Block Component (Radix Card-based)
- Three states: calm (collapsed), focused (expanded), critical (highlighted)
- Smooth transitions between states
- Editable content areas
- Connection indicators (visual lines to related blocks)
- Layered information: title → key points → detailed analysis

#### 3. Connection Lines (SVG-based)
- Dynamic lines between related blocks
- Color-coded by relationship strength/health
- Animated when blocks are stressed
- Bezier curves for organic feel

#### 4. Control Panel (Fixed overlay)
- Zoom controls
- State filters (show all/warnings only/critical only)
- AI simulation triggers
- Radix Button components with chromatic styling

#### 5. Detail Popovers (Radix Popover)
- Contextual information on hover
- Glass morphism styling
- AI insights and suggestions
- Quick actions

### Layout Structure

```
<Theme> (Radix wrapper)
  └─ <Canvas Container> (custom, pan/zoom)
      ├─ <SVG Layer> (connection lines)
      └─ <Block Grid> (9 BMC blocks)
          └─ <Card>+ components per block
  └─ <Control Panel> (fixed overlay)
  └─ <Toast> (Radix, for notifications)
```

### Interaction Flow

1. **Default:** All blocks visible in calm state (muted, gray)
2. **Hover:** Block preview with subtle chromatic glow
3. **Click:** Block expands in place, shows layers of detail
4. **AI Analysis:** Affected blocks light up with state colors
5. **Critical:** Pulsing chromatic effects draw attention

## 3. Animation & Visual Feedback System

### Animation Philosophy

Purposeful motion that reinforces the "living system" concept. Blocks breathe, connections pulse, critical states demand attention.

### Key Animations

#### Block State Transitions
- **Calm → Warning:** Border color shift + subtle glow fade-in (300ms ease-out)
- **Warning → Critical:** Background gradient animation + scale pulse (500ms, infinite loop)
- **Expansion:** Smooth scale transform + content fade-in (400ms spring)
- All use `transform` and `opacity` for 60fps performance

#### Chromatic Effects
- **Holographic shimmer:** Subtle hue rotation on calm blocks (20s infinite)
- **Critical pulse:** Gradient position animation + shadow intensity (2s ease-in-out infinite)
- **Hover glow:** Chromatic border brightness (200ms ease-out)
- **Edge aberration:** Multi-layer box-shadow with slight offset and blur

#### Connection Lines
- **Healthy:** Static gray lines
- **Stressed:** Animated dashes moving along path
- **Breaking:** Rapid pulse + color shift to red
- **New connections:** Draw animation from point A to B

#### AI Analysis Feedback
- **Scanning effect:** Overlay sweep with gradient (1.5s)
- **Result appearance:** Fade + slide from bottom (300ms stagger per item)
- **Loading states:** Radix Spinner with chromatic colors

#### Spatial Canvas
- **Pan:** Direct manipulation, no animation (feels immediate)
- **Zoom:** Smooth scale transform (250ms ease-out)
- **Focus on block:** Animate camera position (600ms ease-in-out)

### Performance Considerations

- Use `will-change` sparingly for active animations only
- Prefer `transform` and `opacity` (GPU-accelerated)
- Disable animations on low-end devices (`prefers-reduced-motion`)
- Debounce pan/zoom for smooth interaction

### Animation Examples

```css
@keyframes holographic-shift {
  0%, 100% { --hue-rotate: 0deg; }
  50% { --hue-rotate: 5deg; }
}

@keyframes critical-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.02); }
}
```

## 4. Technical Implementation Plan

### File Structure

```
app/
├── layout.tsx                      # Radix Theme wrapper
├── globals.css                     # Theme variables + animations
├── components/
│   ├── theme/
│   │   ├── radix-theme-config.tsx  # Theme props
│   │   └── chromatic-effects.css   # Holographic styles
│   ├── canvas/
│   │   ├── spatial-canvas.tsx      # Pan/zoom container
│   │   ├── bmc-grid.tsx            # 9-block layout
│   │   └── connection-svg.tsx      # Relationship lines
│   ├── blocks/
│   │   ├── bmc-card.tsx            # Base block component
│   │   ├── block-states.tsx        # Calm/warning/critical variants
│   │   └── block-content.tsx       # Editable content
│   └── ui/
│       ├── control-panel.tsx       # Zoom, filters
│       └── ai-panel.tsx            # Analysis triggers
```

### CSS Architecture

1. **globals.css:** CSS variables for colors, custom animations
2. **chromatic-effects.css:** Reusable holographic gradient classes
3. **Tailwind classes:** Layout, spacing, responsive design
4. **Radix Theme tokens:** Component styling via props

### Dependencies (Already Installed)

- `@radix-ui/themes` - Component library
- `tailwindcss` v4 - Utility classes
- `next` 16.1.6 - Framework
- No additional libraries needed for MVP

### State Management

- React useState for canvas zoom/pan
- Block states (calm/warning/critical) as component props
- Connection data as simple array of relationships
- Can add Zustand/Jotai later if complexity grows

### Browser Targets

- Modern browsers (last 2 versions)
- Chrome/Edge: full chromatic effects support
- Safari: test backdrop-filter support
- Firefox: test conic-gradient support

### Development Approach

1. Set up Radix Theme configuration with dark mode
2. Create chromatic effect utility classes
3. Build spatial canvas with pan/zoom
4. Implement BMC card component with states
5. Add connection lines (SVG)
6. Polish animations and interactions

### Accessibility

- Respect `prefers-reduced-motion` for animations
- Keyboard navigation for all interactive elements
- ARIA labels for canvas controls
- Screen reader announcements for state changes
- Sufficient color contrast even with chromatic effects

## Success Criteria

**Visual Quality:**
- Holographic effects feel premium, not gimmicky
- Calm state allows focus without distraction
- Critical states immediately draw attention
- Smooth 60fps animations

**Usability:**
- Spatial canvas feels intuitive
- Zoom levels maintain readability
- Block expansion doesn't disorient users
- State changes are clear and purposeful

**Technical:**
- Clean component architecture
- Performant animations
- Accessible to keyboard and screen reader users
- Maintainable CSS using design tokens

## Next Steps

1. Create detailed implementation plan (use writing-plans skill)
2. Set up base theme configuration
3. Build component library incrementally
4. Test chromatic effects across browsers
5. Polish interactions and animations
