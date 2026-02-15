'use client';

import React from 'react';
import { Tooltip } from '@radix-ui/themes';
import type { BlockDefinition, CanvasMode } from '@/lib/types/canvas';

interface BlockTooltipProps {
  definition: BlockDefinition;
  mode: CanvasMode;
  children: React.ReactElement;
}

export function BlockTooltip({ definition, mode, children }: BlockTooltipProps) {
  const tooltipBody = mode === 'lean' ? definition.tooltip.lean : definition.tooltip.bmc;
  const tooltipAI = definition.tooltip.ai;

  const tooltipContent = (
    <div className="flex flex-col gap-1.5 py-1 max-w-64">
      <div className="text-[13px] leading-snug text-white font-medium">
        {tooltipBody}
      </div>
      <div className="flex items-start gap-2 mt-1 pt-1.5 border-t border-white/10">
        <div className="text-[9px] font-bold px-1 py-px rounded bg-(--chroma-cyan)/20 text-(--chroma-cyan) border border-(--chroma-cyan)/30 uppercase tracking-tighter mt-0.5">
          AI
        </div>
        <div className="text-[11px] italic text-(--chroma-cyan)/90 leading-tight">
          {tooltipAI}
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      {children}
    </Tooltip>
  );
}
