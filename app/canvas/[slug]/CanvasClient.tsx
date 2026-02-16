"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import type {
  BlockData,
  BlockItem,
  BlockType,
  BlockContent,
  BlockEditProposal,
  BlockItemProposal,
  SegmentProposal,
  CanvasMode,
  CanvasTab,
  CanvasData,
  AIAnalysis,
  AIUsage,
  MarketResearchData,
  Segment,
} from "@/lib/types/canvas";
import type { HoveredItem } from "@/app/components/canvas/ConnectionOverlay";
import type { ConsistencyData } from "@/app/components/canvas/ConsistencyReport";
import {
  isSharedBlock,
  BLOCK_DEFINITIONS,
} from "@/app/components/canvas/constants";
import { BMCGrid } from "@/app/components/canvas/BMCGrid";
import { CanvasToolbar } from "@/app/components/canvas/CanvasToolbar";
import { CanvasTabs } from "@/app/components/canvas/CanvasTabs";
import { NotesView } from "@/app/components/canvas/NotesView";
import { CanvasSettingsModal } from "@/app/components/canvas/CanvasSettingsModal";
import { BlockFocusPanel } from "@/app/components/canvas/BlockFocusPanel";
import { AnalysisView } from "@/app/components/canvas/AnalysisView";
import { DebugPanel } from "@/app/components/canvas/DebugPanel";
import { ChatBar } from "@/app/components/ai/ChatBar";
import { BlockChatSection } from "@/app/components/ai/BlockChatSection";
import { DeepDiveOverlay } from "@/app/components/blocks/DeepDiveOverlay";
import { InlineSegmentEval } from "@/app/components/blocks/segment-eval/InlineSegmentEval";

interface CanvasClientProps {
  canvasId: string;
  initialCanvasData: CanvasData;
  initialBlocks: BlockData[];
  initialSegments?: Segment[];
  readOnly: boolean;
}

type SaveStatus = "saved" | "saving" | "unsaved";
const MIN_TEXT_ZOOM = 0.85;
const MAX_TEXT_ZOOM = 1.6;

function clampTextZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_TEXT_ZOOM, Math.max(MIN_TEXT_ZOOM, value));
}

function deriveBlockState(block: BlockData): BlockData["state"] {
  if (!block.aiAnalysis) return "calm";
  if (block.confidenceScore >= 0.7 && block.riskScore < 0.3) return "healthy";
  if (block.riskScore >= 0.6) return "critical";
  if (block.riskScore >= 0.3 || block.confidenceScore < 0.5) return "warning";
  return "healthy";
}

