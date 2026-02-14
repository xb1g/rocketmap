'use client';

import { Callout } from '@radix-ui/themes';
import { useState, useEffect } from 'react';

interface ErrorBannerProps {
  error: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  session_expired: 'Your session has expired. Please sign in again.',
  unauthorized: 'Please sign in to continue.',
};

export function ErrorBanner({ error }: ErrorBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [error]);

  if (!error || !visible) {
    return null;
  }

  const message = ERROR_MESSAGES[error] || 'An error occurred. Please try again.';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Callout.Root color="red" className="glow-critical">
        <Callout.Text>{message}</Callout.Text>
      </Callout.Root>
    </div>
  );
}
