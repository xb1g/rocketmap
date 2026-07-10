'use client';

import { useMemo, useState } from 'react';
import type { Segment } from '@/lib/types/canvas';
import {
  REVENUE_MODEL_CATALOG,
  designWtpExperimentDraft,
  normalizeRevenuePricingData,
  type RevenueModelId,
  type RevenuePricingData,
  type RevenuePricingSegment,
  type WtpTestPreference,
} from '@/lib/zones/phase1-revenue-pricing';

interface RevenuePricingViewProps {
  segments?: Segment[];
  initialData?: RevenuePricingData | null;
  onDataChange?: (data: RevenuePricingData) => void;
  onExperimentDraft?: (
    segment: RevenuePricingSegment,
    draft: ReturnType<typeof designWtpExperimentDraft>,
  ) => void;
}

const WTP_OPTIONS: { value: WtpTestPreference; label: string }[] = [
  { value: 'paid_pilot', label: 'Paid pilot' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'reserve', label: 'Reserve' },
];

function createInitialData(
  initialData: RevenuePricingData | null | undefined,
  segments: Segment[],
): RevenuePricingData {
  const normalized = normalizeRevenuePricingData(initialData);
  if (normalized.segments.length > 0 || segments.length === 0) return normalized;

  return normalizeRevenuePricingData({
    segments: segments.map((segment) => ({
      segmentId: segment.$id,
      segmentName: segment.name,
      revenueModel: 'saas',
      paymentMoment: '',
      wtpTestPreference: 'paid_pilot',
    })),
  });
}

export function RevenuePricingView({
  segments = [],
  initialData = null,
  onDataChange,
  onExperimentDraft,
}: RevenuePricingViewProps) {
  const seededData = useMemo(
    () => createInitialData(initialData, segments),
    [initialData, segments],
  );
  const [data, setData] = useState<RevenuePricingData>(seededData);
  const [selectedSegmentId, setSelectedSegmentId] = useState(
    seededData.segments[0]?.segmentId ?? '',
  );

  const selectedSegment =
    data.segments.find((segment) => segment.segmentId === selectedSegmentId) ??
    data.segments[0] ??
    null;

  const draft = selectedSegment
    ? designWtpExperimentDraft({
        segmentName: selectedSegment.segmentName,
        revenueModel: selectedSegment.revenueModel,
        paymentMoment: selectedSegment.paymentMoment,
        pricePoint: selectedSegment.pricePoint,
        testPreference: selectedSegment.wtpTestPreference,
      })
    : null;

  function updateData(updater: (current: RevenuePricingData) => RevenuePricingData) {
    setData((current) => {
      const next = {
        ...updater(current),
        lastUpdated: new Date().toISOString(),
      };
      onDataChange?.(next);
      return next;
    });
  }

  function updateSegment(
    segmentId: string,
    updates: Partial<RevenuePricingSegment>,
  ) {
    updateData((current) => ({
      ...current,
      segments: current.segments.map((segment) =>
        segment.segmentId === segmentId
          ? { ...segment, ...updates }
          : segment,
      ),
    }));
  }

  if (data.segments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-canvas-surface p-5 text-sm text-foreground-muted">
          Add or link customer segments before mapping revenue models. Z4 needs
          at least one segment to tie price, payment moment, and WTP evidence
          together.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-display-small text-base text-foreground">
          Revenue Model Catalog
        </h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          {REVENUE_MODEL_CATALOG.map((model) => (
            <div
              key={model.id}
              className="rounded-lg border border-border bg-canvas-surface p-3"
            >
              <div className="text-sm font-medium text-foreground">
                {model.label}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                {model.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
            Segments
          </div>
          <div className="space-y-1">
            {data.segments.map((segment) => (
              <button
                key={segment.segmentId}
                type="button"
                onClick={() => setSelectedSegmentId(segment.segmentId)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedSegment?.segmentId === segment.segmentId
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border bg-canvas-surface text-foreground-muted hover:text-foreground'
                }`}
              >
                <div className="truncate">{segment.segmentName}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-foreground-subtle">
                  {segment.revenueModel.replace('_', ' ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedSegment && (
          <div className="space-y-4 rounded-lg border border-border bg-canvas-surface p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                  Revenue Model
                </span>
                <select
                  value={selectedSegment.revenueModel}
                  onChange={(event) =>
                    updateSegment(selectedSegment.segmentId, {
                      revenueModel: event.target.value as RevenueModelId,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-canvas-surface px-3 py-2 text-sm text-foreground focus:border-primary/55 focus:outline-none"
                >
                  {REVENUE_MODEL_CATALOG.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                  Price Point
                </span>
                <input
                  type="text"
                  value={selectedSegment.pricePoint ?? ''}
                  onChange={(event) =>
                    updateSegment(selectedSegment.segmentId, {
                      pricePoint: event.target.value,
                    })
                  }
                  placeholder="$299/month, 10% take rate, $5k pilot"
                  className="w-full rounded-lg border border-border bg-canvas-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/55 focus:outline-none"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                Payment Moment
              </span>
              <textarea
                value={selectedSegment.paymentMoment}
                onChange={(event) =>
                  updateSegment(selectedSegment.segmentId, {
                    paymentMoment: event.target.value,
                  })
                }
                rows={3}
                placeholder="What moment creates enough value that this segment pays now?"
                className="w-full rounded-lg border border-border bg-canvas-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/55 focus:outline-none"
              />
            </label>

            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                WTP Test
              </div>
              <div className="flex flex-wrap gap-2">
                {WTP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateSegment(selectedSegment.segmentId, {
                        wtpTestPreference: option.value,
                      })
                    }
                    className={`ui-btn ui-btn-sm ${
                      selectedSegment.wtpTestPreference === option.value
                        ? 'ui-btn-secondary text-foreground'
                        : 'ui-btn-ghost text-foreground-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {draft && (
              <div className="rounded-lg border border-border bg-background/35 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="font-display-small text-sm text-foreground">
                    Risk Engine Experiment Draft
                  </h4>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm ui-btn-secondary"
                    onClick={() => onExperimentDraft?.(selectedSegment, draft)}
                  >
                    Use Draft
                  </button>
                </div>
                <dl className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <div className="md:col-span-2">
                    <dt className="font-mono uppercase tracking-wider text-foreground-subtle">
                      Description
                    </dt>
                    <dd className="mt-1 leading-relaxed text-foreground-muted">
                      {draft.description}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-wider text-foreground-subtle">
                      Criteria
                    </dt>
                    <dd className="mt-1 leading-relaxed text-foreground-muted">
                      {draft.successCriteria}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-wider text-foreground-subtle">
                      Threshold
                    </dt>
                    <dd className="mt-1 leading-relaxed text-foreground-muted">
                      {draft.successThreshold}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-wider text-foreground-subtle">
                      Cost
                    </dt>
                    <dd className="mt-1 text-foreground-muted">
                      {draft.costEstimate}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-wider text-foreground-subtle">
                      Duration
                    </dt>
                    <dd className="mt-1 text-foreground-muted">
                      {draft.durationEstimate}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