export function CanvasClient({
  canvasId,
  initialCanvasData,
  initialBlocks,
  initialSegments = [],
  readOnly,
}: CanvasClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<CanvasMode>("bmc");
  const [blocks, setBlocks] = useState<Map<BlockType, BlockData>>(() => {
    const map = new Map<BlockType, BlockData>();
    for (const block of initialBlocks) {
      map.set(block.blockType, block);
    }
    return map;
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [focusedBlock, setFocusedBlock] = useState<BlockType | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<BlockType | null>(null);
  const [chatTargetBlock, setChatTargetBlock] = useState<BlockType | null>(
    null,
  );
  const [chatDocked, setChatDocked] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeTab, setActiveTab] = useState<CanvasTab>("canvas");
  const [canvasData, setCanvasData] = useState<CanvasData>(initialCanvasData);
  const [showSettings, setShowSettings] = useState(false);
  const [textZoom, setTextZoom] = useState(1);
  const [isZoomStorageReady, setIsZoomStorageReady] = useState(false);
  const [analyzingBlock, setAnalyzingBlock] = useState<BlockType | null>(null);
  const [deepDiveBlock, setDeepDiveBlock] = useState<BlockType | null>(null);
  const [consistencyData, setConsistencyData] =
    useState<ConsistencyData | null>(null);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [notes, setNotes] = useState(initialCanvasData.description);
  const [segments, setSegments] = useState<Map<string, Segment>>(() => {
    const map = new Map<string, Segment>();
    for (const seg of initialSegments) {
      map.set(seg.$id, seg);
    }
    return map;
  });
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (expandedBlock) {
      setChatDocked(false);
    }
  }, [expandedBlock]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`canvas:textZoom:${canvasId}`);
      if (!stored) return;
      const parsed = Number.parseFloat(stored);
      setTextZoom(clampTextZoom(parsed));
    } catch {
      // ignore storage errors
    } finally {
      setIsZoomStorageReady(true);
    }
  }, [canvasId]);

  useEffect(() => {
    if (!isZoomStorageReady) return;
    try {
      window.localStorage.setItem(
        `canvas:textZoom:${canvasId}`,
        String(textZoom),
      );
    } catch {
      // ignore storage errors
    }
  }, [canvasId, isZoomStorageReady, textZoom]);

  // Save block content
  const saveBlock = useCallback(
    async (
      blockType: BlockType,
      content: { bmc: string; lean: string; items?: BlockItem[] },
    ) => {
      if (readOnly) return;
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/canvas/${canvasId}/blocks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockType,
            contentJson: JSON.stringify(content),
          }),
        });
        setSaveStatus(res.ok ? "saved" : "unsaved");
      } catch {
        setSaveStatus("unsaved");
      }
    },
    [canvasId, readOnly],
  );

  // Save canvas metadata
  const saveCanvas = useCallback(
    async (
      updates: Partial<Pick<CanvasData, "title" | "description" | "isPublic">>,
    ) => {
      if (readOnly) return;
      try {
        const res = await fetch(`/api/canvas/${canvasId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (res.ok) {
          const data = await res.json();

          // Update local state
          setCanvasData((prev) => ({ ...prev, ...updates }));

          // If slug changed, redirect to new URL
          if (data.canvas && data.canvas.slug !== canvasData.slug) {
            router.push(`/canvas/${data.canvas.slug}`);
          }
        }
      } catch {
        // silently fail
      }
    },
    [canvasId, canvasData.slug, router, readOnly],
  );

  const handleBlockChange = useCallback(
    (blockType: BlockType, value: string) => {
      if (readOnly) return;
      let updatedContent: BlockContent = {
        bmc: "",
        lean: "",
        items: [],
      };

      setBlocks((prev) => {
        const next = new Map(prev);
        const existing = next.get(blockType);
        const content = existing?.content ?? { bmc: "", lean: "", items: [] };
        // Shared blocks (channels, customer_segments, cost_structure, revenue_streams)
        // always write to both bmc and lean so content stays in sync across modes
        if (isSharedBlock(blockType)) {
          updatedContent = {
            bmc: value,
            lean: value,
            items: content.items,
          };
        } else {
          updatedContent =
            mode === "lean"
              ? { bmc: content.bmc, lean: value, items: content.items }
              : { bmc: value, lean: content.lean, items: content.items };
        }
        next.set(blockType, {
          ...existing!,
          blockType,
          content: updatedContent,
          state: existing?.state ?? "calm",
          aiAnalysis: existing?.aiAnalysis ?? null,
          confidenceScore: existing?.confidenceScore ?? 0,
          riskScore: existing?.riskScore ?? 0,
        });
        return next;
      });

      setSaveStatus("unsaved");

      const existing = saveTimers.current.get(blockType);
      if (existing) clearTimeout(existing);
      saveTimers.current.set(
        blockType,
        setTimeout(() => {
          saveBlock(blockType, updatedContent);
          saveTimers.current.delete(blockType);
        }, 800),
      );
    },
    [mode, saveBlock, readOnly],
  );

  const handleAnalyze = useCallback(
    async (blockType: BlockType) => {
      if (readOnly) return;
      setAnalyzingBlock(blockType);
      // Set glow to AI while analyzing
      setBlocks((prev) => {
        const next = new Map(prev);
        const b = next.get(blockType);
        if (b) next.set(blockType, { ...b, state: "ai" });
        return next;
      });

      try {
        const res = await fetch(
          `/api/canvas/${canvasId}/blocks/${blockType}/analyze`,
          {
            method: "POST",
          },
        );
        const data = await res.json();

        if (res.ok) {
          setBlocks((prev) => {
            const next = new Map(prev);
            const b = next.get(blockType);
            if (b) {
              const updated: BlockData = {
                ...b,
                aiAnalysis: data.analysis as AIAnalysis,
                confidenceScore: data.confidenceScore,
                riskScore: data.riskScore,
                lastUsage: (data.usage as AIUsage) ?? null,
              };
              updated.state = deriveBlockState(updated);
              next.set(blockType, updated);
            }
            return next;
          });
        }
      } catch {
        // Reset state on error
        setBlocks((prev) => {
          const next = new Map(prev);
          const b = next.get(blockType);
          if (b) next.set(blockType, { ...b, state: deriveBlockState(b) });
          return next;
        });
      } finally {
        setAnalyzingBlock(null);
      }
    },
    [canvasId, readOnly],
  );

  const handleConsistencyCheck = useCallback(async () => {
    if (readOnly) return;
    setIsCheckingConsistency(true);
    try {
      const res = await fetch(`/api/canvas/${canvasId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Run a full consistency check across all blocks. Use the checkConsistency tool to provide your structured analysis of contradictions, missing links, and overall coherence.",
            },
          ],
        }),
      });

      // Parse streaming response for tool results
      const text = await res.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (
          line.includes('"toolName":"checkConsistency"') &&
          line.includes('"result"')
        ) {
          try {
            // Try to extract the result from the stream
            const match = line.match(/"result":(\{[^}]+\})/);
            if (match) {
              const result = JSON.parse(match[1]);
              setConsistencyData(result as ConsistencyData);
            }
          } catch {
            // parsing stream is best-effort
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsCheckingConsistency(false);
    }
  }, [canvasId, readOnly]);

  const handleNotesChange = useCallback(
    (value: string) => {
      if (readOnly) return;
      setNotes(value);
      const existing = saveTimers.current.get("__notes");
      if (existing) clearTimeout(existing);
      saveTimers.current.set(
        "__notes",
        setTimeout(() => {
          saveCanvas({ description: value });
          saveTimers.current.delete("__notes");
        }, 1000),
      );
    },
    [saveCanvas, readOnly],
  );

  const handleDelete = useCallback(async () => {
    if (readOnly) return;
    try {
      await fetch(`/api/canvas/${canvasId}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      // silently fail
    }
  }, [canvasId, router, readOnly]);

  const handleDeepDiveDataChange = useCallback(
    (blockType: BlockType, data: MarketResearchData) => {
      if (readOnly) return;
      setBlocks((prev) => {
        const next = new Map(prev);
        const b = next.get(blockType);
        if (b) next.set(blockType, { ...b, deepDiveData: data });
        return next;
      });
    },
    [readOnly],
  );

  // ─── Segment Handlers ──────────────────────────────────────────────────────

  const handleSegmentCreate = useCallback(
    async (data: {
      name: string;
      description?: string;
      earlyAdopterFlag?: boolean;
      priorityScore?: number;
    }) => {
      if (readOnly) return null;
      try {
        const res = await fetch(`/api/canvas/${canvasId}/segments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        const { segment: doc } = await res.json();
        const seg: Segment = {
          $id: doc.$id,
          name: doc.name,
          description: doc.description ?? "",
          earlyAdopterFlag: doc.earlyAdopterFlag ?? false,
          priorityScore: doc.priorityScore ?? 50,
          demographics: doc.demographics ?? "",
          psychographics: doc.psychographics ?? "",
          behavioral: doc.behavioral ?? "",
          geographic: doc.geographic ?? "",
          estimatedSize: doc.estimatedSize ?? "",
          colorHex: doc.colorHex ?? undefined,
        };
        setSegments((prev) => new Map(prev).set(seg.$id, seg));
        return seg;
      } catch {
        return null;
      }
    },
    [canvasId, readOnly],
  );

  const handleSegmentUpdate = useCallback(
    async (segmentId: string, updates: Partial<Segment>) => {
      if (readOnly) return;
      try {
        const res = await fetch(
          `/api/canvas/${canvasId}/segments/${segmentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          },
        );
        if (!res.ok) return;
        const { segment: doc } = await res.json();
        const seg: Segment = {
          $id: doc.$id,
          name: doc.name,
          description: doc.description ?? "",
          earlyAdopterFlag: doc.earlyAdopterFlag ?? false,
          priorityScore: doc.priorityScore ?? 50,
          demographics: doc.demographics ?? "",
          psychographics: doc.psychographics ?? "",
          behavioral: doc.behavioral ?? "",
          geographic: doc.geographic ?? "",
          estimatedSize: doc.estimatedSize ?? "",
          colorHex: doc.colorHex ?? undefined,
        };
        setSegments((prev) => new Map(prev).set(seg.$id, seg));
        setBlocks((prev) => {
          const next = new Map(prev);
          for (const [bt, block] of next) {
            if (block.linkedSegments?.some((s) => s.$id === seg.$id)) {
              next.set(bt, {
                ...block,
                linkedSegments: block.linkedSegments.map((s) =>
                  s.$id === seg.$id ? seg : s,
                ),
              });
            }
          }
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [canvasId, readOnly],
  );

  const handleSegmentDelete = useCallback(
    async (segmentId: string) => {
      if (readOnly) return;
      try {
        const res = await fetch(
          `/api/canvas/${canvasId}/segments/${segmentId}`,
          { method: "DELETE" },
        );
        if (!res.ok) return;
        setSegments((prev) => {
          const next = new Map(prev);
          next.delete(segmentId);
          return next;
        });
        setBlocks((prev) => {
          const next = new Map(prev);
          for (const [bt, block] of next) {
            if (block.linkedSegments?.some((s) => s.$id === segmentId)) {
              next.set(bt, {
                ...block,
                linkedSegments: block.linkedSegments.filter(
                  (s) => s.$id !== segmentId,
                ),
              });
            }
          }
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [canvasId, readOnly],
  );

  const handleSegmentLink = useCallback(
    async (
      blockType: BlockType,
      segmentId: string,
      segmentOverride?: Segment,
    ) => {
      if (readOnly) return;
      try {
        const res = await fetch(
          `/api/canvas/${canvasId}/blocks/${blockType}/segments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ segmentId }),
          },
        );
        if (!res.ok) return;
        const seg = segmentOverride ?? segments.get(segmentId);
        if (!seg) return;
        setBlocks((prev) => {
          const next = new Map(prev);
          const block = next.get(blockType);
          if (block) {
            const existing = block.linkedSegments ?? [];
            if (!existing.some((s) => s.$id === segmentId)) {
              next.set(blockType, {
                ...block,
                linkedSegments: [...existing, seg],
              });
            }
          }
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [canvasId, segments, readOnly],
  );

  const handleSegmentUnlink = useCallback(
    async (blockType: BlockType, segmentId: string) => {
      if (readOnly) return;
      try {
        const res = await fetch(
          `/api/canvas/${canvasId}/blocks/${blockType}/segments?segmentId=${segmentId}`,
          { method: "DELETE" },
        );
        if (!res.ok) return;
        setBlocks((prev) => {
          const next = new Map(prev);
          const block = next.get(blockType);
          if (block) {
            next.set(blockType, {
              ...block,
              linkedSegments: (block.linkedSegments ?? []).filter(
                (s) => s.$id !== segmentId,
              ),
            });
          }
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [canvasId, readOnly],
  );

  // ─── Block Item Handlers ───────────────────────────────────────────────────

  const debouncedSaveItems = useCallback(
    (
      blockType: BlockType,
      content: { bmc: string; lean: string; items?: BlockItem[] },
    ) => {
      if (readOnly) return;
      setSaveStatus("unsaved");
      const key = `__items_${blockType}`;
      const existing = saveTimers.current.get(key);
      if (existing) clearTimeout(existing);
      saveTimers.current.set(
        key,
        setTimeout(() => {
          saveBlock(blockType, content);
          saveTimers.current.delete(key);
        }, 800),
      );
    },
    [saveBlock, readOnly],
  );

  const updateBlockItems = useCallback(
    (blockType: BlockType, updater: (items: BlockItem[]) => BlockItem[]) => {
      if (readOnly) return;
      setBlocks((prev) => {
        const next = new Map(prev);
        const block = next.get(blockType);
        if (!block) return prev;
        const items = updater(block.content.items ?? []);
        const newContent = { ...block.content, items };
        next.set(blockType, { ...block, content: newContent });
        debouncedSaveItems(blockType, newContent);
        return next;
      });
    },
    [debouncedSaveItems, readOnly],
  );

  const handleItemCreate = useCallback(
    (blockType: BlockType) => {
      if (readOnly) return;
      const newItem: BlockItem = {
        id: crypto.randomUUID(),
        name: "New item",
        linkedSegmentIds: [],
        linkedItemIds: [],
        createdAt: new Date().toISOString(),
      };
      updateBlockItems(blockType, (items) => [...items, newItem]);
    },
    [updateBlockItems, readOnly],
  );

  const handleItemUpdate = useCallback(
    (blockType: BlockType, itemId: string, updates: Partial<BlockItem>) => {
      if (readOnly) return;
      updateBlockItems(blockType, (items) =>
        items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item,
        ),
      );
    },
    [updateBlockItems, readOnly],
  );

  const handleItemDelete = useCallback(
    (blockType: BlockType, itemId: string) => {
      if (readOnly) return;
      updateBlockItems(blockType, (items) =>
        items.filter((item) => item.id !== itemId),
      );
    },
    [updateBlockItems, readOnly],
  );

  const handleItemToggleSegment = useCallback(
    (blockType: BlockType, itemId: string, segmentId: string) => {
      if (readOnly) return;
      updateBlockItems(blockType, (items) =>
        items.map((item) => {
          if (item.id !== itemId) return item;
          const linked = item.linkedSegmentIds.includes(segmentId);
          return {
            ...item,
            linkedSegmentIds: linked
              ? item.linkedSegmentIds.filter((id) => id !== segmentId)
              : [...item.linkedSegmentIds, segmentId],
          };
        }),
      );
    },
    [updateBlockItems, readOnly],
  );

  const handleItemToggleLink = useCallback(
    (blockType: BlockType, itemId: string, linkedItemId: string) => {
      if (readOnly) return;
      updateBlockItems(blockType, (items) =>
        items.map((item) => {
          if (item.id !== itemId) return item;
          const linked = item.linkedItemIds.includes(linkedItemId);
          return {
            ...item,
            linkedItemIds: linked
              ? item.linkedItemIds.filter((id) => id !== linkedItemId)
              : [...item.linkedItemIds, linkedItemId],
          };
        }),
      );
    },
    [updateBlockItems, readOnly],
  );

  // Track old content for revert/undo of accepted edits
  const revertMapRef = useRef<
    Map<string, { blockType: BlockType; oldContent: BlockContent }>
  >(new Map());

  // Handle accepted block edit from AI chat (single edit at a time)
  const handleAcceptEdit = useCallback(
    async (_proposalId: string, edit: BlockEditProposal) => {
      if (readOnly) return;
      const existing = blocks.get(edit.blockType);
      if (!existing) return;

      // Store old content for potential revert
      const revertKey = `${_proposalId}-${edit.blockType}`;
      revertMapRef.current.set(revertKey, {
        blockType: edit.blockType,
        oldContent: { ...existing.content },
      });

      let newContent = { ...existing.content };

      if (edit.mode === "both" || isSharedBlock(edit.blockType)) {
        newContent = {
          bmc: edit.newContent,
          lean: edit.newContent,
          items: existing.content.items,
        };
      } else if (edit.mode === "lean") {
        newContent = { ...newContent, lean: edit.newContent };
      } else {
        newContent = { ...newContent, bmc: edit.newContent };
      }

      // Update local state immediately (optimistic)
      setBlocks((prev) => {
        const next = new Map(prev);
        next.set(edit.blockType, { ...existing, content: newContent });
        return next;
      });

      // Persist to server, then re-analyze
      await saveBlock(edit.blockType, newContent);
      handleAnalyze(edit.blockType);
    },
    [blocks, saveBlock, handleAnalyze, readOnly],
  );

  const handleRejectEdit = useCallback(() => {
    // No-op — UI handles the visual feedback
  }, []);

  const handleRevertEdit = useCallback(
    async (proposalId: string, _editIndex: number) => {
      if (readOnly) return;
      // Find stored old content for this proposal
      for (const [key, entry] of revertMapRef.current) {
        if (key.startsWith(proposalId)) {
          const existing = blocks.get(entry.blockType);
          if (!existing) continue;

          // Restore old content
          setBlocks((prev) => {
            const next = new Map(prev);
            next.set(entry.blockType, {
              ...existing,
              content: entry.oldContent,
            });
            return next;
          });

          await saveBlock(entry.blockType, entry.oldContent);
          handleAnalyze(entry.blockType);
          revertMapRef.current.delete(key);
          break;
        }
      }
    },
    [blocks, saveBlock, handleAnalyze, readOnly],
  );

  // Handle accepted segment from AI chat — create in DB and link to expanded block
  const handleAcceptSegment = useCallback(
    async (_segKey: string, proposal: SegmentProposal) => {
      if (readOnly) return;
      const targetBlock = expandedBlock ?? "customer_segments";
      const seg = await handleSegmentCreate({
        name: proposal.name,
        description: proposal.description,
        priorityScore:
          proposal.priority === "high"
            ? 80
            : proposal.priority === "medium"
              ? 50
              : 20,
      });
      if (!seg) return;
      // Also persist the extra fields
      await handleSegmentUpdate(seg.$id, {
        demographics: proposal.demographics,
        psychographics: proposal.psychographics,
        behavioral: proposal.behavioral,
        geographic: proposal.geographic,
        estimatedSize: proposal.estimatedSize,
      });
      await handleSegmentLink(targetBlock, seg.$id, seg);
    },
    [
      expandedBlock,
      handleSegmentCreate,
      handleSegmentUpdate,
      handleSegmentLink,
      readOnly,
    ],
  );

  // Handle accepted block item from AI chat — create as BlockItem (legacy) + Card (normalized)
  const handleAcceptItem = useCallback(
    (_itemKey: string, proposal: BlockItemProposal) => {
      if (readOnly) return;
      const targetBlock = expandedBlock;
      if (!targetBlock) return;
      // Legacy: still write to contentJson items for backward compat
      const newItem: BlockItem = {
        id: crypto.randomUUID(),
        name: proposal.name,
        description: proposal.description || undefined,
        linkedSegmentIds: [],
        linkedItemIds: [],
        createdAt: new Date().toISOString(),
      };
      updateBlockItems(targetBlock, (items) => [...items, newItem]);
    },
    [expandedBlock, updateBlockItems, readOnly],
  );

  // Check if any non-shared block has lean content (to show convert button)
  const hasLeanContent = (() => {
    for (const def of BLOCK_DEFINITIONS) {
      if (isSharedBlock(def.type)) continue;
      const b = blocks.get(def.type);
      if (b && b.content.lean.trim().length > 0) return true;
    }
    return false;
  })();

  // Convert Lean content into BMC fields using AI
  const [isConverting, setIsConverting] = useState(false);

  const handleConvertLeanToBmc = useCallback(async () => {
    if (readOnly) return;
    // Check if any BMC content would be overwritten
    const hasExistingBmc = BLOCK_DEFINITIONS.some((def) => {
      if (isSharedBlock(def.type)) return false;
      const b = blocks.get(def.type);
      return b && b.content.bmc.trim().length > 0;
    });

    if (
      hasExistingBmc &&
      !window.confirm(
        "AI will reinterpret your Lean Canvas content and overwrite existing BMC blocks. Continue?",
      )
    ) {
      return;
    }

    setIsConverting(true);
    try {
      const res = await fetch(`/api/canvas/${canvasId}/convert-lean-to-bmc`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Conversion failed:", data.error);
        return;
      }

      const { updates } = (await res.json()) as {
        updates: {
          blockType: string;
          bmc: string;
          lean: string;
          reasoning: string;
        }[];
      };

      // Apply converted content to local state
      setBlocks((prev) => {
        const next = new Map(prev);
        for (const u of updates) {
          const existing = next.get(u.blockType as BlockType);
          if (!existing) continue;
          next.set(u.blockType as BlockType, {
            ...existing,
            content: {
              bmc: u.bmc,
              lean: u.lean,
              items: existing.content.items,
            },
          });
        }
        return next;
      });

      setSaveStatus("saved");
      setMode("bmc");
    } catch (err) {
      console.error("Conversion error:", err);
    } finally {
      setIsConverting(false);
    }
  }, [blocks, canvasId, readOnly]);

  // Check if all blocks have meaningful content (gate for deep-dive AI)
  const allBlocksFilled = (() => {
    for (const [type, b] of blocks) {
      const content = (
        isSharedBlock(type)
          ? b.content.bmc
          : mode === "lean"
            ? b.content.lean
            : b.content.bmc
      ).trim();
      if (content.length < 10) return false;
    }
    return blocks.size >= 9;
  })();

  const filledCount = (() => {
    let count = 0;
    for (const [type, b] of blocks) {
      const content = (
        isSharedBlock(type)
          ? b.content.bmc
          : mode === "lean"
            ? b.content.lean
            : b.content.bmc
      ).trim();
      if (content.length >= 10) count++;
    }
    return count;
  })();

  const expandedBlockData = expandedBlock
    ? blocks.get(expandedBlock)
    : undefined;

  const deepDiveBlockData = deepDiveBlock
    ? blocks.get(deepDiveBlock)
    : undefined;
  const activeChatBlock = expandedBlock ?? chatTargetBlock;
  const reservedRightSpace =
    chatDocked && isDesktop && !expandedBlock ? "460px" : undefined;
  const showPublicReadOnlyBanner = readOnly && canvasData.isPublic;

  useEffect(() => {
    if (readOnly && activeTab === "analysis") {
      setActiveTab("canvas");
    }
  }, [activeTab, readOnly]);

  return (
    <div
      className="canvas-zoom-root flex flex-col h-screen p-5 gap-3 transition-[padding-right] duration-300 ease-out"
      style={
        {
          paddingRight: reservedRightSpace,
          "--canvas-font-zoom": textZoom,
        } as CSSProperties
      }
    >
      {showPublicReadOnlyBanner && (
        <div
          style={{
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "10px",
            padding: "0.5rem 0.75rem",
            background: "linear-gradient(90deg, rgba(99,102,241,0.16), rgba(236,72,153,0.1))",
            color: "#f8fafc",
            fontSize: "0.8rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span>
            You are viewing this shared canvas in read-only mode.
          </span>
          <span
            className="mode-badge mode-badge-lean"
            style={{ padding: "0.2rem 0.45rem", fontSize: "0.68rem" }}
          >
            Shared
          </span>
        </div>
      )}
      <CanvasToolbar
        title={canvasData.title}
        mode={mode}
        saveStatus={saveStatus}
        readOnly={readOnly}
        onModeChange={setMode}
        onTitleChange={(title) => saveCanvas({ title })}
        onSettingsOpen={() => setShowSettings(true)}
        onConvertLeanToBmc={handleConvertLeanToBmc}
        hasLeanContent={hasLeanContent}
        isConverting={isConverting}
      />

      <CanvasTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "canvas" && (
        <BMCGrid
          mode={mode}
          blocks={blocks}
          focusedBlock={focusedBlock}
          readOnly={readOnly}
          analyzingBlock={analyzingBlock}
          chatTargetBlock={activeChatBlock}
          dimmed={!!expandedBlock}
          allSegments={Array.from(segments.values())}
          hoveredItem={hoveredItem}
          onBlockChange={handleBlockChange}
          onBlockFocus={setFocusedBlock}
          onBlockBlur={() => setFocusedBlock(null)}
          onBlockExpand={setExpandedBlock}
          onBlockAddToChat={setChatTargetBlock}
          onBlockAnalyze={handleAnalyze}
          onSegmentClick={(segmentId) => {
            // Find which block owns this segment and expand it
            for (const [bt, block] of blocks) {
              if (block.linkedSegments?.some((s) => s.$id === segmentId)) {
                setExpandedBlock(bt);
                break;
              }
            }
          }}
          onAddSegment={async (name, description) => {
            const seg = await handleSegmentCreate({ name, description });
            if (seg) {
              await handleSegmentLink("customer_segments", seg.$id, seg);
            }
          }}
          onSegmentUpdate={async (segmentId, updates) => {
            await handleSegmentUpdate(segmentId, updates);
          }}
          onSegmentFocus={(segmentId) => {
            setExpandedBlock("customer_segments");
          }}
          onItemCreate={handleItemCreate}
          onItemUpdate={handleItemUpdate}
          onItemDelete={handleItemDelete}
          onItemToggleSegment={handleItemToggleSegment}
          onItemToggleLink={handleItemToggleLink}
          onItemHover={setHoveredItem}
        />
      )}

      {activeTab === "analysis" && !readOnly && (
        <AnalysisView
          blocks={blocks}
          mode={mode}
          consistencyData={consistencyData}
          isCheckingConsistency={isCheckingConsistency}
          onRunConsistencyCheck={handleConsistencyCheck}
        />
      )}

      {activeTab === "notes" && (
        <NotesView value={notes} readOnly={readOnly} onChange={handleNotesChange} />
      )}

      {activeTab === "debug" && (
        <DebugPanel
          blocks={blocks}
          segments={Array.from(segments.values())}
        />
      )}

      {/* Block Focus Panel */}
      {expandedBlock && expandedBlockData && (
        <BlockFocusPanel
          blockType={expandedBlock}
          block={expandedBlockData}
          mode={mode}
          canvasId={canvasId}
          isAnalyzing={analyzingBlock === expandedBlock}
          allBlocksFilled={allBlocksFilled}
          filledCount={filledCount}
          allSegments={Array.from(segments.values())}
          readOnly={readOnly}
          onChange={(value) => handleBlockChange(expandedBlock, value)}
          onClose={() => setExpandedBlock(null)}
          onAnalyze={() => handleAnalyze(expandedBlock)}
          onDeepDive={() => {
            if (!readOnly) setDeepDiveBlock(expandedBlock);
          }}
          onSegmentCreate={handleSegmentCreate}
          onSegmentUpdate={handleSegmentUpdate}
          onSegmentDelete={handleSegmentDelete}
          onSegmentLink={(segmentId, segmentOverride) =>
            handleSegmentLink(expandedBlock, segmentId, segmentOverride)
          }
          onSegmentUnlink={(segmentId) =>
            handleSegmentUnlink(expandedBlock, segmentId)
          }
          chatSection={
            !readOnly ? (
              <BlockChatSection
                canvasId={canvasId}
                blockType={expandedBlock}
                onAcceptEdit={handleAcceptEdit}
                onRejectEdit={handleRejectEdit}
                onRevertEdit={handleRevertEdit}
                onAcceptSegment={handleAcceptSegment}
                onAcceptItem={handleAcceptItem}
              />
            ) : null
          }
        />
      )}

      {/* Segment Evaluation — main area panel (left of sidebar) */}
      {expandedBlock === "customer_segments" &&
        expandedBlockData &&
        !readOnly &&
        (expandedBlockData.linkedSegments?.length ?? 0) > 0 && (
          <div className="fixed inset-0 z-40 pointer-events-none">
            <div
              className="absolute top-0 bottom-0 left-0 pointer-events-auto overflow-y-auto"
              style={{ right: "420px" }}
            >
              <div className="p-6 max-w-3xl mx-auto space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-display-small text-xs uppercase tracking-wider text-foreground-muted/70">
                    Segment Evaluation
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <InlineSegmentEval
                  canvasId={canvasId}
                  block={expandedBlockData}
                  segments={expandedBlockData.linkedSegments ?? []}
                  onDataChange={(data) =>
                    handleDeepDiveDataChange("customer_segments", data)
                  }
                />
              </div>
            </div>
          </div>
        )}

      {/* Chat Bar */}
      {!readOnly && (
        <ChatBar
          canvasId={canvasId}
          chatBlock={activeChatBlock}
          docked={expandedBlock ? false : chatDocked}
          onDockedChange={(next) => {
            if (!expandedBlock) {
              setChatDocked(next);
            }
          }}
          onAcceptEdit={handleAcceptEdit}
          onRejectEdit={handleRejectEdit}
          onRevertEdit={handleRevertEdit}
        />
      )}

      {/* Deep Dive Overlay */}
      {!readOnly && deepDiveBlock && deepDiveBlockData && (
        <DeepDiveOverlay
          blockType={deepDiveBlock}
          canvasId={canvasId}
          deepDiveData={deepDiveBlockData.deepDiveData}
          allBlocksFilled={allBlocksFilled}
          filledCount={filledCount}
          onDataChange={(data) => handleDeepDiveDataChange(deepDiveBlock, data)}
          onClose={() => setDeepDiveBlock(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <CanvasSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          canvasSlug={canvasData.slug}
          description={canvasData.description}
          isPublic={canvasData.isPublic}
          textZoom={textZoom}
          onTextZoomChange={(value) => setTextZoom(clampTextZoom(value))}
          onSave={(updates) => saveCanvas(updates)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
