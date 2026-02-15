# RocketMap AI Agents Documentation

This document outlines the architecture, roles, and context construction for the AI agents within the RocketMap platform.

## Overview

RocketMap AI is designed as an **adversarial business model validator**. It doesn't just generate content; it challenges assumptions, identifies risks, and ensures structural coherence across the Business Model Canvas (BMC) and Lean Canvas.

---

## 1. Core Persona: The Adversarial Validator

All agents share a base persona defined in `BASE_SYSTEM_PROMPT` (`lib/ai/prompts.ts`):

- **Role:** Startup strategist and adversarial validator.
- **Tone:** Specific, actionable, and critical.
- **Mandate:**
  - Challenge assumptions rather than validating them.
  - Flag logical gaps between different blocks.
  - Quantify estimates (market size, economics) whenever possible.
  - Reference specific blocks when noting cross-block issues.
  - **Action over Description:** Always use the `proposeBlockEdit` tool for content changes so users see actionable diffs.

---

## 2. Agent Types

RocketMap employs several specialized agent configurations:

### General Agent
- **Purpose:** System-level reasoning across the entire canvas.
- **Focus:** Contradictions, missing links, and logical gaps between blocks (e.g., a Value Proposition that doesn't align with the Customer Segments).
- **Tools:** `analyzeBlock`, `proposeBlockEdit`, `checkConsistency`.

### Block-Specific Agents
- **Purpose:** Deep domain expertise for each of the 9 canvas blocks.
- **Specializations:**
  - **Customer Segments:** Market sizing, segmentation, personas.
  - **Value Proposition:** Feature-benefit mapping, differentiation, JTBD.
  - **Revenue Streams:** Pricing strategy, unit economics, LTV/CAC.
  - **Cost Structure:** Fixed/variable costs, cost drivers, break-even.
  - **Channels:** Channel mix, customer journey, channel economics.
  - **Customer Relationships:** Retention, lifecycle management.
  - **Key Activities/Resources/Partnerships:** Prioritization, gap identification, build vs. buy.
- **Tools:** `analyzeBlock`, `proposeBlockEdit`.

### Deep Dive Agents (Market Research)
- **Purpose:** Specialized modules for intensive analysis.
- **Modules:**
  - `tam_sam_som`: Market sizing specialist.
  - `segmentation`: Customer segmentation expert.
  - `personas`: Detailed customer persona creator.
  - `market_validation`: Data-driven validator for market claims.
  - `competitive_landscape`: Competitive intelligence analyst.
- **Tools:** Each has a dedicated tool (e.g., `estimateMarketSize`, `generateSegments`).

### Onboarding Agent (Guided Creation)
- **Purpose:** Conversational onboarding to generate a canvas from a startup idea.
- **Flow:** 1-2 rounds of sharp follow-up questions followed by full canvas generation.
- **Tools:** `generateCanvas`.

---

## 3. Context Construction (`serializeCanvasState`)

The AI's "memory" of the current canvas is constructed dynamically in `lib/ai/prompts.ts`. The context includes:

### Canvas Mode Awareness
- RocketMap supports both **BMC** and **Lean Canvas**.
- **Shared Blocks:** Channels, Customer Segments, Cost Structure, Revenue Streams are shared between modes.
- **Non-Shared Blocks:** The AI receives content from both modes (e.g., "Key Partners" from BMC and "Problem" from Lean) to maintain cross-canvas consistency.

### Linked Data
- **Segments:** Blocks include information about any Customer Segments linked to them (name, priority, description, early adopter status).
- **Deep Dive Summaries:** If a block has market research data (TAM/SAM/SOM, Persona counts, Competitor names), a concise summary is appended to the block's context.

### Serialization Format
```text
[Value Propositions]: Deliver organic groceries in <30 mins
  [Lean: Unique Value Proposition]: Ultra-fast organic grocery delivery
  → Segment: "Busy Professionals" (priority: 80, Early Adopter)
  [Deep Dive - Market Size]: TAM $50B, SAM $5B, SOM $100M
```

---

## 4. Chat Persistence & History

Conversations with RocketMap AI are persisted to ensure continuity:
- **Storage:** Messages are stored in the Appwrite `MESSAGES` collection.
- **Scope:** Chats are partitioned by `chatKey`, which usually corresponds to a specific block or a global context (e.g., `general` or `guided-create`).
- **Context Window:** The last 100 messages are loaded to provide conversational context, though the primary context remains the current canvas state.

## 5. Key Tools and Interaction Patterns

### `proposeBlockEdit` (CRITICAL)
The AI is instructed to **never** describe changes in text. It must use this tool to propose specific edits.
- **UX Impact:** Users see a "Diff Card" where they can compare `oldContent` and `newContent` and click "Accept" to apply the change.
- **Modes:** Can target `bmc`, `lean`, or `both` (for shared blocks).

### `analyzeBlock`
Used during block-level chat to provide structured feedback:
- **Draft:** Improved content.
- **Assumptions:** Hidden leaps of faith.
- **Risks:** Potential failure points.
- **Questions:** What the founder needs to answer next.

### `checkConsistency`
Used by the General Agent to map the relationships between blocks, identifying major/critical contradictions or missing logical links.

---

## 6. Development Guidelines

When modifying AI behavior:
1. **Prompts:** Logic for prompt building resides in `lib/ai/prompts.ts`.
2. **Context:** If adding new data types to blocks, update `serializeCanvasState` in `lib/ai/prompts.ts` and `summarizeDeepDive`.
3. **Tools:** New tool definitions go in `lib/ai/tools.ts`.
4. **Types:** Update `lib/types/ai.ts` and `lib/types/canvas.ts`.
