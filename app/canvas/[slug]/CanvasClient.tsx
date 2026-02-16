"use client";

import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type {
  BlockData,
  BlockItem,
  BlockType,
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
  Card,
} from "@/lib/types/canvas";
import type { HoveredItem } from "@/app/components/canvas/ConnectionOverlay";
import type { ConsistencyData } from "@/app/components/canvas/ConsistencyReport";
import { isSharedBlock, BLOCK_DEFINITIONS } from "@/app/components/canvas/constants";
import { BMCGrid } from "@/app/components/canvas/BMCGrid";
import { CanvasToolbar } from "@/app/components/canvas/CanvasToolbar";
import { CanvasTabs } from "@/app/components/canvas/CanvasTabs";
import { NotesView } from "@/app/components/canvas/NotesView";
import { CanvasSettingsModal } from "@/app/components/canvas/CanvasSettingsModal";
import { BlockFocusPanel } from "@/app/components/canvas/BlockFocusPanel";
import { AnalysisView } from "@/app/components/canvas/AnalysisView";
import { ChatBar } from "@/app/components/ai/ChatBar";
import { BlockChatSection } from "@/app/components/ai/BlockChatSection";
import { DeepDiveOverlay } from "@/app/components/blocks/DeepDiveOverlay";
import { InlineSegmentEval } from "@/app/components/blocks/segment-eval/InlineSegmentEval";

