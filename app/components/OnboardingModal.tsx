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
            <Flex direction="column" gap="4" className="py-8">
              <Heading size="7" className="font-display text-center">
                How It Works
              </Heading>
              <div className="grid grid-cols-3 gap-2 my-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg chromatic-border glow-calm p-2 flex items-center justify-center"
                  >
                    <Text size="1" className="text-center">Block {i + 1}</Text>
                  </div>
                ))}
              </div>
              <Text size="3" className="text-foreground-muted text-center leading-relaxed">
                Fill in your business model blocks. AI analyzes each one for hidden assumptions, risks, and critical questions.
              </Text>
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
