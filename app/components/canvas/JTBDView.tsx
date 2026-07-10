"use client";

import { useState } from "react";
import type {
  BlockData,
  MarketResearchData,
  Segment,
} from "@/lib/types/canvas";
import { JTBDModule } from "@/app/components/blocks/jtbd/JTBDModule";
import { normalizeJTBDData } from "@/lib/zones/phase1-jtbd";

interface JTBDViewProps {
  canvasId: string;
  customerSegmentsBlock: BlockData | undefined;
  segments: Segment[];
  allBlocksFilled: boolean;
  filledCount: number;
  readOnly: boolean;
  onDataChange: (data: MarketResearchData) => void;
  onOpenCustomerSegments: () => void;
}

const EMPTY_DEEP_DIVE_DATA: MarketResearchData = {
  tamSamSom: null,
  segmentation: null,
  personas: null,
  marketValidation: null,
  competitiveLandscape: null,
};

export function JTBDView({
  canvasId,
  customerSegmentsBlock,
  segments,
  allBlocksFilled,
  filledCount,
  readOnly,
  onDataChange,
  onOpenCustomerSegments,
}: JTBDViewProps) {
  const data = customerSegmentsBlock?.deepDiveData ?? EMPTY_DEEP_DIVE_DATA;
  const linkedSegments = customerSegmentsBlock?.linkedSegments ?? [];
  const segmentOptions = (linkedSegments.length > 0 ? linkedSegments : segments).map((segment) => ({
    id: segment.$id ?? String(segment.id ?? segment.name),
    $id: segment.$id,
    name: segment.name,
  }));
  const normalizedJtbd = normalizeJTBDData(data.jtbd);
  const roles = new Set(normalizedJtbd.statements.map((statement) => statement.role));
  const [generatingJtbd, setGeneratingJtbd] = useState(false);

  const handleGenerateJtbd = async () => {
    if (readOnly || !allBlocksFilled || generatingJtbd) return;
    setGeneratingJtbd(true);

    try {
      const res = await fetch(
        `/api/canvas/${canvasId}/blocks/customer_segments/deep-dive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module: "jtbd", inputs: {} }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        onDataChange(json.updatedDeepDive as MarketResearchData);
      }
    } finally {
      setGeneratingJtbd(false);
    }
  };

  const handleSaveJtbd = async (jtbd: NonNullable<MarketResearchData["jtbd"]>) => {
    if (readOnly) return;
    const updated = { ...data, jtbd };
    onDataChange(updated);

    await fetch(`/api/canvas/${canvasId}/blocks/customer_segments/deep-dive`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deepDiveJson: JSON.stringify(updated) }),
    });
  };

  return (
    <div className="market-view flex-1 overflow-y-auto px-2 py-3 md:px-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="market-view-header">
          <div>
            <div className="market-view-kicker">Focused view</div>
            <h2 className="market-view-title">JTBD</h2>
          </div>
          <div className="market-view-summary" aria-label="JTBD summary">
            <div>
              <span>Statements</span>
              <strong>{normalizedJtbd.statements.length}</strong>
            </div>
            <div>
              <span>Roles</span>
              <strong>{roles.size}</strong>
            </div>
            <div>
              <span>Segments</span>
              <strong>{segmentOptions.length}</strong>
            </div>
          </div>
        </div>

        {!allBlocksFilled && !readOnly && (
          <div className="market-view-notice">
            Fill all 9 canvas blocks to unlock AI JTBD generation. Current progress:
            {" "}
            {filledCount}/9.
          </div>
        )}

        <section className="market-view-panel">
          <div className="market-view-panel-header">
            <div>
              <div className="market-view-kicker">Pain + Jobs</div>
              <h3>Jobs to be Done</h3>
            </div>
            <button
              type="button"
              className="market-view-link"
              onClick={onOpenCustomerSegments}
            >
              Open customer block
            </button>
          </div>
          <JTBDModule
            data={normalizedJtbd}
            segments={segmentOptions}
            isGenerating={generatingJtbd}
            aiEnabled={allBlocksFilled && !readOnly}
            onGenerate={handleGenerateJtbd}
            onSave={handleSaveJtbd}
          />
        </section>
      </div>
    </div>
  );
}
