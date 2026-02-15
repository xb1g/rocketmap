# Design System Validation Checklist

**Purpose:** Quick reference for developers before committing design changes
**Usage:** Print this or keep open during component development
**Last Updated:** 2026-02-14

---

## Pre-Commit Checklist

Run through these before pushing code:

### Typography ✅

- [ ] All body text uses `.font-body` class or `var(--font-body)`
- [ ] All headings use `.font-display` class or `var(--font-display)`
- [ ] All metrics/data use `.font-mono` class or `var(--font-mono)`
- [ ] No `font-family: "Arial"`, `font-family: "Helvetica"`, or other arbitrary fonts
- [ ] Font weights in use:
  - [ ] Lexend Deca: 400 only
  - [ ] Crimson Text: 400, 500, 600, 700
  - [ ] Geist Mono: 400, 500
- [ ] Line-height applied to multi-line text
  - [ ] Body: 1.5–1.6
  - [ ] Display: 1.2
  - [ ] Mono: 1.4

### Colors ✅

- [ ] All state colors use CSS variables:
  - [ ] `var(--state-calm)` for defaults
  - [ ] `var(--state-healthy)` for validated content
  - [ ] `var(--state-warning)` for attention-needed
  - [ ] `var(--state-critical)` for errors/contradictions
  - [ ] `var(--state-ai)` for LLM processing
- [ ] Chromatic accents use variables:
  - [ ] `var(--chroma-indigo)` primary
  - [ ] `var(--chroma-cyan)` secondary
  - [ ] `var(--chroma-pink)` emphasis
  - [ ] `var(--chroma-amber)` warning
- [ ] No hardcoded hex colors like `#FF5733`
- [ ] Background/text use system variables:
  - [ ] Background: `var(--background)`
  - [ ] Canvas: `var(--canvas-surface)`
  - [ ] Text: `var(--foreground)`
  - [ ] Text muted: `var(--foreground-muted)`
- [ ] Contrast ratio meets WCAG AA (4.5:1 for normal text, 3:1 for large)

### Component States ✅

- [ ] Block supports six states:
  - [ ] Calm (default)
  - [ ] Focused (interaction)
  - [ ] Healthy (validated)
  - [ ] Warning (fragile)
  - [ ] Critical (broken)
  - [ ] AI Active (processing)
- [ ] State-appropriate glows applied:
  - [ ] `.glow-calm` for default
  - [ ] `.glow-healthy` for validated
  - [ ] `.glow-warning` for warnings
  - [ ] `.glow-critical` for critical + animation
  - [ ] `.glow-ai` for processing
- [ ] Transitions smooth (300–500ms ease-out)
- [ ] No jarring state flashes
- [ ] Border radius consistent:
  - [ ] Blocks: 10px
  - [ ] Cards: 14px

### Layout & Spacing ✅

- [ ] Gap between blocks: 6px
- [ ] Card padding: 1.25rem
- [ ] Container max-width: 1100px
- [ ] Touch targets: min 44px (mobile)
- [ ] Responsive at 320px, 768px, 1440px, 2560px breakpoints

### Animations ✅

- [ ] State transitions: smooth, not abrupt
- [ ] Debounce on rapid state changes (200ms minimum)
- [ ] `prefers-reduced-motion` respected
- [ ] GPU-accelerated properties used (`transform`, `opacity`)
- [ ] No simultaneous overlapping animations
- [ ] Hover feedback is immediate (200ms or less)

### Accessibility ✅

- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Color not only indicator (use text + color)
- [ ] Loading states are announced
- [ ] Error messages are clear and actionable
- [ ] Mobile: 48px+ minimum tap target

### LLM Integration ✅

_Only if adding/modifying AI features:_

- [ ] LLM prompt includes System Prompt from `PROMPT_TEMPLATES.md`
- [ ] Suggested colors include CSS variable names
- [ ] Suggested fonts are from approved three
- [ ] Component state recommendations use class names (`.glow-*`)
- [ ] Cross-block references are explicit
- [ ] JSON output is validated before rendering
- [ ] No arbitrary design suggestions (all tied to guidelines)

### Code Quality ✅

