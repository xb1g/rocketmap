"use client";

import React, { useState, useEffect } from "react";

type BlockType =
  | "key_partnerships"
  | "key_activities"
  | "key_resources"
  | "value_prop"
  | "customer_relationships"
  | "channels"
  | "customer_segments"
  | "cost_structure"
  | "revenue_streams";

interface BlockDefinition {
  type: BlockType;
  bmcLabel: string;
  gridCol: string;
  gridRow: string;
}

const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { type: "key_partnerships", bmcLabel: "Key Partners", gridCol: "1 / 3", gridRow: "1 / 3" },
  { type: "key_activities", bmcLabel: "Key Activities", gridCol: "3 / 5", gridRow: "1 / 2" },
  { type: "key_resources", bmcLabel: "Key Resources", gridCol: "3 / 5", gridRow: "2 / 3" },
  { type: "value_prop", bmcLabel: "Value Propositions", gridCol: "5 / 7", gridRow: "1 / 3" },
  { type: "customer_relationships", bmcLabel: "Customer Relations", gridCol: "7 / 9", gridRow: "1 / 2" },
  { type: "channels", bmcLabel: "Channels", gridCol: "7 / 9", gridRow: "2 / 3" },
  { type: "customer_segments", bmcLabel: "Customer Segments", gridCol: "9 / 11", gridRow: "1 / 3" },
  { type: "cost_structure", bmcLabel: "Cost Structure", gridCol: "1 / 6", gridRow: "3 / 4" },
  { type: "revenue_streams", bmcLabel: "Revenue Streams", gridCol: "6 / 11", gridRow: "3 / 4" },
];

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

function BlockTypeIcon({ type }: { type: BlockType }) {
  const common = {
    width: 11,
    height: 11,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "key_partnerships":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 1 1 7 7l-1 1" />
          <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l1-1" />
        </svg>
      );
    case "key_activities":
      return (
        <svg {...common}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      );
    case "key_resources":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "value_prop":
      return (
        <svg {...common}>
          <path d="m12 3 1.7 4.4L18 9.1l-4.3 1.7L12 15l-1.7-4.2L6 9.1l4.3-1.7L12 3z" />
        </svg>
      );
    case "customer_relationships":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "channels":
      return (
        <svg {...common}>
          <path d="M3 11v2a4 4 0 0 0 4 4h2" />
          <path d="M3 7v2a8 8 0 0 0 8 8h2" />
          <path d="M3 3v2a12 12 0 0 0 12 12h2" />
        </svg>
      );
    case "customer_segments":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="16" cy="9.5" r="2" />
          <path d="M4.5 20a5 5 0 0 1 9 0" />
          <path d="M14 20a4 4 0 0 1 6 0" />
        </svg>
      );
    case "cost_structure":
      return (
        <svg {...common}>
          <path d="M3 7h18v10H3z" />
          <path d="M7 11h10" />
          <path d="M9 15h3" />
        </svg>
      );
    case "revenue_streams":
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 15v-3" />
          <path d="M12 15V9" />
          <path d="M17 15V6" />
        </svg>
      );
    default:
      return null;
  }
}

type DemoMode = "none" | "segments" | "zoom" | "tasks";

