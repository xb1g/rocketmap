# GEMINI.md

This file provides context and specific instructions for Gemini when working on the RocketMap project.

## Project Overview

**RocketMap** is a "Playable Business Model Engine" that transforms business strategy into a living system. It helps users validate assumptions, detect contradictions, and stress-test startup ideas through AI-powered analysis.

### Core Philosophy
- **Adversarial Validation:** AI acts as a validator, not just a content generator.
- **Multi-Layer Architecture:** 
    - **Layer 0 (Canvas):** 9-block interactive BMC grid.
    - **Layer 1 (Block Detail):** Expanded view with AI-generated analysis (drafts, assumptions, risks).
    - **Layer 2 (Deep Dive):** Specialized research modules (e.g., Market Research for Customer Segments).
- **System-Level Reasoning:** Consistency Checker analyzes coherence across all blocks.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router)
- **UI Library:** Radix UI Themes 3.3.0
- **Styling:** Tailwind CSS v4 + Custom CSS variables (see `app/globals.css`)
- **Fonts:** 
    - `Lexend Deca` (sans)
    - `Crimson Text` (display/serif, **weights 400, 600, 700 ONLY**)
    - `Geist Mono` (mono)
- **Language:** TypeScript (Strict mode)
- **Backend/Auth:** Appwrite

## Directory Structure

```
app/
├── layout.tsx              # Radix Theme wrapper, global fonts
├── globals.css             # CSS variables, chromatic effects, animations
├── page.tsx                # Landing page
├── dashboard/              # User dashboard
├── canvas/[slug]/          # Canvas view (BMC grid)
├── components/
│   ├── canvas/             # BMC grid, block cells, toolbar
│   ├── blocks/             # Expanded block views, deep-dive layers
│   ├── ai/                 # Chat components
│   └── ui/                 # Shared UI components
├── api/
│   ├── canvas/             # Canvas CRUD, AI endpoints
lib/
├── ai/                     # AI tools, prompts, agents
├── appwrite.ts             # Appwrite client
└── types/                  # TypeScript definitions
```

## specific Coding Guidelines & Gotchas

1.  **Font Weights:** `Crimson Text` only supports weights **400, 600, and 700**. Do NOT use weight 500.
2.  **Shared Blocks:** `channels`, `customer_segments`, `cost_structure`, and `revenue_streams` share content across BMC and Lean modes. Use `isSharedBlock()` from `components/canvas/constants.ts` to check.
3.  **Hooks:** When using `useRef` with a generic, initialize with `undefined` (e.g., `useRef<T>(undefined)`), not empty.
4.  **AI Integration:**
    -   **System Prompt:** ALWAYS include the system prompt from `lib/ai/PROMPT_TEMPLATES.md` in LLM calls.
    -   **Context:** Pass the entire canvas state to the AI.
    -   **Tool Use:** Use the `tool` pattern for structured output extraction.
    -   **Gating:** Deep-dive AI features require all 9 blocks to have >= 10 chars.

## Design System: "Calm Until Critical"

-   **Visual Language:**
    -   **Calm:** Muted gray, subtle borders.
    -   **Healthy:** Green-blue shimmer.
    -   **Warning:** Amber-gold.
    -   **Critical:** Hot pink-red, pulsing.
    -   **AI Active:** Cyan-purple holographic.
-   **Classes:** Use `.chromatic-border`, `.glow-{state}`, `.holographic-bg`, `.glass-morphism`.
-   **Animations:** Respect `prefers-reduced-motion`. Use `transform` and `opacity` for performance.

## Common Commands

-   `npm run dev`: Start development server.
-   `npm run build`: Build for production.
-   `npm run lint`: Run linting.

## Current Status (as of Feb 2026)

-   **Implemented:** Radix/Tailwind setup, Auth, Dashboard, BMC Grid, Block Focus Panel, Per-block AI Chat, Consistency Checker, Market Research Deep-Dive (Layer 2 for Customer Segments).
-   **Next Steps:** Implement deep-dive layers for remaining 8 blocks, streaming AI responses, shock scenario simulation.

## Reference Documentation

-   `CLAUDE.md`: Comprehensive project guide (source of truth for this file).
-   `docs/DESIGN_GUIDELINES.md`: Typography, color system, component architecture.
-   `lib/ai/PROMPT_TEMPLATES.md`: System and feature-specific prompts.