- [ ] No console errors or warnings
- [ ] CSS classes follow naming convention: `.font-*`, `.glow-*`, `.state-*`
- [ ] CSS variables used instead of hardcoded values
- [ ] No unused CSS classes
- [ ] Component props accept state as string enum
- [ ] Tests pass (if applicable)

---

## Quick Debug Guide

### "The font looks wrong"

**Check:**

- [ ] Body text: `class="font-body"` or `font-family: var(--font-body)`?
- [ ] Heading: `class="font-display"` or `font-family: var(--font-display)`?
- [ ] Monospace: `class="font-mono"` or `font-family: var(--font-mono)`?
- [ ] Is the font actually loaded? Check browser DevTools > Network > Fonts
- [ ] Browser cache cleared? (`Cmd+Shift+Delete` on Mac)

**Fix:**

1. Add appropriate class: `.font-body`, `.font-display`, or `.font-mono`
2. Or use CSS variable: `var(--font-body)` etc.
3. Verify weight is in allowed range (see typography table above)
4. Restart dev server if imports changed

### "The color looks wrong"

**Check:**

- [ ] Is it using a CSS variable? (`var(--state-*)`, `var(--chroma-*)`)
- [ ] Is it a hardcoded hex value?
- [ ] Is the color defined in `globals.css :root`?
- [ ] Is the state applied correctly?

**Fix:**

1. Replace hardcoded hex with CSS variable
2. Use appropriate state variable for the use case
3. If not defined, add to `globals.css` :root section
4. Apply corresponding glow class (`.glow-*`)

### "The animation is janky"

**Check:**

- [ ] Using `transform` and `opacity`? (GPU-accelerated)
- [ ] Or using `width`, `height`, `left`? (CPU-heavy)
- [ ] Debouncing rapid changes?
- [ ] Multiple animations on same element?
- [ ] `will-change` used excessively?

**Fix:**

1. Switch to `transform: translateX()` instead of `left`
2. Use `opacity` instead of `visibility`
3. Debounce state changes: `setTimeout(setState, 200)`
4. Split animations across elements
5. Remove `will-change` or limit to active elements

### "Block state not updating"

**Check:**

- [ ] Is state passed as prop? (`<Block state="critical" />`)
- [ ] Is the class name correct? (`.glow-${state}` not `.glow-critical-state`)
- [ ] CSS class exists in `globals.css`?
- [ ] Transition class applied? (`.state-transition`)

**Fix:**

1. Ensure component accepts `state` prop
2. Map state to class: `className={`glow-${state}`}`
3. Add `.state-transition` for smooth changes
4. Verify class in globals.css

---

## File Locations Reference

| Purpose              | File                 | Path                           |
| -------------------- | -------------------- | ------------------------------ |
| Design guidelines    | DESIGN_GUIDELINES.md | `docs/DESIGN_GUIDELINES.md`    |
| AI prompt templates  | PROMPT_TEMPLATES.md  | `lib/ai/PROMPT_TEMPLATES.md`   |
| CSS variables        | globals.css          | `app/globals.css`              |
| Font imports         | layout.tsx           | `app/layout.tsx`               |
| Component styles     | Various              | `app/components/**/*.tsx`      |
| Validation checklist | This file            | `docs/VALIDATION_CHECKLIST.md` |

---

## Commit Message Template

When committing design-related changes:

```
feat: update [component] styling to match design guidelines

- Font: Use var(--font-body) for all body text
- Color: Apply var(--state-healthy) for validated state
- Animation: Add .state-transition for smooth 300ms changes
- Glow: Apply .glow-healthy effect

Validation: [✅ All typography | ✅ All colors | ✅ All states | ✅ Accessibility]
Ref: docs/DESIGN_GUIDELINES.md
```

---

## Monthly Audit

Run this monthly to catch design drift:

```bash
# Find hardcoded colors (should all use var(--*))
grep -r "#[0-9A-F]\{6\}" app/components --include="*.tsx" --include="*.css"

# Find font-family (should use var(--font-*))
grep -r "font-family:" app/components --include="*.css"

# Find missing state classes
grep -r "glow-" app/components --include="*.tsx" | wc -l
```

Expected output:

- 0 hardcoded colors in components (all in globals.css only)
- 0 hardcoded font-family in components (all use CSS variables)
- Growing number of glow classes as blocks are added
