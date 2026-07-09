# Business Model Operating System — Multi-Phase Plan

**Date:** 2026-07-09
**Status:** Planning only — nothing built yet
**Intent:** Upgrade RocketMap from "interactive BMC" to a **Business Model Operating System (BM-OS)**: a connected flow of `market → customer → value proposition → product → economics → partnerships → scalability → execution metrics`, where every block resolves to testable decisions (assumption → evidence → metric → experiment → kill/pivot/double-down).

---

## 1. Where We Already Are (Asset Inventory)

Before scoping new work, map the 20-system rescope onto what exists in the codebase today. This changes the plan significantly — roughly a third of the framework already has working infrastructure.

| System (from rescope) | Existing asset | Coverage |
| --- | --- | --- |
| 1. Customer Segment System | Market Research deep-dive: `SegmentationModule`, `PersonaModule`, `Segment` / `CustomerSegment` types | ~60% — missing user/buyer/decision-maker/influencer role split |
| 2. Problem / JTBD System | Nothing structured (free text in Value Prop block) | 0% |
| 3. Market Sizing System | `TamSamSomModule`, `TamSamSomVisual`, `MarketValidationModule` | ~80% — missing urgency score (frequency × intensity × budget × timing) |
| 4. Beachhead Strategy | Segment-eval suite: `DecisionMatrix`, `RadarChart`, `BeachheadDecision`, `SegmentScorecard` | ~80% — criteria mostly match rescope's 6 |
| 5. Value Proposition System | Block content + AI analysis only | ~15% — no per-customer value mapping, no positioning template |
| 6. Product Scope System | Nothing | 0% — pain → outcome → feature → metric chain missing |
| 7. Revenue Model System | Revenue block content, `SegmentEconomics` | ~25% — no per-segment revenue model catalog, no "payment moment" concept |
| 8. Pricing + WTP System | Nothing | 0% |
| 9. Unit Economics System | `EconomicsView`, `SegmentEconomicsCard`, `SensitivityPanel`, `EconomicsAlert` | ~70% — B2C model exists; B2B contract + marketplace models missing |
| 10. Cost Structure System | Partially inside unit economics | ~40% — no fixed/variable/scaling classification |
| 11. Channel + Distribution System | Channels block content only | ~10% — no funnel-stage decomposition (awareness→expansion), no per-channel CAC |
| 12. Customer Relationship System | Block content only | ~10% |
| 13. Partnership System | Key Partners block content only | ~10% — no give/take/pilot/KPI structure |
| 14. Key Resources System | Block content only | ~10% — no asset classification (data/content/tech/brand/network/process) |
| 15. Key Activities System | Block content only | ~10% — no operating-engine grouping |
| 16. Scalability System | Nothing | 0% |
| 17. Defensibility System | Nothing | 0% |
| 18. Metrics / KR System | `ViabilityData`, `RiskMetrics`, viability score | ~40% — score exists; assumption→metric mapping and user-defined KRs missing |
| 19. Experiment System | Risk Engine: `Assumption`, `Experiment`, evidence, kanban | ~75% — missing success thresholds as first-class field |
| 20. Kill / Pivot / Double Down Logic | Nothing (evidence auto-updates status, but no decision layer) | 0% |

**Cross-cutting existing assets:** Consistency Checker (cross-block reasoning), canvas serialization for AI context (`canvas-state.ts`), deep-dive persistence pattern (`deepDiveJson`), agent config per block (`agents.ts`), AI tool pattern (structured output extractors in `tools.ts`).

**Conclusion:** This is not a greenfield build. It is (a) three genuinely new engines, (b) structured upgrades to four thin blocks, and (c) a connective layer that turns isolated modules into one flow.

---

## 2. Core Architectural Insight

The rescope's real upgrade is not 20 more panels. It is two things:

1. **The Dependency Chain.** `segment → JTBD → beachhead → value prop → product → payment moment → unit economics → channel → partnership → operating model → scalability → defensibility → metrics → experiments`. Each stage consumes the previous stage's structured output. Today's modules are islands; the BM-OS makes them a pipeline.
2. **The Decision Contract.** Every zone answers the same five questions: What is the assumption? What evidence supports it? What metric proves it? What experiment tests it? What decision does it affect? The Risk Engine already implements assumption→experiment→evidence — the missing pieces are *metric thresholds* and the *decision layer* (kill/pivot/double-down).

Therefore the load-bearing new artifact is a **shared schema**, not any single UI:

```ts
// Conceptual — every zone module emits ZoneOutput
interface ZoneOutput {
  zone: ZoneId;                    // 8 zones
  structuredData: unknown;          // zone-specific (JTBD statements, pricing tests, moat map…)
  assumptions: string[];            // feeds Risk Engine
  metrics: MetricDefinition[];      // name, target threshold, current value, linked assumption
  feedsInto: ZoneId[];              // dependency chain edges
  decisionSignal?: 'kill' | 'pivot' | 'double_down' | 'insufficient_evidence';
}
```

Consistency Checker upgrades from "compare block texts" to "validate the chain": does TAM support revenue projections, does CAC assumption match chosen channel, does pricing exceed unit cost, does the beachhead match the value prop's target customer.

---

## 3. Zone Model (UI-Level Grouping)

Use the 8 zones as the navigation/UX layer; the 20 systems live inside them as modules. Zones map onto the existing Layer-2 deep-dive pattern (`DeepDiveOverlay`), extended so a zone can span multiple BMC blocks.

| Zone | Systems inside | Existing entry point |
| --- | --- | --- |
| Z1 Customer + Market | 1 Segments, 3 Market Sizing, 4 Beachhead | Customer Segments deep-dive (exists) |
| Z2 Pain + JTBD | 2 JTBD | New module, entered from Customer Segments or Value Prop |
| Z3 Value ↔ Product | 5 Value Prop, 6 Product Scope | New, from Value Proposition block |
| Z4 Revenue + Pricing | 7 Revenue Model, 8 Pricing/WTP | New, from Revenue Streams block |
| Z5 Unit Economics | 9 Unit Econ, 10 Cost Structure | Unit-economics view (exists, extend) |
| Z6 Distribution + Growth | 11 Channels, 12 Relationships | New, from Channels block |
| Z7 Partnership | 13 Partnerships | New, from Key Partners block |
| Z8 Scalability + Defensibility | 14 KR, 15 KA, 16 Scalability, 17 Defensibility | New, from KR/KA blocks |
| Strategy layer (above zones) | 18 Metrics/KR, 19 Experiments, 20 Kill/Pivot | Risk Engine + Analysis tab (exist, extend) |

---

## 4. Lean-Startup Phasing (Build → Measure → Learn per phase)

Each phase is shippable, tests one hypothesis about *our own product*, and has an explicit kill/pivot gate. Do not start phase N+1 until phase N's learn gate is evaluated.

### Phase 0 — Foundation: Zone Schema + Decision Layer *(the spine, ~small)*

**Hypothesis:** connecting existing modules through a shared contract makes the tool feel like a system, not a form.

- Define `ZoneOutput`, `MetricDefinition`, `DecisionSignal` types in `lib/types/canvas.ts` (or new `lib/types/zones.ts`).
- Add `successThreshold` to `Experiment`; add decision field (`kill | pivot | double_down`) recorded on assumption resolution.
- Retrofit adapters: market research, segment eval, and unit economics each emit `ZoneOutput` (read-only mapping over existing `deepDiveJson` — no data migration).
- Dependency-chain map: static config `lib/zones/chain.ts` declaring which zone feeds which.
- Consistency Checker v2 prompt: consume chain + zone outputs, flag broken links (TAM vs revenue, price vs cost, beachhead vs value prop target).

**Manual Appwrite schema delta for Phase 0 implementation:**

- `experiments.successThreshold`: String(500), optional.
- `assumptions.decisionSignal`: Enum values `kill`, `pivot`, `double_down`, `insufficient_evidence`, optional.

**Measure:** consistency checker produces chain-level contradictions on an existing canvas.
**Kill gate:** if retrofit shows the chain adds no findings beyond current checker, rethink before building new zones.

### Phase 1 — Riskiest Missing Zones: JTBD + Value↔Product + Revenue/Pricing *(the "does anyone pay" spine)*

Lean logic: the most dangerous untested part of any business model is problem→value→payment. Build the zones that test it.

- **Z2 JTBD module:** structured JTBD statements (`When [situation], I want [job], so I can [outcome]`) + 5 pain types (functional/emotional/social/economic/status) + role split on segments (user/buyer/decision-maker/influencer/beneficiary/economic customer). Extends `Segment` type.
- **Z3 Value Prop module:** per-customer-role value mapping + positioning template (`For [customer], who [pain], we [outcome], through [mechanism], unlike [alternative]`). **Product Scope table:** pain → outcome → feature → proof metric (each row auto-creates a metric + assumption).
- **Z4 Revenue + Pricing module:** revenue model catalog per segment (one-time / license / rev-share / SaaS / sponsorship), **payment-moment field** ("what moment creates enough value someone pays now"), WTP test designer that generates Risk Engine experiments (reserve/deposit/paid-pilot — not "would you pay" surveys).
- Each module follows the established pattern: deep-dive overlay + AI tool (structured extractor) + `deepDiveJson` persistence + `ZoneOutput` emission.

