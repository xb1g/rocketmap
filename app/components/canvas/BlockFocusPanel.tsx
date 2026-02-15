"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  BlockData,
  BlockType,
  BlockEditProposal,
  CanvasMode,
  Segment,
} from "@/lib/types/canvas";
import { BlockFocusHeader } from "./BlockFocusHeader";
import { BlockFocusEditor } from "./BlockFocusEditor";
import { BlockAIResults } from "./BlockAIResults";
import { BLOCK_DEFINITIONS, getBlockValue } from "./constants";

interface BlockFocusPanelProps {
  blockType: BlockType;
  block: BlockData;
  mode: CanvasMode;
  canvasId: string;
  isAnalyzing: boolean;
  allBlocksFilled?: boolean;
  filledCount?: number;
  allSegments?: Segment[];
  onChange: (value: string) => void;
  onClose: () => void;
  onAnalyze: () => void;
  onDeepDive?: () => void;
  onAcceptEdit?: (proposalId: string, edits: BlockEditProposal[]) => void;
  onRejectEdit?: (proposalId: string) => void;
  onSegmentCreate?: (data: { name: string; description?: string }) => Promise<Segment | null>;
  onSegmentUpdate?: (segmentId: number, updates: Partial<Segment>) => Promise<void>;
  onSegmentDelete?: (segmentId: number) => Promise<void>;
  onSegmentLink?: (segmentId: number) => Promise<void>;
  onSegmentUnlink?: (segmentId: number) => Promise<void>;
  chatSection?: React.ReactNode;
}

const MIN_WIDTH = 320;
const MAX_WIDTH_RATIO = 0.85;
const DEFAULT_WIDTH = 420;

function priorityColor(score: number) {
  if (score >= 70) return "var(--state-healthy)";
  if (score >= 40) return "var(--state-warning)";
  return "var(--state-critical)";
}

const PRIORITY_PRESETS = [
  { label: "High", value: 80 },
  { label: "Med", value: 50 },
  { label: "Low", value: 20 },
];

