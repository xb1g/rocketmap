import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SegmentCard } from '@/app/components/canvas/SegmentCard';
import type { Segment } from '@/lib/types/canvas';

describe('SegmentCard', () => {
  const mockSegment: Segment = {
    $id: 'seg-1',
    name: 'Test Segment',
    description: 'Test description',
    earlyAdopterFlag: true,
    priorityScore: 85,
    demographics: '',
    psychographics: '',
    behavioral: '',
    geographic: '',
    estimatedSize: '1000',
  };

  describe('compact mode', () => {
    it('renders segment name', () => {
      render(
        <SegmentCard
          segment={mockSegment}
          mode="compact"
          onLink={vi.fn()}
        />
      );

      expect(screen.getByText('Test Segment')).toBeInTheDocument();
    });

    it('displays priority score', () => {
      render(
        <SegmentCard
          segment={mockSegment}
          mode="compact"
          onLink={vi.fn()}
        />
      );

      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('shows early adopter badge when flag is true', () => {
      render(
        <SegmentCard
          segment={mockSegment}
          mode="compact"
          onLink={vi.fn()}
        />
      );

      expect(screen.getByText('EA')).toBeInTheDocument();
    });
  });

  describe('full mode', () => {
    it('renders segment name and description', () => {
      render(
        <SegmentCard
          segment={mockSegment}
          mode="full"
          onEdit={vi.fn()}
          onFocus={vi.fn()}
          onLink={vi.fn()}
        />
      );

      expect(screen.getByText('Test Segment')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('shows Focus and Link buttons', () => {
      render(
        <SegmentCard
          segment={mockSegment}
          mode="full"
          onEdit={vi.fn()}
          onFocus={vi.fn()}
          onLink={vi.fn()}
        />
      );

      expect(screen.getByTitle('Open in focus view')).toBeInTheDocument();
      expect(screen.getByTitle('Link to other blocks')).toBeInTheDocument();
    });
  });
});
