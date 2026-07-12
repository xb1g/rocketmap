import type { BlockType } from "@/lib/types/canvas";

const BLOCK_ORDER: BlockType[] = [
  "key_partnerships",
  "key_activities",
  "key_resources",
  "value_prop",
  "customer_relationships",
  "channels",
  "customer_segments",
  "cost_structure",
  "revenue_streams",
];

interface CanvasBmcPreviewProps {
  filledBlocks: BlockType[];
}

const PREVIEW_GRID_POSITIONS: Record<BlockType, { col: string; row: string; label: string }> = {
  key_partnerships: { col: '1 / 3', row: '1 / 3', label: 'KP' },
  key_activities: { col: '3 / 5', row: '1 / 2', label: 'KA' },
  key_resources: { col: '3 / 5', row: '2 / 3', label: 'KR' },
  value_prop: { col: '5 / 7', row: '1 / 3', label: 'VP' },
  customer_relationships: { col: '7 / 9', row: '1 / 2', label: 'CR' },
  channels: { col: '7 / 9', row: '2 / 3', label: 'CH' },
  customer_segments: { col: '9 / 11', row: '1 / 3', label: 'CS' },
  cost_structure: { col: '1 / 6', row: '3 / 4', label: 'C$' },
  revenue_streams: { col: '6 / 11', row: '3 / 4', label: 'R$' },
};

export function CanvasBmcPreview({ filledBlocks }: CanvasBmcPreviewProps) {
  const filled = new Set(filledBlocks);

  return (
    <div className="bmc-preview" aria-hidden="true">
      {BLOCK_ORDER.map((block) => {
        const pos = PREVIEW_GRID_POSITIONS[block];
        const isFilled = filled.has(block);
        return (
          <span
            key={block}
            className={`bmc-preview-cell ${isFilled ? "filled" : ""}`}
            style={{ gridColumn: pos.col, gridRow: pos.row }}
          >
            {isFilled && <span className="bmc-preview-label">{pos.label}</span>}
          </span>
        );
      })}
    </div>
  );
}
