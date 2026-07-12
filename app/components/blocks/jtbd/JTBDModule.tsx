'use client';

import { useMemo, useState } from 'react';
import {
  CUSTOMER_ROLE_TYPES,
  JTBD_PAIN_TYPES,
  buildJTBDStatement,
  createEmptyJTBDRoleSplit,
  createEmptyJTBDStatement,
  normalizeJTBDData,
  type CustomerRoleType,
  type JTBDData,
  type JTBDPain,
  type JTBDPainType,
  type JTBDRoleSplit,
  type JTBDStatement,
} from '@/lib/zones/phase1-jtbd';

interface SegmentOption {
  id?: string;
  $id?: string;
  name: string;
}

interface JTBDModuleProps {
  data: JTBDData | null;
  segments?: SegmentOption[];
  isGenerating?: boolean;
  aiEnabled?: boolean;
  onGenerate?: () => void;
  onSave: (data: JTBDData) => void;
}

const ROLE_LABELS: Record<CustomerRoleType, string> = {
  user: 'User',
  buyer: 'Buyer',
  decision_maker: 'Decision maker',
  influencer: 'Influencer',
  beneficiary: 'Beneficiary',
  economic_customer: 'Economic customer',
};

const PAIN_LABELS: Record<JTBDPainType, string> = {
  functional: 'Functional',
  emotional: 'Emotional',
  social: 'Social',
  economic: 'Economic',
  status: 'Status',
};

const PRIORITY_STYLES: Record<JTBDStatement['priority'], string> = {
  high: 'text-state-critical bg-state-critical/10 border-state-critical/20',
  medium: 'text-state-warning bg-state-warning/10 border-state-warning/20',
  low: 'text-foreground-muted bg-foreground/5 border-border',
};

function segmentId(segment: SegmentOption): string {
  return segment.$id ?? segment.id ?? segment.name;
}

function segmentName(segments: SegmentOption[], id: string | undefined): string {
  if (!id) return 'Unassigned';
  return segments.find((segment) => segmentId(segment) === id)?.name ?? 'Unassigned';
}

function updatedStatement(statement: JTBDStatement, patch: Partial<JTBDStatement>): JTBDStatement {
  const next = { ...statement, ...patch };
  return {
    ...next,
    statement: buildJTBDStatement({
      situation: next.situation,
      job: next.job,
      outcome: next.outcome,
    }),
  };
}

function upsertPain(
  pains: JTBDPain[],
  type: JTBDPainType,
  description: string,
): JTBDPain[] {
  const trimmed = description.trim();
  const existing = pains.find((pain) => pain.type === type);
  if (!trimmed) {
    return pains.filter((pain) => pain.type !== type);
  }
  if (existing) {
    return pains.map((pain) =>
      pain.type === type ? { ...pain, description: trimmed } : pain,
    );
  }
  return [
    ...pains,
    {
      id: `pain-${Date.now()}-${type}`,
      type,
      description: trimmed,
    },
  ];
}

function ensureRoleSplit(
  roleSplits: JTBDRoleSplit[],
  segmentIdValue: string | undefined,
): JTBDRoleSplit {
  return (
    roleSplits.find((split) => split.segmentId === segmentIdValue) ??
    createEmptyJTBDRoleSplit(segmentIdValue)
  );
}

