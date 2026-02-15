"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  BlockData,
  BlockType,
  BlockEditProposal,
  CanvasMode,
  CanvasTab,
  CanvasData,
  AIAnalysis,
  AIUsage,
  MarketResearchData,
  Segment,
} from "@/lib/types/canvas";
import type { ConsistencyData } from "@/app/components/canvas/ConsistencyReport";
import { isSharedBlock } from "@/app/components/canvas/constants";
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

interface CanvasClientProps {
  canvasId: string;
  initialCanvasData: CanvasData;
  initialBlocks: BlockData[];
  initialSegments?: Segment[];
}

type SaveStatus = "saved" | "saving" | "unsaved";

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
  const [chatTargetBlock, setChatTargetBlock] = useState<BlockType | null>(null);
  const [chatDocked, setChatDocked] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeTab, setActiveTab] = useState<CanvasTab>("canvas");
  const [canvasData, setCanvasData] = useState<CanvasData>(initialCanvasData);
  const [showSettings, setShowSettings] = useState(false);
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

  // Save block content
  const saveBlock = useCallback(
    async (blockType: BlockType, content: { bmc: string; lean: string }) => {
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
      let updatedContent = { bmc: "", lean: "" };

      setBlocks((prev) => {
        const next = new Map(prev);
        const existing = next.get(blockType);
        const content = existing?.content ?? { bmc: "", lean: "" };
        // Shared blocks (channels, customer_segments, cost_structure, revenue_streams)
        // always write to both bmc and lean so content stays in sync across modes
        if (isSharedBlock(blockType)) {
          updatedContent = { bmc: value, lean: value };
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

  // Handle accepted block edit from AI chat (single edit at a time)
  const handleAcceptEdit = useCallback(
    async (_proposalId: string, edit: BlockEditProposal) => {
      const existing = blocks.get(edit.blockType);
      if (!existing) return;

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
      className="flex flex-col h-screen p-5 gap-3 transition-[padding-right] duration-300 ease-out"
      style={{ paddingRight: reservedRightSpace }}
    >
      <CanvasToolbar
        title={canvasData.title}
        mode={mode}
        saveStatus={saveStatus}
        onModeChange={setMode}
        onTitleChange={(title) => saveCanvas({ title })}
        onSettingsOpen={() => setShowSettings(true)}
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
          onBlockChange={handleBlockChange}
          onBlockFocus={setFocusedBlock}
          onBlockBlur={() => setFocusedBlock(null)}
          onBlockExpand={setExpandedBlock}
          onBlockAddToChat={setChatTargetBlock}
          onBlockAnalyze={handleAnalyze}
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
          onChange={(value) => handleBlockChange(expandedBlock, value)}
          onClose={() => setExpandedBlock(null)}
          onAnalyze={() => handleAnalyze(expandedBlock)}
          onDeepDive={() => setDeepDiveBlock(expandedBlock)}
          chatSection={
            <BlockChatSection
              canvasId={canvasId}
              blockType={expandedBlock}
              onAcceptEdit={handleAcceptEdit}
              onRejectEdit={handleRejectEdit}
            />
          }
        />
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
      <CanvasSettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        canvasId={canvasId}
        description={canvasData.description}
        isPublic={canvasData.isPublic}
        onSave={(updates) => saveCanvas(updates)}
        onDelete={handleDelete}
      />
    </div>
  );
}
