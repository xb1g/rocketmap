'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  BlockData,
  Segment,
  MarketResearchData,
  SegmentScorecard,
  SegmentProfile,
} from '@/lib/types/canvas';
import { BlockChatSection } from '@/app/components/ai/BlockChatSection';
import { SegmentSelector } from './SegmentSelector';
import { SegmentSnapshot } from './SegmentSnapshot';
import { DecisionMatrix } from './DecisionMatrix';
import { BeachheadDecision, type ComparisonResult } from './BeachheadDecision';

interface SegmentEvalOverlayProps {
  canvasId: string;
  block: BlockData;
  segments: Segment[];
  onDataChange: (data: MarketResearchData) => void;
  onClose: () => void;
}

export function SegmentEvalOverlay({
  canvasId,
  block,
  segments,
  onDataChange,
  onClose,
}: SegmentEvalOverlayProps) {
  const data: MarketResearchData = block.deepDiveData ?? {
    tamSamSom: null,
    segmentation: null,
    personas: null,
    marketValidation: null,
    competitiveLandscape: null,
  };
  const scorecards = data.scorecards ?? [];

  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(
    segments.length > 0 ? segments[0].id : null,
  );
  const [isScoring, setIsScoring] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isSuggestingProfile, setIsSuggestingProfile] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');

  const putTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId) ?? null;
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
      const otherSegment = segments.find((s) => s.id === otherSegmentId);
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
    [canvasId, selectedSegment, segments, isComparing],
  );

  // Handle manual score edit on a criterion
  const handleCriterionScoreChange = useCallback(
    (criterionId: string, score: number) => {
      if (!selectedScorecard) return;

      const updatedCriteria = selectedScorecard.criteria.map((c) =>
        c.id === criterionId ? { ...c, score } : c,
      );

      // Recompute overall score with category weights
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

  // Handle ARPU change
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />

      {/* Full-screen overlay */}
      <div className="fixed inset-4 z-50 glass-morphism rounded-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">Customer Segments</span>
            <span className="text-foreground-muted/40">›</span>
            <span className="text-foreground font-medium">Segment Evaluation</span>
          </div>
          <button onClick={onClose} className="ui-btn ui-btn-sm ui-btn-ghost">
            Close
          </button>
        </div>

        {/* Body: 3-column layout */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Segment Selector */}
          <div className="w-48 border-r border-white/5 shrink-0">
            {creatingSegment ? (
              <div className="p-3 space-y-2">
                <input
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  placeholder="Segment name…"
                  className="w-full bg-white/3 rounded px-2.5 py-1.5 text-xs text-foreground outline-none border border-white/8 focus:border-white/15"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setCreatingSegment(false);
                      setNewSegmentName('');
                    }
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      // Creating segments would need a handler from parent
                      // For now, just close the create form
                      setCreatingSegment(false);
                      setNewSegmentName('');
                    }}
                    className="flex-1 text-[10px] py-1 rounded bg-white/5 text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <SegmentSelector
                segments={segments}
                scorecards={scorecards}
                selectedSegmentId={selectedSegmentId}
                onSelect={(id) => {
                  setSelectedSegmentId(id);
                  setComparisonResult(null);
                }}
                onCreateNew={() => setCreatingSegment(true)}
              />
            )}
          </div>

          {/* Center: Scorecard content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {selectedSegment ? (
              <>
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
                      segments={segments}
                      isComparing={isComparing}
                      comparisonResult={comparisonResult}
                      onCompare={handleCompare}
                      onRescore={handleScore}
                    />
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-foreground-muted/40">
                {segments.length === 0
                  ? 'Create a segment to start evaluating'
                  : 'Select a segment from the left panel'}
              </div>
            )}
          </div>

          {/* Right: AI Chat */}
          <div className="w-80 border-l border-white/5 shrink-0 flex flex-col">
            <BlockChatSection
              canvasId={canvasId}
              blockType="customer_segments"
            />
          </div>
        </div>
      </div>
    </>
  );
}
