'use client';

import { useState, useRef, useCallback } from 'react';
import type { Segment, SegmentScorecard, MarketResearchData, SegmentProfile } from '@/lib/types/canvas';
import {
  BeachheadBadge,
  ScoreTierBadge,
  ConfidenceBar,
  MetricCard,
  formatCurrency,
} from './ScorecardHelpers';

const EMPTY_PROFILE: SegmentProfile = {
  marketDefinition: { geography: '', businessType: '', sizeBucket: '', estimatedCount: '' },
  buyerStructure: { economicBuyer: '', user: '', decisionCycle: '', budgetOwnership: '' },
};

interface SegmentSnapshotProps {
  segment: Segment;
  scorecard: SegmentScorecard | null;
  deepDiveData: MarketResearchData | null;
  profile: SegmentProfile | null;
  isScoring: boolean;
  isSuggestingProfile: boolean;
  onScore: () => void;
  onArpuChange: (arpu: number) => void;
  onProfileChange: (profile: SegmentProfile) => void;
  onSuggestProfile: () => void;
}

function ProfileInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[9px] text-foreground-muted/50 uppercase tracking-wider mb-1">
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-xs text-foreground outline-none border-b border-white/5 pb-1 focus:border-white/20 transition-colors placeholder:text-foreground-muted/30"
      />
    </div>
  );
}

