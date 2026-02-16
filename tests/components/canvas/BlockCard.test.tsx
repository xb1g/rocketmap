import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockCard } from '@/app/components/canvas/BlockCard';
import type { Segment } from '@/lib/types/canvas';

describe('BlockCard', () => {
  const mockBlock = {
    $id: 'block-1',
    blockType: 'value_prop' as const,
    contentJson: JSON.stringify({ text: 'Test block content', tags: ['tag1'] }),
    confidenceScore: 75,
    riskScore: 25,
    segments: [] as Segment[],
  };

  const mockHandlers = {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onSegmentToggle: vi.fn(),
  };

  it('renders block content', () => {
    render(
      <BlockCard
        block={mockBlock}
        allSegments={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Test block content')).toBeInTheDocument();
  });

  it('displays confidence score', () => {
    render(
      <BlockCard
        block={mockBlock}
        allSegments={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders tags when present', () => {
    render(
      <BlockCard
        block={mockBlock}
        allSegments={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
  });

  it('shows placeholder when content is empty', () => {
    const emptyBlock = {
      ...mockBlock,
      contentJson: JSON.stringify({ text: '', tags: [] }),
    };

    render(
      <BlockCard
        block={emptyBlock}
        allSegments={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Enter block content...')).toBeInTheDocument();
  });
});
