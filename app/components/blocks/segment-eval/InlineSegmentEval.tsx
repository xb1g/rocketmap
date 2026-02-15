'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  BlockData,
  Segment,
  MarketResearchData,
  SegmentScorecard,
  SegmentProfile,
} from '@/lib/types/canvas';
import { SegmentSnapshot } from './SegmentSnapshot';
import { DecisionMatrix } from './DecisionMatrix';
import { BeachheadDecision, type ComparisonResult } from './BeachheadDecision';

interface InlineSegmentEvalProps {
  canvasId: string;
  block: BlockData;
  segments: Segment[];
  onDataChange: (data: MarketResearchData) => void;
}

export function InlineSegmentEval({
  canvasId,
  block,
  segments,
  onDataChange,
}: InlineSegmentEvalProps) {
  const data: MarketResearchData = block.deepDiveData ?? {
    tamSamSom: null,
    segmentation: null,
    personas: null,
    marketValidation: null,
    competitiveLandscape: null,
  };
  const scorecards = data.scorecards ?? [];
  const linked = block.linkedSegments ?? [];

  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(
    linked.length > 0 ? linked[0].id : null,
  );
  const [isScoring, setIsScoring] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isSuggestingProfile, setIsSuggestingProfile] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const putTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedSegment = linked.find((s) => s.id === selectedSegmentId) ?? null;
  const selectedScorecard = scorecards.find((s) => s.segmentId === selectedSegmentId) ?? null;

  // Persist deep-dive data (debounced)
  const persistDeepDive = useCallback(
    (updatedData: MarketResearchData) => {
      onDataChange(updatedData);
      if (putTimer.current) clearTimeout(putTimer.current);
      putTimer.current = setTimeout(async () => {
        await fetch(
          `/api/canvas/${canvasId}/blocks/customer_segments/deep-dive`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deepDiveJson: JSON.stringify(updatedData) }),
          },
        );
      }, 800);
    },
    [canvasId, onDataChange],
  );

  // Score a segment via AI
  const handleScore = useCallback(async () => {
    if (!selectedSegment || isScoring) return;
    setIsScoring(true);
    setComparisonResult(null);

    try {
      const res = await fetch(
        `/api/canvas/${canvasId}/blocks/customer_segments/deep-dive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module: 'segment_scoring',
            inputs: {
              segmentId: String(selectedSegment.id),
              segmentName: selectedSegment.name,
              segmentDescription: selectedSegment.description,
              demographics: selectedSegment.demographics,
              psychographics: selectedSegment.psychographics,
              behavioral: selectedSegment.behavioral,
              geographic: selectedSegment.geographic,
            },
          }),
        },
      );

      if (res.ok) {
        const { updatedDeepDive } = await res.json();
        onDataChange(updatedDeepDive as MarketResearchData);
      }
    } catch {
      // silently fail
    } finally {
      setIsScoring(false);
    }
  }, [canvasId, selectedSegment, isScoring, onDataChange]);

  // Compare two segments
  const handleCompare = useCallback(
    async (otherSegmentId: number) => {
      if (!selectedSegment || isComparing) return;
      const otherSegment = linked.find((s) => s.id === otherSegmentId);
      if (!otherSegment) return;

      setIsComparing(true);
      setComparisonResult(null);

      try {
        const res = await fetch(
          `/api/canvas/${canvasId}/blocks/customer_segments/deep-dive`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              module: 'segment_comparison',
              inputs: {
                segmentAId: String(selectedSegment.id),
                segmentAName: selectedSegment.name,
                segmentADescription: selectedSegment.description,
                segmentBId: String(otherSegment.id),
                segmentBName: otherSegment.name,
                segmentBDescription: otherSegment.description,
              },
            }),
          },
        );

        if (res.ok) {
          const { result } = await res.json();
          setComparisonResult(result as ComparisonResult);
        }
      } catch {
        // silently fail
      } finally {
        setIsComparing(false);
      }
    },
    [canvasId, selectedSegment, linked, isComparing],
  );

  // Handle manual score edit on a criterion
  const handleCriterionScoreChange = useCallback(
    (criterionId: string, score: number) => {
      if (!selectedScorecard) return;

      const updatedCriteria = selectedScorecard.criteria.map((c) =>
        c.id === criterionId ? { ...c, score } : c,
      );

      const categoryWeights = { demand: 0.3, market: 0.4, execution: 0.3 };
      let overall = 0;
      for (const [cat, catWeight] of Object.entries(categoryWeights)) {
        const catCriteria = updatedCriteria.filter((c) => c.category === cat);
        const totalWeight = catCriteria.reduce((s, c) => s + c.weight, 0);
        if (totalWeight > 0) {
          const catScore = catCriteria.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight;
          overall += catScore * catWeight;
        }
      }

      const updatedScorecard: SegmentScorecard = {
        ...selectedScorecard,
        criteria: updatedCriteria,
        overallScore: Math.round(overall * 10) / 10,
        lastUpdated: new Date().toISOString(),
      };

      const updatedData: MarketResearchData = {
        ...data,
        scorecards: [
          ...(data.scorecards ?? []).filter((s) => s.segmentId !== selectedScorecard.segmentId),
          updatedScorecard,
        ],
      };
      persistDeepDive(updatedData);
    },
    [selectedScorecard, data, persistDeepDive],
  );

  const handleCriterionWeightChange = useCallback(
    (criterionId: string, weight: number) => {
      if (!selectedScorecard) return;

      const updatedCriteria = selectedScorecard.criteria.map((c) =>
        c.id === criterionId ? { ...c, weight } : c,
      );

      const updatedScorecard: SegmentScorecard = {
        ...selectedScorecard,
        criteria: updatedCriteria,
        lastUpdated: new Date().toISOString(),
      };

      const updatedData: MarketResearchData = {
        ...data,
        scorecards: [
          ...(data.scorecards ?? []).filter((s) => s.segmentId !== selectedScorecard.segmentId),
          updatedScorecard,
        ],
      };
      persistDeepDive(updatedData);
    },
    [selectedScorecard, data, persistDeepDive],
  );

  const handleArpuChange = useCallback(
    (arpu: number) => {
      if (!selectedScorecard) return;
      const updatedScorecard: SegmentScorecard = {
        ...selectedScorecard,
        arpu,
        lastUpdated: new Date().toISOString(),
      };
      const updatedData: MarketResearchData = {
        ...data,
        scorecards: [
          ...(data.scorecards ?? []).filter((s) => s.segmentId !== selectedScorecard.segmentId),
          updatedScorecard,
        ],
      };
      persistDeepDive(updatedData);
    },
    [selectedScorecard, data, persistDeepDive],
  );

  // Profile change (debounced persist)
  const handleProfileChange = useCallback(
    (profile: SegmentProfile) => {
      if (selectedSegmentId == null) return;
      const updatedData: MarketResearchData = {
        ...data,
        segmentProfiles: {
          ...(data.segmentProfiles ?? {}),
          [String(selectedSegmentId)]: profile,
        },
      };
      persistDeepDive(updatedData);
    },
    [selectedSegmentId, data, persistDeepDive],
  );

  // AI suggest profile
  const handleSuggestProfile = useCallback(async () => {
    if (!selectedSegment || isSuggestingProfile) return;
    setIsSuggestingProfile(true);

    try {
      const res = await fetch(
        `/api/canvas/${canvasId}/blocks/customer_segments/deep-dive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module: 'segment_profile',
            inputs: {
              segmentId: String(selectedSegment.id),
              segmentName: selectedSegment.name,
              segmentDescription: selectedSegment.description,
            },
          }),
        },
      );

      if (res.ok) {
        const { updatedDeepDive } = await res.json();
        onDataChange(updatedDeepDive as MarketResearchData);
      }
    } catch {
      // silently fail
    } finally {
      setIsSuggestingProfile(false);
    }
  }, [canvasId, selectedSegment, isSuggestingProfile, onDataChange]);

  if (linked.length === 0) return null;

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/60">
          Evaluation
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Segment tab pills */}
      {linked.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {linked.map((seg) => {
            const sc = scorecards.find((s) => s.segmentId === seg.id);
            const isActive = selectedSegmentId === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => {
                  setSelectedSegmentId(seg.id);
                  setComparisonResult(null);
                }}
                className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-white/20 bg-white/8 text-foreground'
                    : 'border-white/5 text-foreground-muted/50 hover:text-foreground-muted'
                }`}
              >
                {seg.name}
                {sc && (
                  <span
                    className="font-mono text-[9px]"
                    style={{
                      color: sc.overallScore >= 4
                        ? 'var(--state-healthy)'
                        : sc.overallScore >= 3
                          ? 'var(--state-warning)'
                          : 'var(--state-critical)',
                    }}
                  >
                    {sc.overallScore.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Scorecard content for selected segment */}
      {selectedSegment && (
        <div className="space-y-3">
          <SegmentSnapshot
            segment={selectedSegment}
            scorecard={selectedScorecard}
            deepDiveData={data}
            profile={data.segmentProfiles?.[String(selectedSegmentId)] ?? null}
            isScoring={isScoring}
            isSuggestingProfile={isSuggestingProfile}
            onScore={handleScore}
            onArpuChange={handleArpuChange}
            onProfileChange={handleProfileChange}
            onSuggestProfile={handleSuggestProfile}
          />

          {selectedScorecard && (
            <>
              <DecisionMatrix
                scorecard={selectedScorecard}
                onCriterionScoreChange={handleCriterionScoreChange}
                onCriterionWeightChange={handleCriterionWeightChange}
              />

              <BeachheadDecision
                scorecard={selectedScorecard}
                segments={linked}
                isComparing={isComparing}
                comparisonResult={comparisonResult}
                onCompare={handleCompare}
                onRescore={handleScore}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
