"use client";

import React, { useState, useEffect } from "react";

import type { BlockState, BlockType, CanvasMode, Segment } from "@/lib/types/canvas";
import { BLOCK_DEFINITIONS } from "./canvas/constants";
import { BlockCell } from "./canvas/BlockCell";

const AIRBNB_DATA: Record<BlockType, string> = {
  key_partnerships: "Hosts, Photographers, Insurance, Payment Processors",
  key_activities: "Platform dev, Marketing, Host onboarding",
  key_resources: "Technology, Listings, Brand, Community",
  value_prop: "Hosts: Extra income. Guests: Unique experiences.",
  customer_relationships: "Self-service, Reviews, 24/7 Support",
  channels: "Mobile app, Website, SEO, Social Media",
  customer_segments: "Travelers seeking value. Hosts with space.",
  cost_structure: "Maintenance, Marketing, Insurance, Legal",
  revenue_streams: "Service fees (Guest: 6-12%, Host: 3%)",
};

const DEMO_SEGMENTS: Segment[] = [
  {
    $id: "seg-travelers",
    name: "Travelers",
    description: "Budget-conscious travelers seeking authentic local experiences over traditional hotels.",
    earlyAdopterFlag: true,
    priorityScore: 85,
    demographics: "Ages 25-40, urban professionals, $50-120k income",
    psychographics: "Experience-seekers, value authenticity over luxury",
    behavioral: "Books 2-4 trips per year, researches extensively on social media",
    geographic: "North America, Western Europe, major APAC cities",
    estimatedSize: "450M globally",
    colorHex: "#6366f1",
  },
  {
    $id: "seg-hosts",
    name: "Hosts",
    description: "Property owners looking to monetize spare space with minimal effort.",
    earlyAdopterFlag: false,
    priorityScore: 70,
    demographics: "Ages 30-55, homeowners, suburban and urban",
    psychographics: "Entrepreneurial-minded, values flexibility and extra income",
    behavioral: "Lists property seasonally, responsive to guest inquiries",
    geographic: "Global, concentrated in tourist destinations",
    estimatedSize: "4M active listings",
    colorHex: "#f43f5e",
  },
];

interface DemoBlockConfig {
  value: string;
  state: BlockState;
  confidenceScore: number;
  hasAnalysis: boolean;
  isAnalyzing?: boolean;
  isFocused?: boolean;
}

const DEMO_BLOCKS: Record<BlockType, DemoBlockConfig> = {
  key_partnerships: { value: AIRBNB_DATA.key_partnerships, state: "calm", confidenceScore: 0.5, hasAnalysis: false },
  key_activities: { value: AIRBNB_DATA.key_activities, state: "calm", confidenceScore: 0.5, hasAnalysis: false },
  key_resources: { value: AIRBNB_DATA.key_resources, state: "calm", confidenceScore: 0.5, hasAnalysis: false },
  value_prop: { value: AIRBNB_DATA.value_prop, state: "healthy", confidenceScore: 0.85, hasAnalysis: true },
  customer_relationships: { value: AIRBNB_DATA.customer_relationships, state: "calm", confidenceScore: 0.5, hasAnalysis: false },
  channels: { value: AIRBNB_DATA.channels, state: "calm", confidenceScore: 0.5, hasAnalysis: false },
  customer_segments: { value: AIRBNB_DATA.customer_segments, state: "ai", confidenceScore: 0.65, hasAnalysis: true },
  cost_structure: { value: AIRBNB_DATA.cost_structure, state: "calm", confidenceScore: 0.5, hasAnalysis: false },
  revenue_streams: { value: AIRBNB_DATA.revenue_streams, state: "warning", confidenceScore: 0.35, hasAnalysis: true },
};

interface DemoTask {
  id: string;
  title: string;
  block: BlockType;
  priority: "high" | "medium" | "low";
  status: "open" | "in-progress" | "done";
}