export function StaticBMC() {
  const [mode, setMode] = useState<DemoMode>("none");
  const [activeSegment, setActiveSegment] = useState(0); // 0: Travelers, 1: Hosts

  // Auto-rotate segments if in segment mode
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
    return true;
  };

  const getBlockStateClass = (type: BlockType) => {
    if (mode === "tasks" && ["key_partnerships", "key_activities", "customer_segments"].includes(type)) {
      return "bmc-cell-state-ai";
    }
    if (mode === "segments" && isHighlighted(type)) {
      return "bmc-cell-state-ai";
    }
    if (mode === "zoom" && isHighlighted(type)) {
      return "bmc-cell-state-healthy";
    }
    return "bmc-cell-state-calm";
  };

  return (
    <div className="w-full space-y-10">
      {/* Demo Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button 
          onClick={() => setMode("none")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${mode === "none" ? "bg-white text-black shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
        >
          Full Canvas
        </button>
        <button 
          onClick={() => setMode("segments")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${mode === "segments" ? "bg-indigo-500 text-white shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          Segment Centric
        </button>
        <button 
          onClick={() => setMode("zoom")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${mode === "zoom" ? "bg-emerald-500 text-white shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          Block Zoom
        </button>
        <button 
          onClick={() => setMode("tasks")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${mode === "tasks" ? "bg-amber-500 text-white shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"/></svg>
          Task Engine
        </button>
      </div>

      {/* The Canvas Shell */}
      <div className="relative p-8 bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-visible min-h-[750px] flex flex-col">
        {/* Header Overlay */}
        <div className="flex items-center justify-between mb-8 px-1 relative z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF5A5F] flex items-center justify-center shadow-[0_8px_16px_rgba(255,90,95,0.3)] animate-pulse">
               <svg width="28" height="28" viewBox="0 0 32 32" fill="white">
                  <path d="M16 1a6.95 6.95 0 0 0-5.18 2.32c-1.4 1.51-2.07 3.51-1.89 5.64.44 5.31 4.7 9.87 7.07 12.33 2.37-2.46 6.63-7.02 7.07-12.33.18-2.13-.49-4.13-1.89-5.64A6.95 6.95 0 0 0 16 1zm0 2c1.39 0 2.7.55 3.68 1.54.91.91 1.39 2.18 1.28 3.54-.38 4.62-4.18 8.68-4.96 9.5-.78-.82-4.58-4.88-4.96-9.5-.11-1.36.37-2.63 1.28-3.54A5.2 5.2 0 0 1 16 3zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
               </svg>
            </div>
            <div>
              <h3 className="font-bold text-2xl leading-tight text-white/95">Airbnb</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">Live Simulation</span>
                {mode === "segments" && (
                  <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-[0.2em] flex items-center gap-1.5 ml-2">
                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />
                    Target: {activeSegment === 0 ? "Travelers" : "Hosts"}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
              <span>Engine Status: Operational</span>
            </div>
          </div>
        </div>

        {/* Grid Container */}
        <div className="bmc-grid flex-1 relative min-h-0">
          {BLOCK_DEFINITIONS.map((def) => {
            const highlighted = isHighlighted(def.type);
            const isZoomed = mode === "zoom" && highlighted;
            const stateClass = getBlockStateClass(def.type);
            
            return (
              <div
                key={def.type}
                className={`bmc-cell bmc-cell-panel h-full group relative state-transition ${stateClass}
                  ${highlighted ? "opacity-100" : "opacity-15 blur-[0.5px] scale-[0.98] grayscale-[0.5]"}
                  transition-all duration-700
                `}
                style={{
                  gridColumn: def.gridCol,
                  gridRow: def.gridRow,
                }}
              >
                {/* Block Header (Matched to BlockCell.tsx) */}
                <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 shrink-0">
                  <span className="inline-flex items-center gap-1 font-display-small uppercase tracking-wider text-foreground-muted">
                    <span className="w-4 h-4 rounded-md border border-white/12 bg-white/5 text-foreground-muted/70 shrink-0 inline-flex items-center justify-center">
                      <BlockTypeIcon type={def.type} />
                    </span>
                    <span className="text-[10px] tracking-[0.1em] font-bold">{def.bmcLabel}</span>
                  </span>
                  <div className="flex-1" />
                  {highlighted && (
                     <div className="flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                     </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="relative flex-1 px-2.5 pb-2.5 mt-0.5">
                   {/* Normal Mode Styled Text */}
                   <div className={`text-[12px] leading-[1.5] transition-all duration-500
                      ${highlighted ? "text-white/80" : "text-white/20"}
                      ${isZoomed ? "opacity-0 scale-95 translate-y-4" : "opacity-100 scale-100 translate-y-0"}
                   `}>
                    {AIRBNB_DATA[def.type]}
                  </div>

                  {/* Zoom: Customer Segments Detail */}
                  {def.type === "customer_segments" && mode === "zoom" && (
                    <div className="absolute inset-x-2.5 top-0 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                       <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-wider">
                            <span>TAM (Global Travel)</span>
                            <span className="text-white/60 font-bold">$2.3T</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full w-full bg-emerald-500/30" />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-wider">
                            <span>SAM (Alternative Stays)</span>
                            <span className="text-white/60 font-bold">$140B</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full w-[45%] bg-emerald-500/50 animate-[width_1.5s_ease-out]" />
                          </div>
                       </div>
                       <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="flex items-center gap-2 p-1.5 rounded bg-white/5 border border-white/5">
                             <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[8px] font-bold text-emerald-400">P1</div>
                             <div className="flex-1">
                                <div className="text-[10px] font-bold text-white/90">The Digital Nomad</div>
                                <div className="text-[8px] text-white/30 uppercase tracking-tighter">Early Adopter Segment</div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Zoom: Revenue Detail */}
                  {def.type === "revenue_streams" && mode === "zoom" && (
                    <div className="absolute inset-x-2.5 top-0 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                       <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                             <div className="text-[8px] text-emerald-500/50 uppercase font-mono tracking-wider font-bold">LTV</div>
                             <div className="text-sm font-bold text-emerald-400">$842</div>
                          </div>
                          <div className="p-2 rounded bg-white/5 border border-white/5">
                             <div className="text-[8px] text-white/30 uppercase font-mono tracking-wider">CAC</div>
                             <div className="text-sm font-bold text-white/80">$124</div>
                          </div>
                       </div>
                       <div className="flex-1 flex flex-col justify-end gap-1 mt-1">
                          <div className="flex items-end gap-1 h-10">
                             {[35, 60, 45, 90, 75, 85].map((h, i) => (
                               <div key={i} className="flex-1 bg-emerald-500/30 rounded-t-[1px] animate-in slide-in-from-bottom duration-1000" style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                             ))}
                          </div>
                          <div className="text-[8px] text-white/20 uppercase font-mono text-center tracking-widest mt-1">Growth Dynamics</div>
                       </div>
                    </div>
                  )}
                </div>

                {/* Task Engine Simulation Overlay */}
                {mode === "tasks" && def.type === "key_activities" && (highlighted) && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex flex-col p-3 animate-in fade-in duration-500">
                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                       Risk Engine
                    </div>
                    <div className="space-y-2.5">
                       <div className="p-2 rounded border border-amber-500/20 bg-amber-500/[0.03] flex flex-col gap-1.5 translate-x-1 opacity-0 animate-[fade-in_0.6s_forwards,translate-x_0.6s_forwards]">
                          <div className="flex items-center justify-between">
                             <span className="text-[8px] text-amber-500/80 font-mono font-bold uppercase">Assumption</span>
                             <span className="text-[8px] text-white/40 font-mono">P: 0.85</span>
                          </div>
                          <div className="text-[10px] leading-tight text-white/90">"Hosts accept strangers without professional insurance."</div>
                       </div>
                       <div className="p-2 rounded border border-indigo-500/20 bg-indigo-500/[0.03] flex flex-col gap-1.5 translate-x-1 opacity-0 animate-[fade-in_0.6s_1s_forwards,translate-x_0.6s_1s_forwards]">
                          <div className="flex items-center justify-between">
                             <span className="text-[8px] text-indigo-400 font-mono font-bold uppercase">Strategy</span>
                             <span className="text-[8px] text-white/40 font-mono">MITIGATE</span>
                          </div>
                          <div className="text-[10px] leading-tight text-white/90">Deploy "Host Guarantee" $1M default coverage program.</div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating AI Status (Task Engine) */}
        {mode === "tasks" && (
           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-2xl bg-black/90 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.25)] backdrop-blur-md animate-in zoom-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center gap-5">
                 <div className="flex -space-x-2.5">
                    {[1, 2, 3].map(i => (
                       <div key={i} className="w-9 h-9 rounded-full border-2 border-black bg-white/10 flex items-center justify-center text-[10px] font-bold shadow-lg">AI</div>
                    ))}
                 </div>
                 <div className="h-8 w-px bg-white/10" />
                 <div className="pr-2">
                    <div className="text-[11px] font-bold text-amber-400 tracking-wide">Task Engine Scanning</div>
                    <div className="text-[10px] text-white/40 font-mono">Synthesizing 12 structural risks...</div>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* Feature Explainer */}
      <div className="max-w-3xl mx-auto text-center">
         <div className="h-16 flex items-center justify-center">
            {mode === "none" && (
               <p className="text-white/40 text-sm animate-in fade-in duration-1000 font-medium">Standard 9-block framework, powered by structural intelligence.</p>
            )}
            {mode === "segments" && (
               <p className="text-indigo-300 font-medium text-lg animate-in slide-in-from-bottom-2 duration-500">
                  <span className="text-white font-bold">Segment-First architecture.</span> Everything is tied to a specific persona.
               </p>
            )}
            {mode === "zoom" && (
               <p className="text-emerald-300 font-medium text-lg animate-in slide-in-from-bottom-2 duration-500">
                  <span className="text-white font-bold">Double-click into reality.</span> Built-in TAM/SAM/SOM and Unit Economics.
               </p>
            )}
            {mode === "tasks" && (
               <p className="text-amber-300 font-medium text-lg animate-in slide-in-from-bottom-2 duration-500">
                  <span className="text-white font-bold">Roadmap extraction.</span> Convert assumptions into prioritized validation sprints.
               </p>
            )}
         </div>
      </div>
    </div>
  );
}
