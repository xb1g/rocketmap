"use client";

import { useState } from "react";
import type {
  BlockData,
  MarketResearchData,
  Segment,
} from "@/lib/types/canvas";
import { TamSamSomModule } from "@/app/components/blocks/market-research/TamSamSomModule";
import { InlineSegmentEval } from "@/app/components/blocks/segment-eval/InlineSegmentEval";

interface MarketViewProps {
  canvasId: string;
  customerSegmentsBlock: BlockData | undefined;
  segments: Segment[];
  allBlocksFilled: boolean;
  filledCount: number;
  readOnly: boolean;
  onDataChange: (data: MarketResearchData) => void;
  onOpenCustomerSegments: () => void;
}

const EMPTY_MARKET_DATA: MarketResearchData = {
  tamSamSom: null,
  segmentation: null,
  personas: null,
  marketValidation: null,
  competitiveLandscape: null,
};

function formatCurrency(value: number | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function MarketView({
  canvasId,
  customerSegmentsBlock,
  segments,
  allBlocksFilled,
  filledCount,
  readOnly,
  onDataChange,
  onOpenCustomerSegments,
}: MarketViewProps) {
  const data = customerSegmentsBlock?.deepDiveData ?? EMPTY_MARKET_DATA;
  const linkedSegments = customerSegmentsBlock?.linkedSegments ?? [];
  const scorecards = data.scorecards ?? [];
  const primaryBeachhead = scorecards
    .filter((scorecard) => scorecard.beachheadStatus === "primary")
    .sort((a, b) => b.overallScore - a.overallScore)[0];
  const primarySegment = linkedSegments.find(
    (segment) => segment.$id === primaryBeachhead?.segmentId,
  );
  const [generatingTam, setGeneratingTam] = useState(false);

  const handleGenerateTam = async (inputs: Record<string, string>) => {
    if (readOnly || !allBlocksFilled || generatingTam) return;
    setGeneratingTam(true);

    try {
      const res = await fetch(
        `/api/canvas/${canvasId}/blocks/customer_segments/deep-dive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module: "tam_sam_som", inputs }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        onDataChange(json.updatedDeepDive as MarketResearchData);
      }
    } finally {
      setGeneratingTam(false);
    }
  };

  const handleSaveTam = async (tamSamSom: NonNullable<MarketResearchData["tamSamSom"]>) => {
    if (readOnly) return;
    const updated = { ...data, tamSamSom };
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
            <h2 className="market-view-title">Market</h2>
          </div>
          <div className="market-view-summary" aria-label="Market summary">
            <div>
              <span>TAM</span>
              <strong>{formatCurrency(data.tamSamSom?.tam?.value)}</strong>
            </div>
            <div>
              <span>SAM</span>
              <strong>{formatCurrency(data.tamSamSom?.sam?.value)}</strong>
            </div>
            <div>
              <span>Beachhead</span>
              <strong>{primarySegment?.name ?? "Unset"}</strong>
            </div>
          </div>
        </div>

        {!allBlocksFilled && !readOnly && (
          <div className="market-view-notice">
            Fill all 9 canvas blocks to unlock AI market sizing. Current progress:
            {" "}
            {filledCount}/9.
          </div>
        )}

        <div className="market-view-grid">
          <section className="market-view-panel">
            <div className="market-view-panel-header">
              <div>
                <div className="market-view-kicker">Market size</div>
                <h3>TAM / SAM / SOM</h3>
              </div>
              <button
                type="button"
                className="market-view-link"
                onClick={onOpenCustomerSegments}
              >
                Open customer block
              </button>
            </div>
            <TamSamSomModule
              data={data.tamSamSom}
              isGenerating={generatingTam}
              aiEnabled={allBlocksFilled && !readOnly}
              onGenerate={handleGenerateTam}
              onSave={handleSaveTam}
            />
          </section>

          <section className="market-view-panel">
            <div className="market-view-panel-header">
              <div>
                <div className="market-view-kicker">Beachhead</div>
                <h3>Segment decision</h3>
              </div>
              <span className="market-view-count">
                {linkedSegments.length || segments.length} segments
              </span>
            </div>

            {customerSegmentsBlock && linkedSegments.length > 0 ? (
              <InlineSegmentEval
                canvasId={canvasId}
                block={customerSegmentsBlock}
                segments={linkedSegments}
                onDataChange={onDataChange}
              />
            ) : (
              <div className="market-view-empty">
                <h4>No linked customer segments yet</h4>
                <p>
                  Add customer segments in the canvas, then score them here to
                  choose the first beachhead.
                </p>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm ui-btn-secondary"
                  onClick={onOpenCustomerSegments}
                >
                  Add segments
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