const DEMO_TASKS: DemoTask[] = [
  { id: "t1", title: "Validate pricing split with 5 hosts", block: "revenue_streams", priority: "high", status: "open" },
  { id: "t2", title: "Interview 10 budget travelers about booking pain points", block: "customer_segments", priority: "high", status: "open" },
  { id: "t3", title: "Map trust-building touchpoints in the guest journey", block: "customer_relationships", priority: "medium", status: "open" },
  { id: "t4", title: "Run SEO channel experiment for 2 weeks", block: "channels", priority: "medium", status: "in-progress" },
  { id: "t5", title: "Confirm insurance partner terms and coverage gaps", block: "key_partnerships", priority: "high", status: "open" },
  { id: "t6", title: "List fixed vs variable cost assumptions", block: "cost_structure", priority: "low", status: "done" },
];

// Build demo block cards for non-segment blocks so BlockCard renders content
function buildDemoBlocks(type: BlockType): Array<{
  $id: string;
  blockType: BlockType;
  contentJson: string;
  confidenceScore: number;
  riskScore: number;
  segments: Segment[];
  state: BlockState;
}> {
  const config = DEMO_BLOCKS[type];
  const items = config.value.split(",").map(s => s.trim()).filter(Boolean);
  return items.map((item, i) => ({
    $id: `demo-${type}-${i}`,
    blockType: type,
    contentJson: JSON.stringify({ text: item, tags: [] }),
    confidenceScore: config.confidenceScore,
    riskScore: 0,
    segments: [],
    state: config.state,
  }));
}

const NOOP = () => {};

type DemoMode = "none" | "segments" | "zoom" | "tasks";

