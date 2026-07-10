import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JTBDView } from '@/app/components/canvas/JTBDView';

describe('JTBDView', () => {
  it('renders only the focused JTBD workflow', () => {
    render(
      <JTBDView
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
    expect(screen.getByRole('heading', { name: 'Jobs to be Done' })).toBeInTheDocument();
    expect(screen.getByText('Generate JTBD with AI')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'TAM / SAM / SOM' })).not.toBeInTheDocument();
  });
});