function SegmentEditCard({
  seg,
  onUpdate,
  onDelete,
  onClose,
}: {
  seg: Segment;
  onUpdate?: (segmentId: number, updates: Partial<Segment>) => Promise<void>;
  onDelete?: (segmentId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(seg.name);
  const [description, setDescription] = useState(seg.description);
  const [priority, setPriority] = useState(seg.priorityScore);
  const [earlyAdopter, setEarlyAdopter] = useState(seg.earlyAdopterFlag);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedUpdate = useCallback(
    (updates: Partial<Segment>) => {
      if (!onUpdate) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onUpdate(seg.id, updates), 600);
    },
    [onUpdate, seg.id],
  );

  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-2.5 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: priorityColor(priority) }}
        />
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            debouncedUpdate({ name: e.target.value });
          }}
          className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
          placeholder="Segment name"
        />
        <button
          onClick={onClose}
          className="text-foreground-muted/40 hover:text-foreground text-xs shrink-0"
          title="Close editor"
        >
          Done
        </button>
      </div>

      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          debouncedUpdate({ description: e.target.value });
        }}
        className="w-full bg-white/3 rounded px-2.5 py-1.5 text-xs text-foreground-muted outline-none resize-none border border-white/5 focus:border-white/10"
        rows={2}
        placeholder="Describe this segment..."
      />

      <div className="flex items-center gap-2">
        <span className="text-[9px] text-foreground-muted/50 uppercase tracking-wider">Priority</span>
        <div className="flex gap-1">
          {PRIORITY_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPriority(p.value);
                onUpdate?.(seg.id, { priorityScore: p.value });
              }}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                Math.abs(priority - p.value) < 15
                  ? "border-white/20 bg-white/8 text-foreground"
                  : "border-white/5 text-foreground-muted/50 hover:text-foreground-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-mono text-foreground-muted/40 ml-auto">
          {priority}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setEarlyAdopter(!earlyAdopter);
            onUpdate?.(seg.id, { earlyAdopterFlag: !earlyAdopter });
          }}
          className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            earlyAdopter
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
              : "border-white/5 text-foreground-muted/50 hover:text-foreground-muted"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-sm border transition-colors ${
              earlyAdopter
                ? "bg-emerald-400 border-emerald-400"
                : "border-white/20"
            }`}
          />
          Early Adopter
        </button>

        {onDelete && (
          <button
            onClick={() => onDelete(seg.id)}
            className="text-[10px] text-foreground-muted/30 hover:text-red-400 transition-colors"
          >
            Delete segment
          </button>
        )}
      </div>
    </div>
  );
}

function LinkedSegmentsSection({
  block,
  blockType,
  allSegments,
  creatingSegment,
  newSegmentName,
  showLinkPicker,
  editingSegmentId,
  onSetCreating,
  onSetNewName,
  onSetShowLinkPicker,
  onSetEditingSegmentId,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentDelete,
  onSegmentLink,
  onSegmentUnlink,
}: {
  block: BlockData;
  blockType: BlockType;
  allSegments?: Segment[];
  creatingSegment: boolean;
  newSegmentName: string;
  showLinkPicker: boolean;
  editingSegmentId: number | null;
  onSetCreating: (v: boolean) => void;
  onSetNewName: (v: string) => void;
  onSetShowLinkPicker: (v: boolean) => void;
  onSetEditingSegmentId: (v: number | null) => void;
  onSegmentCreate: (data: { name: string; description?: string }) => Promise<Segment | null>;
  onSegmentUpdate?: (segmentId: number, updates: Partial<Segment>) => Promise<void>;
  onSegmentDelete?: (segmentId: number) => Promise<void>;
  onSegmentLink?: (segmentId: number) => Promise<void>;
  onSegmentUnlink?: (segmentId: number) => Promise<void>;
}) {
  const linked = block.linkedSegments ?? [];
  const unlinkable = allSegments?.filter(
    (s) => !linked.some((ls) => ls.id === s.id),
  ) ?? [];

  return (
    <div className="px-4 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/60">
          Segments
          {linked.length > 0 && (
            <span className="ml-1 font-mono text-foreground-muted/40">
              ({linked.length})
            </span>
          )}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onSetCreating(true);
              onSetShowLinkPicker(false);
            }}
            className="text-[10px] text-foreground-muted/50 hover:text-foreground transition-colors"
          >
            + New
          </button>
          {unlinkable.length > 0 && onSegmentLink && (
            <button
              onClick={() => {
                onSetShowLinkPicker(!showLinkPicker);
                onSetCreating(false);
              }}
              className="text-[10px] text-foreground-muted/50 hover:text-foreground transition-colors"
            >
              + Link
            </button>
          )}
        </div>
      </div>

      {/* Inline create */}
      {creatingSegment && (
        <div className="flex gap-1.5 mb-2">
          <input
            value={newSegmentName}
            onChange={(e) => onSetNewName(e.target.value)}
            placeholder="Segment name..."
            className="flex-1 bg-white/3 rounded px-2 py-1.5 text-xs text-foreground outline-none border border-white/5 focus:border-white/15"
            autoFocus
            onKeyDown={async (e) => {
              if (e.key === "Enter" && newSegmentName.trim()) {
                const seg = await onSegmentCreate({ name: newSegmentName.trim() });
                if (seg && onSegmentLink) await onSegmentLink(seg.id);
                onSetNewName("");
                onSetCreating(false);
              }
              if (e.key === "Escape") {
                onSetNewName("");
                onSetCreating(false);
              }
            }}
          />
          <button
            onClick={async () => {
              if (!newSegmentName.trim()) return;
              const seg = await onSegmentCreate({ name: newSegmentName.trim() });
              if (seg && onSegmentLink) await onSegmentLink(seg.id);
              onSetNewName("");
              onSetCreating(false);
            }}
            className="text-[10px] px-2.5 py-1 rounded bg-white/5 text-foreground-muted hover:text-foreground transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => {
              onSetNewName("");
              onSetCreating(false);
            }}
            className="text-[10px] px-1.5 py-1 text-foreground-muted/40 hover:text-foreground-muted transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Link picker */}
      {showLinkPicker && onSegmentLink && (
        <div className="mb-2 p-2 rounded-lg bg-white/3 border border-white/8 space-y-0.5 max-h-36 overflow-y-auto">
          {unlinkable.length > 0 ? (
            unlinkable.map((seg) => (
              <button
                key={seg.id}
                onClick={async () => {
                  await onSegmentLink(seg.id);
                  onSetShowLinkPicker(false);
                }}
                className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded hover:bg-white/5 transition-colors"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: priorityColor(seg.priorityScore) }}
                />
                <span className="text-xs text-foreground-muted truncate flex-1">
                  {seg.name}
                </span>
                {seg.earlyAdopterFlag && (
                  <span className="text-[8px] font-mono px-1 py-px rounded bg-emerald-400/10 text-emerald-400/70 shrink-0">
                    EA
                  </span>
                )}
                <span className="text-[9px] font-mono text-foreground-muted/40">
                  {seg.priorityScore}
                </span>
              </button>
            ))
          ) : (
            <span className="text-[10px] text-foreground-muted/40 px-2 block py-1">
              All segments are already linked
            </span>
          )}
        </div>
      )}

      {/* Linked segment list */}
      {linked.length > 0 ? (
        <div className="space-y-1">
          {linked.map((seg) =>
            editingSegmentId === seg.id ? (
              <SegmentEditCard
                key={seg.id}
                seg={seg}
                onUpdate={onSegmentUpdate}
                onDelete={onSegmentDelete}
                onClose={() => onSetEditingSegmentId(null)}
              />
            ) : (
              <div
                key={seg.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/2 border border-white/5 group/lseg cursor-pointer hover:bg-white/4 transition-colors"
                onClick={() => onSetEditingSegmentId(seg.id)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: priorityColor(seg.priorityScore) }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground truncate block">
                    {seg.name}
                  </span>
                  {seg.description && (
                    <span className="text-[10px] text-foreground-muted/50 truncate block">
                      {seg.description}
                    </span>
                  )}
                </div>
                {seg.earlyAdopterFlag && (
                  <span className="text-[8px] font-mono px-1 py-px rounded bg-emerald-400/10 text-emerald-400/70 shrink-0">
                    EA
                  </span>
                )}
                <span className="text-[9px] font-mono text-foreground-muted/40 shrink-0">
                  {seg.priorityScore}
                </span>
                {onSegmentUnlink && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSegmentUnlink(seg.id);
                    }}
                    className="text-foreground-muted/30 hover:text-red-400 text-xs opacity-0 group-hover/lseg:opacity-100 transition-opacity shrink-0"
                    title="Unlink segment"
                  >
                    ×
                  </button>
                )}
              </div>
            ),
          )}
        </div>
      ) : !creatingSegment && !showLinkPicker ? (
        <div className="text-[11px] text-foreground-muted/40 py-2 text-center">
          No segments linked yet. Create one or link existing.
        </div>
      ) : null}
    </div>
  );
}

export function BlockFocusPanel({
  blockType,
  block,
  mode,
  isAnalyzing,
  allBlocksFilled,
  filledCount,
  allSegments,
  onChange,
  onClose,
  onAnalyze,
  onDeepDive,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentDelete,
  onSegmentLink,
  onSegmentUnlink,
  chatSection,
}: BlockFocusPanelProps) {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
  const label =
    mode === "lean" && def?.leanLabel
      ? def.leanLabel
      : def?.bmcLabel ?? blockType;
  const value = getBlockValue(block.content, blockType, mode);
  const [contentCollapsed, setContentCollapsed] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);

  // Resizable width
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      setWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div className="focus-backdrop" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="focus-panel glass-morphism"
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
        >
          <div className="absolute inset-y-0 left-0 w-px bg-white/8 group-hover:bg-white/20 group-active:bg-[var(--chroma-indigo)]/50 transition-colors" />
        </div>

        <BlockFocusHeader
          blockType={blockType}
          mode={mode}
          state={block.state}
          confidenceScore={block.confidenceScore}
          onClose={onClose}
        />

        {/* Unified scrollable body — everything lives here */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {/* For Customer Segments: show segments section first, outside collapse */}
          {blockType === "customer_segments" && onSegmentCreate && (
            <LinkedSegmentsSection
              block={block}
              blockType={blockType}
              allSegments={allSegments}
              creatingSegment={creatingSegment}
              newSegmentName={newSegmentName}
              showLinkPicker={showLinkPicker}
              editingSegmentId={editingSegmentId}
              onSetCreating={setCreatingSegment}
              onSetNewName={setNewSegmentName}
              onSetShowLinkPicker={setShowLinkPicker}
              onSetEditingSegmentId={setEditingSegmentId}
              onSegmentCreate={onSegmentCreate}
              onSegmentUpdate={onSegmentUpdate}
              onSegmentDelete={onSegmentDelete}
              onSegmentLink={onSegmentLink}
              onSegmentUnlink={onSegmentUnlink}
            />
          )}

          {/* Collapsible content section */}
          <div
            className={`shrink-0 transition-all duration-300 ease-out overflow-hidden ${
              contentCollapsed
                ? "max-h-0 opacity-0"
                : "max-h-[2000px] opacity-100"
            }`}
          >
            <BlockFocusEditor
              value={value}
              placeholder={`Describe your ${label.toLowerCase()}...`}
              onChange={onChange}
            />

            {/* Action buttons */}
            <div className="px-4 pb-3 flex gap-2">
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className={`ui-btn ui-btn-sm ui-btn-block font-display-small text-[11px] uppercase tracking-wider ${
                  isAnalyzing
                    ? "ui-btn-secondary glow-ai text-[var(--state-ai)]"
                    : "ui-btn-secondary text-foreground-muted hover:text-foreground"
                }`}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
              </button>

              {blockType === "customer_segments" &&
                onDeepDive &&
                allBlocksFilled && (
                  <button
                    onClick={onDeepDive}
                    className="ui-btn ui-btn-sm ui-btn-block ui-btn-secondary font-display-small text-[11px] uppercase tracking-wider text-foreground-muted hover:text-foreground"
                  >
                    Deep Dive
                  </button>
                )}
            </div>

            {/* Deep dive gate message */}
            {blockType === "customer_segments" &&
              onDeepDive &&
              !allBlocksFilled && (
                <div className="px-4 pb-3">
                  <div className="px-3 py-2.5 font-body text-[11px] rounded-lg bg-white/2 border border-white/5 text-foreground-muted/50 leading-snug">
                    Fill all 9 blocks to unlock deep-dive research.
                    {filledCount !== undefined && (
                      <span className="ml-1 font-mono text-foreground-muted/40">
                        ({filledCount}/9)
                      </span>
                    )}
                  </div>
                </div>
              )}

            {/* AI Results */}
            <BlockAIResults
              analysis={block.aiAnalysis}
              usage={block.lastUsage}
            />

            {/* Segments Section for non-customer_segments blocks */}
            {blockType !== "customer_segments" && onSegmentCreate && (
              <LinkedSegmentsSection
                block={block}
                blockType={blockType}
                allSegments={allSegments}
                creatingSegment={creatingSegment}
                newSegmentName={newSegmentName}
                showLinkPicker={showLinkPicker}
                editingSegmentId={editingSegmentId}
                onSetCreating={setCreatingSegment}
                onSetNewName={setNewSegmentName}
                onSetShowLinkPicker={setShowLinkPicker}
                onSetEditingSegmentId={setEditingSegmentId}
                onSegmentCreate={onSegmentCreate}
                onSegmentUpdate={onSegmentUpdate}
                onSegmentDelete={onSegmentDelete}
                onSegmentLink={onSegmentLink}
                onSegmentUnlink={onSegmentUnlink}
              />
            )}
          </div>

          {/* Divider with collapse toggle */}
          <div className="shrink-0 relative flex items-center px-4 py-1.5">
            <div className="flex-1 h-px bg-white/5" />
            <button
              onClick={() => setContentCollapsed(!contentCollapsed)}
              className="ui-btn ui-btn-xs ui-btn-ghost font-display-small text-[10px] uppercase tracking-wider text-foreground-muted/70"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${contentCollapsed ? "rotate-180" : ""}`}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {contentCollapsed ? "Show content" : "Copilot Perspective"}
            </button>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Chat — fills all remaining space */}
          {chatSection && (
            <div className="flex-1 min-h-45 flex flex-col">{chatSection}</div>
          )}
        </div>
      </div>
    </>
  );
}