function TaskIcon({ status }: { status: DemoTask["status"] }) {
  if (status === "done") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-state-healthy">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (status === "in-progress") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-state-warning">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground-subtle">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function PriorityBadge({ priority }: { priority: DemoTask["priority"] }) {
  const styles = {
    high: "bg-state-critical/10 text-state-critical border-state-critical/20",
    medium: "bg-state-warning/10 text-state-warning border-state-warning/20",
    low: "bg-state-healthy/10 text-state-healthy border-state-healthy/20",
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border ${styles[priority]}`}>
      {priority}
    </span>
  );
}

export function StaticBMC() {
  const [mode, setMode] = useState<DemoMode>("none");
  const [activeSegment, setActiveSegment] = useState(0);

  useEffect(() => {
    if (mode !== "segments") return;
    const interval = setInterval(() => {
      setActiveSegment(s => (s === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  const isHighlighted = (type: BlockType) => {
    if (mode === "none") return true;
    if (mode === "segments") {
      if (activeSegment === 0) {
        return ["customer_segments", "value_prop", "channels", "revenue_streams"].includes(type);
      } else {
        return ["customer_segments", "value_prop", "key_partnerships", "key_activities"].includes(type);
      }
    }
    if (mode === "zoom") {
      return ["customer_segments", "revenue_streams"].includes(type);
    }
    if (mode === "tasks") {
      return DEMO_TASKS.some(t => t.block === type);
    }
    return true;
  };

  const getBlockState = (type: BlockType): BlockState => {
    if (mode === "tasks" && DEMO_TASKS.some(t => t.block === type)) {
      return "ai";
    }
    if (mode === "segments" && isHighlighted(type)) {
      return "ai";
    }
    if (mode === "zoom" && isHighlighted(type)) {
      return "healthy";
    }
    return DEMO_BLOCKS[type].state;
  };

  const getIsAnalyzing = (type: BlockType): boolean => {
    return mode === "tasks" && DEMO_TASKS.some(t => t.block === type && t.status !== "done");
  };

  const getIsFocused = (type: BlockType): boolean => {
    return mode === "zoom" && ["customer_segments", "revenue_streams"].includes(type);
  };

  return (
    <div className="w-full space-y-10">
      {/* Demo Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button 
          onClick={() => setMode("none")}
          className={`ui-btn ui-btn-xs ${mode === "none" ? "ui-btn-primary" : "ui-btn-ghost"}`}
        >
          Full Canvas
        </button>
        <button 
          onClick={() => setMode("segments")}
          className={`ui-btn ui-btn-xs ${mode === "segments" ? "ui-btn-primary" : "ui-btn-ghost"}`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          Segment Centric
        </button>
        <button 
          onClick={() => setMode("zoom")}
          className={`ui-btn ui-btn-xs ${mode === "zoom" ? "ui-btn-primary" : "ui-btn-ghost"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          Block Zoom
        </button>
        <button 
          onClick={() => setMode("tasks")}
          className={`ui-btn ui-btn-xs ${mode === "tasks" ? "ui-btn-primary" : "ui-btn-ghost"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"/></svg>
          Task Engine
        </button>
      </div>

      {/* The Canvas Shell */}
      <div className="relative p-6 md:p-8 bg-canvas-surface rounded-[14px] border border-border overflow-hidden min-h-[750px] flex flex-col">
        {/* Header Overlay */}
        <div className="flex items-center justify-between mb-8 px-1 relative z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF5A5F] flex items-center justify-center shadow-[0_8px_16px_rgba(255,90,95,0.3)] animate-pulse">
               <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M12.001 18.275c-1.353-1.697-2.148-3.184-2.413-4.457-.263-1.027-.16-1.848.291-2.465.477-.71 1.188-1.056 2.121-1.056s1.643.345 2.12 1.063c.446.61.558 1.432.286 2.465-.291 1.298-1.085 2.785-2.412 4.458zm9.601 1.14c-.185 1.246-1.034 2.28-2.2 2.783-2.253.98-4.483-.583-6.392-2.704 3.157-3.951 3.74-7.028 2.385-9.018-.795-1.14-1.933-1.695-3.394-1.695-2.944 0-4.563 2.49-3.927 5.382.37 1.565 1.352 3.343 2.917 5.332-.98 1.085-1.91 1.856-2.732 2.333-.636.344-1.245.558-1.828.609-2.679.399-4.778-2.2-3.825-4.88.132-.345.395-.98.845-1.961l.025-.053c1.464-3.178 3.242-6.79 5.285-10.795l.053-.132.58-1.116c.45-.822.635-1.19 1.351-1.643.346-.21.77-.315 1.246-.315.954 0 1.698.558 2.016 1.007.158.239.345.557.582.953l.558 1.089.08.159c2.041 4.004 3.821 7.608 5.279 10.794l.026.025.533 1.22.318.764c.243.613.294 1.222.213 1.858zm1.22-2.39c-.186-.583-.505-1.271-.9-2.094v-.03c-1.889-4.006-3.642-7.608-5.307-10.844l-.111-.163C15.317 1.461 14.468 0 12.001 0c-2.44 0-3.476 1.695-4.535 3.898l-.081.16c-1.669 3.236-3.421 6.843-5.303 10.847v.053l-.559 1.22c-.21.504-.317.768-.345.847C-.172 20.74 2.611 24 5.98 24c.027 0 .132 0 .265-.027h.372c1.75-.213 3.554-1.325 5.384-3.317 1.829 1.989 3.635 3.104 5.382 3.317h.372c.133.027.239.027.265.027 3.37.003 6.152-3.261 4.802-6.975z" />
               </svg>
            </div>
            <div>
              <h3 className="font-bold text-2xl leading-tight text-foreground">Airbnb</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-foreground-muted font-mono uppercase tracking-[0.08em]">Live Simulation</span>
                {mode === "segments" && (
                  <span className="text-[10px] font-bold text-chroma-indigo font-mono uppercase tracking-[0.08em] flex items-center gap-1.5 ml-2">
                    <span className="w-1 h-1 rounded-full bg-chroma-indigo animate-ping" />
                    Target: {activeSegment === 0 ? "Travelers" : "Hosts"}
                  </span>
                )}
                {mode === "tasks" && (
                  <span className="text-[10px] font-bold text-state-warning font-mono uppercase tracking-[0.08em] flex items-center gap-1.5 ml-2">
                    <span className="w-1 h-1 rounded-full bg-state-warning animate-ping" />
                    6 tasks extracted
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.08em] text-foreground-muted/70">
              <span className="w-1.5 h-1.5 rounded-full bg-state-healthy/40" />
              <span>Engine Status: Operational</span>
            </div>
          </div>
        </div>

        {/* Grid Container - Real BlockCells */}
        <div className={`bmc-grid flex-1 relative min-h-0 transition-all duration-500 ${mode === "tasks" ? "md:pr-[300px]" : ""}`}>
          {BLOCK_DEFINITIONS.map((definition) => {
            const highlighted = isHighlighted(definition.type);
            const config = DEMO_BLOCKS[definition.type];
            const isSegmentBlock = definition.type === "customer_segments";
            const dimmed = mode === "tasks" ? !highlighted : !highlighted && mode !== "none";
            
            return (
              <div
                key={definition.type}
                className={`bmc-cell ${
                  dimmed ? "opacity-20 blur-[1px] scale-[0.98]" : "opacity-100"
                } transition-all duration-700`}
                style={{
                  gridColumn: definition.gridCol,
                  gridRow: definition.gridRow,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <BlockCell
                  definition={definition}
                  mode={"bmc" as const}
                  value={config.value}
                  state={getBlockState(definition.type)}
                  isFocused={getIsFocused(definition.type)}
                  isAnalyzing={getIsAnalyzing(definition.type)}
                  isChatTarget={false}
                  confidenceScore={config.confidenceScore}
                  hasAnalysis={config.hasAnalysis}
                  readOnly={true}
                  blocks={isSegmentBlock ? undefined : buildDemoBlocks(definition.type)}
                  linkedSegments={isSegmentBlock ? DEMO_SEGMENTS : undefined}
                  allSegments={DEMO_SEGMENTS}
                  onChange={NOOP}
                  onFocus={NOOP}
                  onBlur={NOOP}
                  onExpand={NOOP}
                  onAddToChat={NOOP}
                  onAnalyze={NOOP}
                />
              </div>
            );
          })}
        </div>

        {/* Task Engine Panel */}
        {mode === "tasks" && (
          <div className="absolute top-24 right-6 bottom-6 w-[280px] z-20 animate-in slide-in-from-right-8 fade-in duration-500">
            <div className="h-full flex flex-col rounded-[14px] bg-canvas-surface/95 backdrop-blur-sm border border-border shadow-[0_16px_48px_rgba(var(--ink-shadow),0.18)] overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-raised/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-foreground-muted font-medium">Validation Sprint</span>
                  <span className="text-[10px] font-mono text-state-warning font-medium">{DEMO_TASKS.filter(t => t.status !== "done").length} open</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {DEMO_TASKS.map((task, i) => {
                  const blockDef = BLOCK_DEFINITIONS.find(d => d.type === task.block);
                  const blockLabel = blockDef?.bmcLabel ?? task.block;
                  return (
                    <div
                      key={task.id}
                      className="group p-3 rounded-xl bg-surface-raised border border-border hover:border-state-warning/30 transition-all duration-200 animate-in slide-in-from-right-4 fade-in"
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          <TaskIcon status={task.status} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-relaxed ${task.status === "done" ? "text-foreground-muted line-through" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-foreground-muted bg-foreground/5 px-1.5 py-0.5 rounded">
                              {blockLabel}
                            </span>
                            <PriorityBadge priority={task.priority} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-border bg-surface-raised/50">
                <div className="flex items-center gap-2 text-[10px] font-mono text-foreground-muted">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-chroma-indigo">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>AI prioritizes by risk</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Explainer */}
      <div className="max-w-3xl mx-auto text-center">
         <div className="h-16 flex items-center justify-center">
            {mode === "none" && (
               <p className="text-foreground-muted text-sm animate-in fade-in duration-1000 font-medium">Standard 9-block framework, powered by structural intelligence.</p>
            )}
            {mode === "segments" && (
               <p className="text-chroma-indigo font-medium text-lg animate-in slide-in-from-bottom-2 duration-500">
                  <span className="text-foreground font-bold">Segment-First architecture.</span> Everything is tied to a specific persona.
               </p>
            )}
            {mode === "zoom" && (
               <p className="text-state-healthy font-medium text-lg animate-in slide-in-from-bottom-2 duration-500">
                  <span className="text-foreground font-bold">Double-click into reality.</span> Built-in TAM/SAM/SOM and Unit Economics.
               </p>
            )}
            {mode === "tasks" && (
               <p className="text-state-warning font-medium text-lg animate-in slide-in-from-bottom-2 duration-500">
                  <span className="text-foreground font-bold">Roadmap extraction.</span> Convert assumptions into prioritized validation sprints.
               </p>
            )}
         </div>
      </div>
    </div>
  );
}
