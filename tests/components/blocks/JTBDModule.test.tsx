import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JTBDModule } from '@/app/components/blocks/jtbd/JTBDModule';
import type { JTBDData } from '@/lib/zones/phase1-jtbd';

describe('JTBDModule', () => {
  const data: JTBDData = {
    statements: [
      {
        id: 'jtbd-1',
        segmentId: 'seg-1',
        role: 'user',
        situation: 'renewal risk appears late',
        job: 'spot fragile assumptions',
        outcome: 'run the smallest retention test',
        statement:
          'When renewal risk appears late, I want spot fragile assumptions, so I can run the smallest retention test.',
        pains: [{ id: 'pain-1', type: 'functional', description: 'Signals are scattered' }],
        priority: 'medium',
      },
    ],
    roleSplits: [],
  };

  it('renders structured JTBD statements and all pain type fields', () => {
    render(
      <JTBDModule
        data={data}
        segments={[{ id: 'seg-1', name: 'Startup founders' }]}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(data.statements[0].statement)).toBeInTheDocument();
    expect(screen.getByText('Functional')).toBeInTheDocument();
    expect(screen.getByText('Emotional')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Economic')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('emits a normalized statement when a JTBD part changes', () => {
    const onSave = vi.fn();
    render(<JTBDModule data={data} onSave={onSave} />);

    fireEvent.change(screen.getByDisplayValue('spot fragile assumptions'), {
      target: { value: 'prioritize the riskiest assumption' },
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        statements: [
          expect.objectContaining({
            job: 'prioritize the riskiest assumption',
            statement:
              'When renewal risk appears late, I want prioritize the riskiest assumption, so I can run the smallest retention test.',
          }),
        ],
      }),
    );
  });
});
