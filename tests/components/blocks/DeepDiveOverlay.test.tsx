import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeepDiveOverlay } from '@/app/components/blocks/DeepDiveOverlay';

function tabLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.ui-tab-btn')).map((button) =>
    button.textContent?.trim() ?? '',
  );
}

describe('DeepDiveOverlay Phase 1 tabs', () => {
  it('surfaces JTBD as the first Customer Segments deep-dive tab', () => {
    const { container } = render(
      <DeepDiveOverlay
        blockType="customer_segments"
        canvasId="canvas-1"
        deepDiveData={null}
        allBlocksFilled
        onDataChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(tabLabels(container)[0]).toBe('JTBD');
  });

  it('exposes Value Proposition and Revenue Streams Phase 1 tabs', () => {
    const valueProp = render(
      <DeepDiveOverlay
        blockType="value_prop"
        canvasId="canvas-1"
        deepDiveData={null}
        allBlocksFilled
        onDataChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(tabLabels(valueProp.container)).toEqual(['JTBD', 'Value / Product']);
    valueProp.unmount();

    const revenue = render(
      <DeepDiveOverlay
        blockType="revenue_streams"
        canvasId="canvas-1"
        deepDiveData={null}
        allBlocksFilled
        onDataChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(tabLabels(revenue.container)[0]).toBe('Revenue / Pricing');
  });
});
