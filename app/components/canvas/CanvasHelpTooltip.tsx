"use client";

import React from "react";
import { Tooltip } from "@radix-ui/themes";

export function CanvasHelpTooltip() {
  const tooltipContent = (
    <div className="flex flex-col gap-2.5 py-1.5 max-w-[280px]">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-display-small text-[10px] uppercase tracking-widest text-(--chroma-cyan)">
          RocketMap Engine
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="space-y-3">
        <div>
          <span className="block text-[11px] font-bold text-white uppercase tracking-tighter mb-0.5">
            Layer 0: The Canvas
          </span>
          <span className="block text-[12px] leading-snug text-foreground-muted">
            The 9-block interactive grid. Map your core business logic here.
          </span>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-white uppercase tracking-tighter mb-0.5">
            Layer 1: Block Detail
          </span>
          <span className="block text-[12px] leading-snug text-foreground-muted">
            Expand blocks to reveal AI analysis, drafting tools, and risk
            detection.
          </span>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-white uppercase tracking-tighter mb-0.5">
            Layer 2: Deep Dive
          </span>
          <span className="block text-[12px] leading-snug text-foreground-muted">
            Access specialized research modules to validate high-risk
            assumptions.
          </span>
        </div>

        <div className="pt-2 border-t border-white/10">
          <span className="block text-[11px] italic text-(--state-ai)/90 leading-tight">
            "Calm Until Critical" — colors represent validation health. Gray is
            calm, Red is high-risk.
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-32 right-6 z-60 pointer-events-auto flex items-center justify-center">
      <Tooltip content={tooltipContent}>
        <button
          type="button"
          className="w-7 h-7 rounded-full glass-morphism border border-white/15 flex items-center justify-center text-foreground-muted hover:text-(--chroma-cyan) hover:border-(--chroma-cyan)/40 hover:glow-ai transition-all duration-300 shadow-xl hover:-translate-y-0.5 active:scale-90 group"
          aria-label="How RocketMap works"
        >
          <span className="font-mono text-xs font-bold group-hover:scale-110 transition-transform">
            ?
          </span>
        </button>
      </Tooltip>
    </div>
  );
}
