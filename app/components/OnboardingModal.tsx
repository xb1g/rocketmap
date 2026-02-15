'use client';

import { useState } from 'react';
import { Dialog, Button, Heading, Text, Flex, VisuallyHidden } from '@radix-ui/themes';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog.Root open={isOpen}>
      <Dialog.Content maxWidth="600px" className="glow-ai">
        <VisuallyHidden>
          <Dialog.Title>Onboarding</Dialog.Title>
        </VisuallyHidden>
        <Flex direction="column" gap="4">
          {/* Header with Skip button */}
          <Flex justify="between" align="center">
            <Text size="2" className="text-foreground-muted">
              Step {step} of 3
            </Text>
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
          </Flex>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <Flex direction="column" gap="4" className="py-8">
              <Heading size="8" className="font-display text-center">
                Welcome to RocketMap
              </Heading>
              <Text size="4" className="text-foreground-muted text-center leading-relaxed">
                A playable business model engine that validates your startup assumptions in real-time.
              </Text>
            </Flex>
          )}

          {/* Step 2: How It Works */}
          {step === 2 && (
            <Flex direction="column" gap="4" className="py-6">
              <Heading size="7" className="font-display text-center">
                How It Works
              </Heading>
              <div className="grid gap-2 my-4" style={{
                gridTemplateColumns: 'repeat(10, 1fr)',
                gridTemplateRows: 'repeat(3, minmax(60px, 1fr))',
              }}>
                {/* Row 1 & 2 */}
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '1 / 3', gridRow: '1 / 3' }}>
                  <Text size="1" className="text-center font-medium">Key Partners</Text>
                </div>
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '3 / 5', gridRow: '1 / 2' }}>
                  <Text size="1" className="text-center font-medium">Key Activities</Text>
                </div>
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '3 / 5', gridRow: '2 / 3' }}>
                  <Text size="1" className="text-center font-medium">Key Resources</Text>
                </div>
                <div className="rounded-lg chromatic-border glow-healthy p-2 flex items-center justify-center" style={{ gridColumn: '5 / 7', gridRow: '1 / 3' }}>
                  <Text size="1" className="text-center font-medium">Value Propositions</Text>
                </div>
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '7 / 9', gridRow: '1 / 2' }}>
                  <Text size="1" className="text-center font-medium">Customer Relations</Text>
                </div>
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '7 / 9', gridRow: '2 / 3' }}>
                  <Text size="1" className="text-center font-medium">Channels</Text>
                </div>
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '9 / 11', gridRow: '1 / 3' }}>
                  <Text size="1" className="text-center font-medium">Customer Segments</Text>
                </div>
                {/* Row 3 */}
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '1 / 6', gridRow: '3 / 4' }}>
                  <Text size="1" className="text-center font-medium">Cost Structure</Text>
                </div>
                <div className="rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center" style={{ gridColumn: '6 / 11', gridRow: '3 / 4' }}>
                  <Text size="1" className="text-center font-medium">Revenue Streams</Text>
                </div>
              </div>
              <div className="space-y-3">
                <Text size="3" className="text-foreground-muted text-center leading-relaxed block">
                  <strong className="text-foreground">Multi-layer depth:</strong> Each block expands into specialized research modules
                </Text>
                <Text size="3" className="text-foreground-muted text-center leading-relaxed block">
                  <strong className="text-foreground">Cross-block reasoning:</strong> AI validates coherence across your entire business model
                </Text>
              </div>
            </Flex>
          )}

          {/* Step 3: Start Building */}
          {step === 3 && (
            <Flex direction="column" gap="4" className="py-8">
              <Heading size="7" className="font-display text-center">
                Ready to Validate Your Startup?
              </Heading>
              <Text size="3" className="text-foreground-muted text-center leading-relaxed">
                Create your first canvas and start stress-testing your business model assumptions.
              </Text>
            </Flex>
          )}

          {/* Navigation */}
          <Flex justify="end" gap="3" pt="4">
            <Button size="3" onClick={handleNext}>
              {step === 3 ? 'Get Started' : 'Next'}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
