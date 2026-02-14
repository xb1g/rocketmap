'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingModal } from '../components/OnboardingModal';
import { CanvasList } from '../components/CanvasList';
import { Button, Flex, Text } from '@radix-ui/themes';
import { account } from '@/lib/appwrite';

interface DashboardClientProps {
  user: {
    $id: string;
    email: string;
    name: string;
  };
  onboardingCompleted: boolean;
  canvases: { $id: string; title: string; slug: string; $updatedAt: string }[];
}

export function DashboardClient({ user, onboardingCompleted, canvases }: DashboardClientProps) {
  const [showOnboarding, setShowOnboarding] = useState(!onboardingCompleted);
  const router = useRouter();

  const handleOnboardingComplete = async () => {
    try {
      const response = await fetch('/api/complete-onboarding', {
        method: 'POST',
      });

      if (response.ok) {
        setShowOnboarding(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setShowOnboarding(false);
    }
  };

  const handleNewCanvas = () => {
    // TODO: Implement canvas creation flow
    alert('Canvas creation coming soon!');
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <Flex justify="between" align="center" className="mb-8">
            <Text size="2" className="text-foreground-muted">
              {user.email}
            </Text>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </Flex>

          {/* Canvas List */}
          <CanvasList canvases={canvases} onNewCanvas={handleNewCanvas} />
        </div>
      </div>
    </>
  );
}
