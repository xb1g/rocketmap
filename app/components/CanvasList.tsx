'use client';

import { Card, Heading, Text, Button, Flex } from '@radix-ui/themes';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Canvas {
  $id: string;
  title: string;
  slug: string;
  $updatedAt: string;
}

interface CanvasListProps {
  canvases: Canvas[];
  onNewCanvas: () => void;
}

export function CanvasList({ canvases, onNewCanvas }: CanvasListProps) {
  if (canvases.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Flex direction="column" gap="4" align="center" className="max-w-md text-center">
          <Heading size="6" className="font-display">
            Start Your First Canvas
          </Heading>
          <Text size="3" className="text-foreground-muted">
            Create a business model canvas to validate your startup assumptions.
          </Text>
          <Button size="3" onClick={onNewCanvas}>
            + New Canvas
          </Button>
        </Flex>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="7" className="font-display">
          Your Canvases
        </Heading>
        <Button onClick={onNewCanvas}>
          + New Canvas
        </Button>
      </Flex>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {canvases.map((canvas) => (
          <Link key={canvas.$id} href={`/canvas/${canvas.slug}`}>
            <Card className="glow-calm state-transition hover:glow-healthy cursor-pointer p-4 h-full">
              <Flex direction="column" gap="2">
                <Heading size="4" className="font-display">
                  {canvas.title}
                </Heading>
                <Text size="2" className="text-foreground-muted">
                  Updated {formatDate(canvas.$updatedAt)}
                </Text>
              </Flex>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