function StatementEditor({
  statement,
  segments,
  onChange,
  onRemove,
}: {
  statement: JTBDStatement;
  segments: SegmentOption[];
  onChange: (statement: JTBDStatement) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-canvas-surface border border-border shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-foreground-muted/60 uppercase tracking-wider">
            {segmentName(segments, statement.segmentId)}
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">
            {statement.statement}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-foreground-muted/40 hover:text-state-critical text-xs"
          aria-label="Remove JTBD statement"
        >
          x
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[9px] font-mono text-foreground-muted/60 uppercase tracking-wider">
            Segment
          </span>
          <select
            value={statement.segmentId ?? ''}
            onChange={(event) =>
              onChange(
                updatedStatement(statement, {
                  segmentId: event.target.value || undefined,
                }),
              )
            }
            className="input-soft bg-foreground/5 hover:bg-foreground/10 focus:bg-foreground/10 border border-transparent focus:border-chroma-indigo/50 rounded-xl transition-all duration-300 shadow-inner w-full px-2 py-1.5 text-xs text-foreground-muted"
          >
            <option value="">Unassigned</option>
            {segments.map((segment) => (
              <option key={segmentId(segment)} value={segmentId(segment)}>
                {segment.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-mono text-foreground-muted/60 uppercase tracking-wider">
            Role
          </span>
          <select
            value={statement.role}
            onChange={(event) =>
              onChange(
                updatedStatement(statement, {
                  role: event.target.value as CustomerRoleType,
                }),
              )
            }
            className="input-soft bg-foreground/5 hover:bg-foreground/10 focus:bg-foreground/10 border border-transparent focus:border-chroma-indigo/50 rounded-xl transition-all duration-300 shadow-inner w-full px-2 py-1.5 text-xs text-foreground-muted"
          >
            {CUSTOMER_ROLE_TYPES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-mono text-foreground-muted/60 uppercase tracking-wider">
            Priority
          </span>
          <select
            value={statement.priority}
            onChange={(event) =>
              onChange(
                updatedStatement(statement, {
                  priority: event.target.value as JTBDStatement['priority'],
                }),
              )
            }
            className={`input-soft w-full px-2 py-1.5 text-xs ${PRIORITY_STYLES[statement.priority]}`}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(
          [
            ['situation', 'When'],
            ['job', 'I want'],
            ['outcome', 'So I can'],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="space-y-1">
            <span className="text-[9px] font-mono text-foreground-muted/60 uppercase tracking-wider">
              {label}
            </span>
            <textarea
              value={statement[field]}
              onChange={(event) =>
                onChange(updatedStatement(statement, { [field]: event.target.value }))
              }
              rows={3}
              className="input-soft bg-foreground/5 hover:bg-foreground/10 focus:bg-foreground/10 border border-transparent focus:border-chroma-indigo/50 rounded-xl transition-all duration-300 shadow-inner w-full px-2 py-1.5 text-xs text-foreground-muted resize-none"
            />
          </label>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <div className="text-[9px] font-mono text-foreground-muted/60 uppercase tracking-wider">
          Pain types
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {JTBD_PAIN_TYPES.map((type) => {
            const pain = statement.pains.find((item) => item.type === type);
            return (
              <label key={type} className="space-y-1">
                <span className="text-[10px] text-foreground-muted/70">
                  {PAIN_LABELS[type]}
                </span>
                <textarea
                  value={pain?.description ?? ''}
                  onChange={(event) =>
                    onChange(
                      updatedStatement(statement, {
                        pains: upsertPain(statement.pains, type, event.target.value),
                      }),
                    )
                  }
                  rows={2}
                  className="input-soft bg-foreground/5 hover:bg-foreground/10 focus:bg-foreground/10 border border-transparent focus:border-chroma-indigo/50 rounded-xl transition-all duration-300 shadow-inner w-full px-2 py-1.5 text-xs text-foreground-muted resize-none"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RoleSplitEditor({
  split,
  segments,
  onChange,
}: {
  split: JTBDRoleSplit;
  segments: SegmentOption[];
  onChange: (split: JTBDRoleSplit) => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-canvas-surface border border-border shadow-sm space-y-3">
      <div>
        <div className="text-[10px] font-mono text-foreground-muted/60 uppercase tracking-wider">
          Customer role split
        </div>
        <div className="mt-1 text-sm font-medium text-foreground">
          {segmentName(segments, split.segmentId)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CUSTOMER_ROLE_TYPES.map((role) => (
          <label key={role} className="space-y-1">
            <span className="text-[9px] font-mono text-foreground-muted/60 uppercase tracking-wider">
              {ROLE_LABELS[role]}
            </span>
            <textarea
              value={split[role]}
              onChange={(event) => onChange({ ...split, [role]: event.target.value })}
              rows={2}
              className="input-soft bg-foreground/5 hover:bg-foreground/10 focus:bg-foreground/10 border border-transparent focus:border-chroma-indigo/50 rounded-xl transition-all duration-300 shadow-inner w-full px-2 py-1.5 text-xs text-foreground-muted resize-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function JTBDModule({
  data,
  segments = [],
  isGenerating = false,
  aiEnabled = true,
  onGenerate,
  onSave,
}: JTBDModuleProps) {
  const current = useMemo(() => normalizeJTBDData(data), [data]);
  const defaultSegmentId = segments[0] ? segmentId(segments[0]) : undefined;
  const [activeSegmentId, setActiveSegmentId] = useState<string | undefined>(
    current.roleSplits[0]?.segmentId ?? defaultSegmentId,
  );
  const resolvedActiveSegmentId = activeSegmentId ?? defaultSegmentId;

  const save = (updated: JTBDData) => {
    onSave(
      normalizeJTBDData({
        ...updated,
        lastUpdated: new Date().toISOString(),
      }),
    );
  };

  const handleStatementChange = (index: number, statement: JTBDStatement) => {
    const statements = [...current.statements];
    statements[index] = statement;
    save({ ...current, statements });
  };

  const handleAddStatement = () => {
    const segmentIdValue = resolvedActiveSegmentId;
    const statements = [...current.statements, createEmptyJTBDStatement(segmentIdValue)];
    const split = ensureRoleSplit(current.roleSplits, segmentIdValue);
    const roleSplits = current.roleSplits.some((item) => item.segmentId === segmentIdValue)
      ? current.roleSplits
      : [...current.roleSplits, split];
    save({ ...current, statements, roleSplits });
  };

  const handleRemoveStatement = (index: number) => {
    save(
      {
        ...current,
        statements: current.statements.filter((_, itemIndex) => itemIndex !== index),
      },
    );
  };

  const activeSplit = ensureRoleSplit(current.roleSplits, resolvedActiveSegmentId);

  const handleRoleSplitChange = (split: JTBDRoleSplit) => {
    const roleSplits = current.roleSplits.some((item) => item.segmentId === split.segmentId)
      ? current.roleSplits.map((item) => (item.segmentId === split.segmentId ? split : item))
      : [...current.roleSplits, split];
    save({ ...current, roleSplits });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !aiEnabled || !onGenerate}
          className={`ui-btn ui-btn-sm flex-1 ${
            isGenerating
              ? 'ui-btn-secondary glow-ai text-state-ai'
              : !aiEnabled || !onGenerate
                ? 'ui-btn-ghost text-foreground-muted/40 cursor-not-allowed'
                : 'ui-btn-secondary text-foreground-muted hover:text-foreground'
          }`}
        >
          {isGenerating
            ? 'Generating JTBD...'
            : !aiEnabled
              ? 'Fill upstream context to unlock AI'
              : 'Generate JTBD with AI'}
        </button>
        {segments.length > 0 && (
          <select
            value={resolvedActiveSegmentId ?? ''}
            onChange={(event) => setActiveSegmentId(event.target.value || undefined)}
            className="input-soft bg-foreground/5 hover:bg-foreground/10 focus:bg-foreground/10 border border-transparent focus:border-chroma-indigo/50 rounded-xl transition-all duration-300 shadow-inner px-2 py-1.5 text-xs text-foreground-muted"
            aria-label="Active segment for JTBD role split"
          >
            {segments.map((segment) => (
              <option key={segmentId(segment)} value={segmentId(segment)}>
                {segment.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {current.statements.length > 0 && (
        <div className="space-y-3">
          {current.statements.map((statement, index) => (
            <StatementEditor
              key={statement.id}
              statement={statement}
              segments={segments}
              onChange={(updated) => handleStatementChange(index, updated)}
              onRemove={() => handleRemoveStatement(index)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAddStatement}
        className="ui-btn ui-btn-xs ui-btn-block ui-btn-ghost text-foreground-muted hover:text-foreground border-dashed"
      >
        + Add JTBD statement
      </button>

      <RoleSplitEditor
        split={activeSplit}
        segments={segments}
        onChange={handleRoleSplitChange}
      />
    </div>
  );
}
