import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarketView } from '@/app/components/canvas/MarketView';

describe('MarketView', () => {
  it('renders JTBD as a first-class market panel', () => {
    render(
      <MarketView
        canvasId="canvas-1"
        customerSegmentsBlock={undefined}
        segments={[]}
        allBlocksFilled
        filledCount={9}
        readOnly={false}
        onDataChange={vi.fn()}
        onOpenCustomerSegments={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'JTBD' })).toBeInTheDocument();
    expect(screen.getByText('Generate JTBD with AI')).toBeInTheDocument();
  });
});