export function SegmentSnapshot({
  segment,
  scorecard,
  deepDiveData,
  profile: profileProp,
  isScoring,
  isSuggestingProfile,
  onScore,
  onArpuChange,
  onProfileChange,
  onSuggestProfile,
}: SegmentSnapshotProps) {
  const [arpuInput, setArpuInput] = useState(
    scorecard?.arpu != null ? String(scorecard.arpu) : '',
  );
  const [profileOpen, setProfileOpen] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const profile = profileProp ?? EMPTY_PROFILE;

  const handleArpuChange = useCallback(
    (value: string) => {
      setArpuInput(value);
      const num = Number(value);
      if (!Number.isNaN(num) && num >= 0) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => onArpuChange(num), 500);
      }
    },
    [onArpuChange],
  );

  const updateProfile = useCallback(
    (section: 'marketDefinition' | 'buyerStructure', field: string, value: string) => {
      const updated: SegmentProfile = {
        ...profile,
        [section]: { ...profile[section], [field]: value },
      };
      onProfileChange(updated);
    },
    [profile, onProfileChange],
  );

  // Pull TAM/SAM/SOM from deep dive
  const tam = deepDiveData?.tamSamSom?.tam?.value;
  const sam = deepDiveData?.tamSamSom?.sam?.value;
  const som = deepDiveData?.tamSamSom?.som?.value;

  // Compute revenue potential
  const arpu = scorecard?.arpu ?? (arpuInput ? Number(arpuInput) : null);
  const revenuePotential = som != null && arpu != null && arpu > 0
    ? som * (arpu / 100) // rough: SOM in $ * conversion
    : scorecard?.revenuePotential;

  // Scoring gate: require market definition + buyer structure
  const md = profile.marketDefinition;
  const bs = profile.buyerStructure;
  const hasGeography = md.geography.trim().length >= 3;
  const hasBusinessType = md.businessType.trim().length >= 3;
  const hasEconomicBuyer = bs.economicBuyer.trim().length >= 3;
  const hasName = segment.name.trim().length >= 2;
  const canScore = hasName && hasGeography && hasBusinessType && hasEconomicBuyer;

  // Build missing fields message
  const missingFields: string[] = [];
  if (!hasName) missingFields.push('segment name (2+ chars)');
  if (!hasGeography) missingFields.push('geography');
  if (!hasBusinessType) missingFields.push('business type');
  if (!hasEconomicBuyer) missingFields.push('economic buyer');

  return (
    <div className="glass-morphism rounded-xl p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-display-small text-base text-foreground flex-1">
          {segment.name}
        </h3>
        {scorecard && (
          <>
            <BeachheadBadge status={scorecard.beachheadStatus} />
            <ScoreTierBadge score={scorecard.overallScore} />
          </>
        )}
        {segment.earlyAdopterFlag && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400/70">
            EA
          </span>
        )}
      </div>

      {segment.description && (
        <p className="text-xs text-foreground-muted/60 leading-relaxed">
          {segment.description}
        </p>
      )}

      {/* Segment Profile Section */}
      <div className="border border-white/5 rounded-lg overflow-hidden">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/3 transition-colors"
        >
          <span className="text-[9px] font-mono uppercase tracking-wider text-foreground-muted/50 flex-1">
            Segment Profile
          </span>
          {canScore && (
            <span className="text-[8px] text-emerald-400/60">Ready</span>
          )}
          <span className="text-foreground-muted/40 text-[10px]">
            {profileOpen ? '−' : '+'}
          </span>
        </button>

        {profileOpen && (
          <div className="px-3 pb-3 space-y-4">
            {/* Market Definition */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-medium text-foreground-muted/70 uppercase tracking-wider">
                Market Definition
              </div>
              <ProfileInput
                label="Geography"
                value={md.geography}
                placeholder="e.g. Bangkok, Thailand"
                onChange={(v) => updateProfile('marketDefinition', 'geography', v)}
              />
              <ProfileInput
                label="Business Type"
                value={md.businessType}
                placeholder="e.g. Specialty coffee shops"
                onChange={(v) => updateProfile('marketDefinition', 'businessType', v)}
              />
              <ProfileInput
                label="Size Bucket"
                value={md.sizeBucket}
                placeholder="e.g. Revenue $1-5M, 1-3 locations"
                onChange={(v) => updateProfile('marketDefinition', 'sizeBucket', v)}
              />
              <ProfileInput
                label="Estimated Count"
                value={md.estimatedCount}
                placeholder="e.g. ~2,500 in Bangkok"
                onChange={(v) => updateProfile('marketDefinition', 'estimatedCount', v)}
              />
            </div>

            {/* Buyer Structure */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-medium text-foreground-muted/70 uppercase tracking-wider">
                Buyer Structure
              </div>
              <ProfileInput
                label="Economic Buyer"
                value={bs.economicBuyer}
                placeholder="e.g. Owner-operator"
                onChange={(v) => updateProfile('buyerStructure', 'economicBuyer', v)}
              />
              <ProfileInput
                label="Day-to-day User"
                value={bs.user}
                placeholder="e.g. Store manager"
                onChange={(v) => updateProfile('buyerStructure', 'user', v)}
              />
              <ProfileInput
                label="Decision Cycle"
                value={bs.decisionCycle}
                placeholder="e.g. 1-2 weeks"
                onChange={(v) => updateProfile('buyerStructure', 'decisionCycle', v)}
              />
              <ProfileInput
                label="Budget Ownership"
                value={bs.budgetOwnership}
                placeholder="e.g. Owner's personal budget"
                onChange={(v) => updateProfile('buyerStructure', 'budgetOwnership', v)}
              />
            </div>

            {/* AI Suggest button */}
            <button
              onClick={onSuggestProfile}
              disabled={isSuggestingProfile}
              className={`w-full py-2 rounded-lg text-[10px] font-medium transition-all ${
                isSuggestingProfile
                  ? 'bg-[var(--chroma-cyan)]/10 text-[var(--chroma-cyan)]/60 glow-ai'
                  : 'bg-[var(--chroma-cyan)]/10 text-[var(--chroma-cyan)]/80 hover:bg-[var(--chroma-cyan)]/20 border border-[var(--chroma-cyan)]/10'
              }`}
            >
              {isSuggestingProfile ? 'AI Suggesting…' : 'AI Suggest Profile'}
            </button>
          </div>
        )}
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="TAM"
          value={tam != null ? formatCurrency(tam) : '—'}
          sub="Total addressable"
        />
        <MetricCard
          label="SAM"
          value={sam != null ? formatCurrency(sam) : '—'}
          sub="Serviceable"
        />
        <MetricCard
          label="SOM"
          value={som != null ? formatCurrency(som) : '—'}
          sub="Obtainable"
        />
      </div>

      {/* ARPU + Revenue potential */}
      <div className="grid grid-cols-2 gap-3">
        <div className="px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
          <div className="text-[9px] text-foreground-muted/50 uppercase tracking-wider mb-1">
            ARPU (Monthly)
          </div>
          <div className="flex items-center gap-1">
            <span className="text-foreground-muted/40 text-sm">$</span>
            <input
              value={arpuInput}
              onChange={(e) => handleArpuChange(e.target.value)}
              placeholder="—"
              className="bg-transparent text-sm font-mono text-foreground outline-none w-full"
              type="number"
              min="0"
            />
          </div>
        </div>
        <MetricCard
          label="Revenue Potential"
          value={revenuePotential != null ? formatCurrency(revenuePotential) : '—'}
          sub="SOM × ARPU estimate"
        />
      </div>

      {/* Confidence bar (only if scored) */}
      {scorecard && <ConfidenceBar value={scorecard.dataConfidence} />}

      {/* CTA */}
      {!scorecard && (canScore ? (
        <button
          onClick={onScore}
          disabled={isScoring}
          className={`w-full py-2.5 rounded-lg text-xs font-medium transition-all ${
            isScoring
              ? 'bg-[var(--chroma-indigo)]/10 text-[var(--chroma-indigo)]/60 glow-ai'
              : 'bg-[var(--chroma-indigo)]/20 text-[var(--chroma-indigo)] hover:bg-[var(--chroma-indigo)]/30'
          }`}
        >
          {isScoring ? 'AI Scoring…' : 'Score This Segment'}
        </button>
      ) : (
        <div className="px-3 py-2.5 rounded-lg bg-white/2 border border-white/5 text-[11px] text-foreground-muted/50 leading-snug">
          Fill in {missingFields.join(', ')} to enable scoring.
        </div>
      ))}
    </div>
  );
}