**Measure:** user can trace segment → JTBD → value prop → product feature → payment moment on one canvas; each step spawned assumptions in the Risk Engine.
**Learn gate:** demo to 3–5 target users. If they engage with JTBD/pricing but ignore product-scope table, cut/simplify Z3 in later phases.

### Phase 2 — Economics Completion + Kill/Pivot Logic *(the "is it a business" layer)*

- Extend unit economics: B2B contract model (contract value, sales payback, renewal rate) + marketplace model (take rate, contribution margin), selected per revenue model from Z4.
- Cost Structure classification: fixed vs variable vs sales vs support vs content; flag "which costs grow per customer" (the margin-death detector).
- **Decision Engine (system 20):** rules + AI over zone outputs → recommended kill/pivot/double-down with rationale ("students complete but parents don't pay → change buyer"). Surfaces in Analysis tab. Human confirms; decision is recorded with timestamp and evidence links.
- Metrics/KR system: user-defined KRs bound to assumptions and zone metrics; simple progress view.

**Measure:** viability score becomes chain-aware (broken chain link caps the score).
**Learn gate:** does decision engine output change what a test user does next? If ignored, it's a reporting problem, not a modeling problem — fix presentation before adding zones.

### Phase 3 — Growth Zones: Distribution + Partnerships *(how it scales commercially)*

- **Z6 Distribution:** channel decomposition by funnel stage (awareness/acquisition/activation/conversion/retention/expansion), per-channel record (audience, message, cost, conversion, CAC, scalability), the "can this bring 100 similar customers" test. Feeds CAC into Z5.
- Customer Relationship system: per-customer-role relationship model (lightweight — mostly structured content, not calculators).
- **Z7 Partnership:** give/take trade structure per partner (why → give → take → pilot format → success metric → expansion path), 5 partnership jobs classification (distribution/credibility/delivery/content/monetization). Partner-sourced-users metric feeds Z6.

**Learn gate:** are users creating partnership entries with real pilots, or is it aspirational filler? If filler, gate the module behind having a validated beachhead.

### Phase 4 — Long-Game Zones: Operating Model + Scalability + Defensibility

- KR/KA structured classification (asset types, activity groups).
- Scalability analysis: scalable vs non-scalable asset/activity tagging, "manual → template → software → partners" maturity ladder, human-hours-per-customer metric.
- Defensibility: moat map (data/network/brand/process/content/distribution/community), AI adversarial critique ("AI is not a moat by itself").
- These are deliberately last: pre-traction startups get little value here, and the AI critique quality depends on all upstream zone data existing.

### Explicitly deferred / cut for now

- Shock scenario simulation (already on roadmap; belongs after Phase 2 — needs economics + chain).
- Streaming AI responses — orthogonal infra, do whenever.
- Canvas export/sharing — orthogonal.
- Zone-level fancy visualizations beyond existing patterns — reuse `TamSamSomVisual` / `RadarChart` idioms first.

---

## 5. Multi-Agent Orchestration Plan

### Why multi-agent

One prompt cannot hold 8 zones × structured schemas × cross-zone validation and stay reliable. But agents are expensive and each starts cold — so the design principle is: **specialist agents per zone, one orchestrator, shared canvas state as the blackboard.** No agent-to-agent chatter; all coordination through persisted `ZoneOutput` data.

### Agent roster

