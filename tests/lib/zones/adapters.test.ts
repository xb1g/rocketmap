import { describe, expect, it } from "vitest";
import type { BlockData } from "@/lib/types/canvas";
import { buildZoneOutputs } from "@/lib/zones/adapters";

function block(partial: Partial<BlockData> & Pick<BlockData, "blockType">): BlockData {
  return {
    blockType: partial.blockType,
    content: partial.content ?? { bmc: "", lean: "", items: [] },
    state: partial.state ?? "calm",
    aiAnalysis: partial.aiAnalysis ?? null,
    confidenceScore: partial.confidenceScore ?? 0,
    riskScore: partial.riskScore ?? 0,
    deepDiveData: partial.deepDiveData ?? null,
    linkedSegments: partial.linkedSegments ?? [],
  };
}

describe("buildZoneOutputs Phase 1 adapters", () => {
  it("emits JTBD assumptions and metrics from customer segment deep-dive data", () => {
    const outputs = buildZoneOutputs([
      block({
        blockType: "customer_segments",
        content: { bmc: "Parents of middle-school students", lean: "", items: [] },
        deepDiveData: {
          tamSamSom: null,
          segmentation: null,
          personas: null,
          marketValidation: null,
          competitiveLandscape: null,
          jtbd: {
            statements: [
              {
                id: "jtbd-1",
                segmentId: "seg-1",
                role: "buyer",
                situation: "homework becomes a nightly fight",
                job: "find a trusted tutor quickly",
                outcome: "avoid falling behind before exams",
                painTypes: ["emotional", "economic"],
                evidence: "Interviewed 6 parents",
                confidence: "medium",
              },
            ],
          },
        },
      }),
    ]);

    const jtbd = outputs.find((output) => output.zone === "pain_jtbd");
    expect(jtbd?.readiness).toBe("ready");
    expect(jtbd?.assumptions).toContain(
      "buyer job for seg-1: find a trusted tutor quickly",
    );
    expect(jtbd?.metrics).toContainEqual(
      expect.objectContaining({
        id: "jtbd-confidence-jtbd-1",
        name: "JTBD confidence: buyer",
        currentValue: "medium",
      }),
    );
  });

  it("emits product proof metrics from value/product deep-dive data", () => {
    const outputs = buildZoneOutputs([
      block({
        blockType: "value_prop",
        content: { bmc: "AI tutor matching for parents", lean: "", items: [] },
        deepDiveData: {
          tamSamSom: null,
          segmentation: null,
          personas: null,
          marketValidation: null,
          competitiveLandscape: null,
          valueProduct: {
            positioning: {
              customer: "busy parents",
              pain: "cannot assess tutor quality",
              outcome: "book a trusted tutor in one evening",
              mechanism: "verified tutor matching",
              alternative: "marketplace browsing",
            },
            productScope: [
              {
                id: "scope-1",
                pain: "Cannot assess quality",
                outcome: "Trust tutor fit",
                feature: "verified tutor profiles",
                proofMetric: "40% booking conversion",
              },
            ],
          },
        },
      }),
    ]);

    const valueProduct = outputs.find((output) => output.zone === "value_product");
    expect(valueProduct?.readiness).toBe("ready");
    expect(valueProduct?.metrics).toContainEqual(
      expect.objectContaining({
        id: "product-proof-scope-1",
        name: "Proof metric: verified tutor profiles",
        targetThreshold: "40% booking conversion",
      }),
    );
    expect(valueProduct?.assumptions).toContain(
      "verified tutor profiles will produce Trust tutor fit",
    );
  });

  it("emits payment-moment and WTP test signals from revenue/pricing data", () => {
    const outputs = buildZoneOutputs([
      block({
        blockType: "revenue_streams",
        content: { bmc: "Monthly subscription", lean: "", items: [] },
        deepDiveData: {
          tamSamSom: null,
          segmentation: null,
          personas: null,
          marketValidation: null,
          competitiveLandscape: null,
          revenuePricing: {
            models: [
              {
                id: "rev-1",
                segmentId: "seg-1",
                model: "saas",
                paymentMoment: "parent sees three verified tutors ready tonight",
                price: "$39/mo",
              },
            ],
            wtpTests: [
              {
                id: "wtp-1",
                segmentId: "seg-1",
                testType: "paid_pilot",
                description: "Offer a paid tutor-matching pilot",
                successCriteria: "5 parents pay for the pilot",
                successThreshold: "5 paid pilots in 14 days",
                durationEstimate: "2 weeks",
                costEstimate: "$100",
              },
            ],
          },
        },
      }),
    ]);

    const revenuePricing = outputs.find((output) => output.zone === "revenue_pricing");
    expect(revenuePricing?.readiness).toBe("ready");
    expect(revenuePricing?.assumptions).toContain(
      "seg-1 will pay $39/mo at moment: parent sees three verified tutors ready tonight",
    );
    expect(revenuePricing?.metrics).toContainEqual(
      expect.objectContaining({
        id: "wtp-threshold-wtp-1",
        name: "WTP test threshold: paid_pilot",
        targetThreshold: "5 paid pilots in 14 days",
      }),
    );
  });
});
