import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarketView } from '@/app/components/canvas/MarketView';

describe('MarketView', () => {
  it('renders market sizing and beachhead panels without JTBD content', () => {
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

    expect(screen.getByRole('heading', { name: 'Market' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'TAM / SAM / SOM' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Segment decision' })).toBeInTheDocument();
    expect(screen.queryByText('Generate JTBD with AI')).not.toBeInTheDocument();
  });
});