| Agent | Role | Tools (extends existing pattern in `lib/ai/tools.ts` / `agents.ts`) | Runs when |
| --- | --- | --- | --- |
| **Orchestrator** | Reads full canvas + chain state, decides which zone agent(s) to invoke, sequences them along the dependency chain, merges results | zone-dispatch, chain-state read | User clicks "Analyze Business Model" or zone data changes materially |
| **Zone Agents (8)** | One per zone. Each has zone-specific system prompt + structured-output tools (e.g. `generateJTBD`, `designWTPTest`, `mapMoats`). Gets full canvas as context, focuses on its zone (existing pattern from CLAUDE.md) | Zone-specific extractors + `searchWeb` where research-heavy (Z1, Z6, Z7) | On-demand per zone, or dispatched by orchestrator |
| **Chain Validator** | Consistency Checker v2 — validates edges of the dependency chain, emits contradictions with severity + specific zone/block refs | read-only over all `ZoneOutput`s | After any zone agent completes; after user edits |
| **Experiment Designer** | Turns any assumption into cheapest-possible test with success threshold (the rescope's "fastest test" table as prompt knowledge) | `createExperiment` (exists in Risk Engine, extend with threshold) | User asks to test an assumption; orchestrator flags untested high-risk assumption |
| **Decision Judge** | Evaluates evidence vs thresholds across zones, proposes kill/pivot/double-down with rationale | read-only + `proposeDecision` | Experiment completes; user requests strategy review |

### Orchestration mechanics

1. **Blackboard, not message-passing.** Agents never talk to each other. Each reads canvas + zone outputs from Appwrite (extend `canvas-state.ts` to load zone data), writes structured results back. Orchestrator only sequences.
2. **Chain-ordered execution.** Full-model analysis runs zones in dependency order (Z1 → Z2 → Z3 → Z4 → Z5 → Z6 → Z7 → Z8), each agent seeing upstream outputs. Independent zones (Z6, Z7) can run in parallel.
3. **Incremental invocation is the default.** Full-chain runs are expensive; normal flow is: user works in one zone → that zone agent runs → chain validator checks only affected edges (dirty-edge propagation via `feedsInto`).
4. **Gating carried over.** Zone agents gated like current deep-dive AI (canvas sufficiently filled); downstream zone agents additionally soft-gated on upstream `ZoneOutput` existing — warn, don't block.
5. **Implementation substrate:** stays in current stack — AI SDK `generateText` with tools, per-agent config via extended `getAgentConfig`. Orchestrator is initially a **deterministic TypeScript sequencer** (chain config + dirty flags), not an LLM — cheaper, debuggable. Promote to LLM-planned orchestration only if deterministic sequencing proves insufficient.
6. **Cost control:** zone agents receive summarized upstream outputs (extend the existing deep-dive-summary serialization), not raw JSON dumps; track per-agent usage via existing `usage-events.ts` / quota system.

### Multi-agent rollout by phase

- **Phase 0:** deterministic orchestrator skeleton + Chain Validator (upgrade of consistency checker). No new zone agents.
- **Phase 1:** Z2/Z3/Z4 zone agents + Experiment Designer upgrade (thresholds).
- **Phase 2:** Decision Judge + Z5 agent extension.
- **Phase 3:** Z6/Z7 agents (searchWeb-enabled).
- **Phase 4:** Z8 agent + full-chain "Analyze Business Model" run.

---

## 6. What's Important Now vs Later

**Now (Phases 0–1):**
1. Zone schema + decision contract (Phase 0) — everything else hangs off it; cheap; de-risks the whole plan.
2. Chain-aware Consistency Checker — upgrades the existing killer feature immediately.
3. JTBD + Value↔Product + Revenue/Pricing zones — the lean-riskiest part of any user's business model, and the biggest content gap in the current product.
4. Success thresholds on experiments — one field, unlocks the decision layer.

**Later:**
- B2B/marketplace economics, Decision Judge (Phase 2) — valuable but needs Phase 1 data to judge.
- Distribution + Partnership zones (Phase 3) — matter after a beachhead is validated; premature before.
- Scalability + Defensibility (Phase 4) — real for post-traction startups; low value for the demo-stage user.
- LLM-planned orchestration, shock simulation, streaming, export — defer.

**Kill criteria for the whole initiative:** if Phase 1 user tests show people want faster canvas-filling rather than deeper decision structure, the BM-OS thesis is wrong for the current audience — pivot toward guided-creation polish instead of adding zones.

---

## 7. Open Questions (decide before Phase 1 build)

1. **Zone navigation UX:** zones as tabs in existing `DeepDiveOverlay`, or a new "system map" view above the canvas? (Recommend: reuse overlay per zone first; system-map view only after 4+ zones exist.)
2. **Appwrite schema:** zone outputs in per-block `deepDiveJson` (current pattern) vs new `zones` table keyed by canvas. Multi-block zones (Z3, Z5, Z8) fit awkwardly in per-block JSON — likely need the table by Phase 1. Manual console setup required either way (known gotcha).
3. **Decision records:** append-only log (pivot history is itself valuable data) vs mutable current-state. Recommend append-only.
4. **Per-zone AI gating thresholds:** keep the all-9-blocks rule, or relax to "upstream zones complete"? Recommend relaxing — the chain gives a better readiness signal than block character counts.