interface CanvasClientProps {
  canvasId: string;
  initialCanvasData: CanvasData;
  initialBlocks: BlockData[];
  initialSegments?: Segment[];
  initialBlocksByType?: Map<BlockType, BlockData[]>;
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
  initialBlocksByType,
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
  const [segments, setSegments] = useState<Map<number, Segment>>(() => {
    const map = new Map<number, Segment>();
    for (const seg of initialSegments) {
      map.set(seg.id, seg);
    }
    return map;
  });
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);
  const [blocksByType, setBlocksByType] = useState<
    Map<BlockType, BlockData[]>
  >(() => {
    if (initialBlocksByType) return initialBlocksByType;
    // Fallback: create empty map
    const map = new Map<BlockType, BlockData[]>();
    for (const block of initialBlocks) {
      if (!map.has(block.blockType)) {
        map.set(block.blockType, []);
      }
      map.get(block.blockType)!.push(block);
    }
    return map;
  });

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
      window.localStorage.setItem(`canvas:textZoom:${canvasId}`, String(textZoom));
    } catch {
      // ignore storage errors
    }
  }, [canvasId, isZoomStorageReady, textZoom]);

  // Save block content
  const saveBlock = useCallback(
    async (blockType: BlockType, content: { bmc: string; lean: string; items?: BlockItem[] }) => {
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
    [canvasId],
  );

  // Save canvas metadata
  const saveCanvas = useCallback(
    async (
      updates: Partial<Pick<CanvasData, "title" | "description" | "isPublic">>,
    ) => {
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
    [canvasId, canvasData.slug, router],
  );

  const handleBlockChange = useCallback(
    (blockType: BlockType, value: string) => {
      let updatedContent: { bmc: string; lean: string; items?: BlockItem[] } = { bmc: "", lean: "" };

      setBlocks((prev) => {
        const next = new Map(prev);
        const existing = next.get(blockType);
        const content = existing?.content ?? { bmc: "", lean: "" };
        // Shared blocks (channels, customer_segments, cost_structure, revenue_streams)
        // always write to both bmc and lean so content stays in sync across modes
        if (isSharedBlock(blockType)) {
          updatedContent = { bmc: value, lean: value, items: content.items };
        } else {
          updatedContent =
            mode === "lean"
              ? { ...content, lean: value }
              : { ...content, bmc: value };
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
    [mode, saveBlock],
  );

  const handleAnalyze = useCallback(
    async (blockType: BlockType) => {
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
    [canvasId],
  );

  const handleConsistencyCheck = useCallback(async () => {
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
  }, [canvasId]);

  const handleNotesChange = useCallback(
    (value: string) => {
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
    [saveCanvas],
  );

  const handleDelete = useCallback(async () => {
    try {
      await fetch(`/api/canvas/${canvasId}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      // silently fail
    }
  }, [canvasId, router]);

  const handleDeepDiveDataChange = useCallback(
    (blockType: BlockType, data: MarketResearchData) => {
      setBlocks((prev) => {
        const next = new Map(prev);
        const b = next.get(blockType);
        if (b) next.set(blockType, { ...b, deepDiveData: data });
        return next;
      });
    },
    [],
  );

  // ─── Segment Handlers ──────────────────────────────────────────────────────

  const handleSegmentCreate = useCallback(
    async (data: {
      name: string;
      description?: string;
      earlyAdopterFlag?: boolean;
      priorityScore?: number;
    }) => {
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
          id: doc.id,
          canvasId: doc.canvasId,
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
        setSegments((prev) => new Map(prev).set(seg.id, seg));
        return seg;
      } catch {
        return null;
      }
    },
    [canvasId],
  );

  const handleSegmentUpdate = useCallback(
    async (segmentId: number, updates: Partial<Segment>) => {
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
          id: doc.id,
          canvasId: doc.canvasId,
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
        setSegments((prev) => new Map(prev).set(seg.id, seg));
        setBlocks((prev) => {
          const next = new Map(prev);
          for (const [bt, block] of next) {
            if (block.linkedSegments?.some((s) => s.id === seg.id)) {
              next.set(bt, {
                ...block,
                linkedSegments: block.linkedSegments.map((s) =>
                  s.id === seg.id ? seg : s,
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
    [canvasId],
  );

  const handleSegmentDelete = useCallback(
    async (segmentId: number) => {
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
            if (block.linkedSegments?.some((s) => s.id === segmentId)) {
              next.set(bt, {
                ...block,
                linkedSegments: block.linkedSegments.filter(
                  (s) => s.id !== segmentId,
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
    [canvasId],
  );

  const handleSegmentLink = useCallback(
    async (blockType: BlockType, segmentId: number, segmentOverride?: Segment) => {
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
            if (!existing.some((s) => s.id === segmentId)) {
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
    [canvasId, segments],
  );

  const handleSegmentUnlink = useCallback(
    async (blockType: BlockType, segmentId: number) => {
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
                (s) => s.id !== segmentId,
              ),
            });
          }
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [canvasId],
  );

  // ─── Block Item Handlers ───────────────────────────────────────────────────

  const debouncedSaveItems = useCallback(
    (blockType: BlockType, content: { bmc: string; lean: string; items?: BlockItem[] }) => {
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
    [saveBlock],
  );

  const updateBlockItems = useCallback(
    (blockType: BlockType, updater: (items: BlockItem[]) => BlockItem[]) => {
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
    [debouncedSaveItems],
  );

  const handleItemCreate = useCallback(
    (blockType: BlockType) => {
      const newItem: BlockItem = {
        id: crypto.randomUUID(),
        name: "New item",
        linkedSegmentIds: [],
        linkedItemIds: [],
        createdAt: new Date().toISOString(),
      };
      updateBlockItems(blockType, (items) => [...items, newItem]);
    },
    [updateBlockItems],
  );

  const handleItemUpdate = useCallback(
    (blockType: BlockType, itemId: string, updates: Partial<BlockItem>) => {
      updateBlockItems(blockType, (items) =>
        items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
      );
    },
    [updateBlockItems],
  );

  const handleItemDelete = useCallback(
    (blockType: BlockType, itemId: string) => {
      updateBlockItems(blockType, (items) => items.filter((item) => item.id !== itemId));
    },
    [updateBlockItems],
  );

  const handleItemToggleSegment = useCallback(
    (blockType: BlockType, itemId: string, segmentId: number) => {
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
    [updateBlockItems],
  );

  const handleItemToggleLink = useCallback(
    (blockType: BlockType, itemId: string, linkedItemId: string) => {
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
    [updateBlockItems],
  );

  // ─── Block Handlers (New Architecture) ─────────────────────────────────────

  /**
   * Update a single block's contentJson field
   */
  const handleBlockUpdate = useCallback(
    async (blockId: string, updates: { contentJson: string }) => {
      try {
        const res = await fetch(`/api/blocks/${blockId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          console.error("Failed to update block");
          return;
        }
        // Update local blocksByType state
        setBlocksByType((prev) => {
          const next = new Map(prev);
          for (const [blockType, blocksArray] of next) {
            const blockIndex = blocksArray.findIndex((b) => b.$id === blockId);
            if (blockIndex !== -1) {
              const updatedBlocks = [...blocksArray];
              updatedBlocks[blockIndex] = {
                ...updatedBlocks[blockIndex],
                // TODO: Parse contentJson when fully migrated
                // For now, keep existing structure
              };
              next.set(blockType, updatedBlocks);
              break;
            }
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to update block:", error);
      }
    },
    [],
  );

  /**
   * Delete a single block
   */
  const handleBlockDelete = useCallback(
    async (blockId: string) => {
      try {
        const res = await fetch(`/api/blocks/${blockId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          console.error("Failed to delete block");
          return;
        }
        // Update local blocksByType state
        setBlocksByType((prev) => {
          const next = new Map(prev);
          for (const [blockType, blocksArray] of next) {
            const filtered = blocksArray.filter((b) => b.$id !== blockId);
            if (filtered.length !== blocksArray.length) {
              next.set(blockType, filtered);
              break;
            }
          }
          return next;
        });
        // Also remove from legacy blocks map if present
        setBlocks((prev) => {
          const next = new Map(prev);
          for (const [blockType, block] of next) {
            if (block.$id === blockId) {
              // Don't delete the blockType entry, just clear its content
              next.set(blockType, {
                ...block,
                content: { bmc: "", lean: "" },
                aiAnalysis: null,
                confidenceScore: 0,
                riskScore: 0,
              });
              break;
            }
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to delete block:", error);
      }
    },
    [],
  );

  /**
   * Toggle segment link for a single block (M:M relationship)
   */
  const handleBlockSegmentToggle = useCallback(
    async (blockId: string, segmentId: number) => {
      try {
        const res = await fetch(`/api/blocks/${blockId}/segments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segmentId }),
        });
        if (!res.ok) {
          console.error("Failed to toggle segment");
          return;
        }
        const { action } = await res.json();
        const segment = segments.get(segmentId);
        if (!segment) return;

        // Update local blocksByType state
        setBlocksByType((prev) => {
          const next = new Map(prev);
          for (const [blockType, blocksArray] of next) {
            const blockIndex = blocksArray.findIndex((b) => b.$id === blockId);
            if (blockIndex !== -1) {
              const updatedBlocks = [...blocksArray];
              const block = updatedBlocks[blockIndex];
              const linkedSegments = block.linkedSegments ?? [];

              if (action === "linked") {
                updatedBlocks[blockIndex] = {
                  ...block,
                  linkedSegments: [...linkedSegments, segment],
                };
              } else {
                updatedBlocks[blockIndex] = {
                  ...block,
                  linkedSegments: linkedSegments.filter(
                    (s) => s.id !== segmentId,
                  ),
                };
              }
              next.set(blockType, updatedBlocks);
              break;
            }
          }
          return next;
        });

        // Also update legacy blocks map
        setBlocks((prev) => {
          const next = new Map(prev);
          for (const [blockType, block] of next) {
            if (block.$id === blockId) {
              const linkedSegments = block.linkedSegments ?? [];
              if (action === "linked") {
                next.set(blockType, {
                  ...block,
                  linkedSegments: [...linkedSegments, segment],
                });
              } else {
                next.set(blockType, {
                  ...block,
                  linkedSegments: linkedSegments.filter(
                    (s) => s.id !== segmentId,
                  ),
                });
              }
              break;
            }
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to toggle segment:", error);
      }
    },
    [segments],
  );

  // ─── Card Handlers (Normalized Collection) ─────────────────────────────────

  const handleCardCreate = useCallback(
    async (blockType: BlockType, name: string, description = "") => {
      try {
        const res = await fetch(
          `/api/canvas/${canvasId}/blocks/${blockType}/cards`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description }),
          },
        );
        if (!res.ok) return null;
        const { card: doc } = await res.json();
        const card: Card = {
          $id: doc.$id,
          id: doc.id,
          blockId: doc.blockId,
          canvasId: doc.canvasId,
          name: doc.name,
          description: doc.description ?? "",
          order: doc.order ?? 0,
          createdAt: doc.createdAt ?? "",
        };
        setBlocks((prev) => {
          const next = new Map(prev);
          const block = next.get(blockType);
          if (block) {
            next.set(blockType, {
              ...block,
              cards: [...(block.cards ?? []), card],
            });
          }
          return next;
        });
        return card;
      } catch {
        return null;
      }
    },
    [canvasId],
  );

  const handleCardUpdate = useCallback(
    async (cardId: string, updates: Partial<Pick<Card, "name" | "description" | "order">>) => {
      try {
        const res = await fetch(`/api/cards/${cardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) return;
        const { card: doc } = await res.json();
        setBlocks((prev) => {
          const next = new Map(prev);
          for (const [bt, block] of next) {
            const cards = block.cards ?? [];
            const idx = cards.findIndex((c) => c.id === cardId);
            if (idx !== -1) {
              const updated = cards.map((c) =>
                c.id === cardId
                  ? { ...c, name: doc.name, description: doc.description ?? "", order: doc.order ?? c.order }
                  : c,
              );
              next.set(bt, { ...block, cards: updated });
              break;
            }
          }
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [],
  );

  const handleCardDelete = useCallback(
    async (cardId: string) => {
      try {
        const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
        if (!res.ok) return;
        setBlocks((prev) => {
          const next = new Map(prev);
          for (const [bt, block] of next) {
            const cards = block.cards ?? [];
            if (cards.some((c) => c.id === cardId)) {
              next.set(bt, { ...block, cards: cards.filter((c) => c.id !== cardId) });
              break;
            }
          }
          return next;
        });
      } catch {
        // silently fail
      }
    },
    [],
  );

  // Track old content for revert/undo of accepted edits
  const revertMapRef = useRef<Map<string, { blockType: BlockType; oldContent: { bmc: string; lean: string } }>>(new Map());

  // Handle accepted block edit from AI chat (single edit at a time)
  const handleAcceptEdit = useCallback(
    async (_proposalId: string, edit: BlockEditProposal) => {
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
        newContent = { bmc: edit.newContent, lean: edit.newContent };
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
    [blocks, saveBlock, handleAnalyze],
  );

  const handleRejectEdit = useCallback(() => {
    // No-op — UI handles the visual feedback
  }, []);

  const handleRevertEdit = useCallback(
    async (proposalId: string, _editIndex: number) => {
      // Find stored old content for this proposal
      for (const [key, entry] of revertMapRef.current) {
        if (key.startsWith(proposalId)) {
          const existing = blocks.get(entry.blockType);
          if (!existing) continue;

          // Restore old content
          setBlocks((prev) => {
            const next = new Map(prev);
            next.set(entry.blockType, { ...existing, content: entry.oldContent });
            return next;
          });

          await saveBlock(entry.blockType, entry.oldContent);
          handleAnalyze(entry.blockType);
          revertMapRef.current.delete(key);
          break;
        }
      }
    },
    [blocks, saveBlock, handleAnalyze],
  );

  // Handle accepted segment from AI chat — create in DB and link to expanded block
  const handleAcceptSegment = useCallback(
    async (_segKey: string, proposal: SegmentProposal) => {
      const targetBlock = expandedBlock ?? "customer_segments";
      const seg = await handleSegmentCreate({
        name: proposal.name,
        description: proposal.description,
        priorityScore: proposal.priority === "high" ? 80 : proposal.priority === "medium" ? 50 : 20,
      });
      if (!seg) return;
      // Also persist the extra fields
      await handleSegmentUpdate(seg.id, {
        demographics: proposal.demographics,
        psychographics: proposal.psychographics,
        behavioral: proposal.behavioral,
        geographic: proposal.geographic,
        estimatedSize: proposal.estimatedSize,
      });
      await handleSegmentLink(targetBlock, seg.id, seg);
    },
    [expandedBlock, handleSegmentCreate, handleSegmentUpdate, handleSegmentLink],
  );

  // Handle accepted block item from AI chat — create as BlockItem (legacy) + Card (normalized)
  const handleAcceptItem = useCallback(
    (_itemKey: string, proposal: BlockItemProposal) => {
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
      // Normalized: also create in cards collection
      handleCardCreate(targetBlock, proposal.name, proposal.description ?? "");
    },
    [expandedBlock, updateBlockItems, handleCardCreate],
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
            content: { bmc: u.bmc, lean: u.lean },
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
  }, [blocks, canvasId]);

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
      <CanvasToolbar
        title={canvasData.title}
        mode={mode}
        saveStatus={saveStatus}
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
              if (block.linkedSegments?.some((s) => s.id === segmentId)) {
                setExpandedBlock(bt);
                break;
              }
            }
          }}
          onAddSegment={async (name, description) => {
            const seg = await handleSegmentCreate({ name, description });
            if (seg) {
              await handleSegmentLink("customer_segments", seg.id, seg);
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
          onBlockUpdate={handleBlockUpdate}
          onBlockDelete={handleBlockDelete}
          onBlockSegmentToggle={(blockId, segmentId) =>
            handleBlockSegmentToggle(blockId, segmentId)
          }
          onBlockHover={(blockId) => {
            // TODO: Implement block hover visualization when migrating to new architecture
          }}
        />
      )}

      {activeTab === "analysis" && (
        <AnalysisView
          blocks={blocks}
          mode={mode}
          consistencyData={consistencyData}
          isCheckingConsistency={isCheckingConsistency}
          onRunConsistencyCheck={handleConsistencyCheck}
        />
      )}

      {activeTab === "notes" && (
        <NotesView value={notes} onChange={handleNotesChange} />
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
          onChange={(value) => handleBlockChange(expandedBlock, value)}
          onClose={() => setExpandedBlock(null)}
          onAnalyze={() => handleAnalyze(expandedBlock)}
          onDeepDive={() => setDeepDiveBlock(expandedBlock)}
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
            <BlockChatSection
              canvasId={canvasId}
              blockType={expandedBlock}
              onAcceptEdit={handleAcceptEdit}
              onRejectEdit={handleRejectEdit}
              onRevertEdit={handleRevertEdit}
              onAcceptSegment={handleAcceptSegment}
              onAcceptItem={handleAcceptItem}
            />
          }
        />
      )}

      {/* Segment Evaluation — main area panel (left of sidebar) */}
      {expandedBlock === "customer_segments" &&
        expandedBlockData &&
        (expandedBlockData.linkedSegments?.length ?? 0) > 0 && (
          <div className="fixed inset-0 z-40 pointer-events-none">
            <div
              className="absolute top-0 bottom-0 left-0 pointer-events-auto overflow-y-auto"
              style={{ right: '420px' }}
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

      {/* Deep Dive Overlay */}
      {deepDiveBlock && deepDiveBlockData && (
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
          canvasId={canvasId}
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
