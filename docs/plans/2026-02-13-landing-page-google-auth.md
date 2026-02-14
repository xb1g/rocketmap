# Landing Page + Google Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build minimal landing page with Google OAuth, dashboard with onboarding flow, and protected routes using Appwrite.

**Architecture:** Next.js 16 App Router with server components for auth validation, Appwrite server SDK for session management, middleware for route protection, client components for interactive UI (onboarding, canvas list).

**Tech Stack:** Next.js 16, Appwrite SDK (client + server), Radix UI Themes, Tailwind CSS, TypeScript

---

## Task 1: Environment Setup & Appwrite Configuration

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Create: `lib/appwrite.ts`

**Step 1: Create environment variable template**

Create `.env.example`:
```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
```

**Step 2: Create local environment file**

Create `.env.local` with actual values (user will provide these):
```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<actual-project-id>
APPWRITE_API_KEY=<actual-api-key>
```

**Step 3: Initialize Appwrite client and server SDKs**

Create `lib/appwrite.ts`:
```typescript
import { Client, Account, Databases } from 'appwrite';

// Client-side SDK (browser)
export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);

// Server-side SDK (Node.js) - only for server components/routes
export const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const serverAccount = new Account(serverClient);
export const serverDatabases = new Databases(serverClient);

// Constants for database
export const DATABASE_ID = 'rocketmap_production';
export const USERS_COLLECTION_ID = 'users';
export const CANVASES_COLLECTION_ID = 'canvases';
```

**Step 4: Update .gitignore**

Verify `.env.local` is in `.gitignore` (Next.js adds this by default):
```bash
grep -q ".env*.local" .gitignore || echo ".env*.local" >> .gitignore
```

**Step 5: Commit configuration**

```bash
git add .env.example lib/appwrite.ts .gitignore
git commit -m "feat: add Appwrite SDK configuration and environment setup"
```

---

## Task 2: Utility Functions

**Files:**
- Create: `lib/utils.ts`

**Step 1: Create slug generation utility**

Create `lib/utils.ts`:
```typescript
import { serverDatabases, DATABASE_ID, CANVASES_COLLECTION_ID } from './appwrite';
import { Query } from 'appwrite';

/**
 * Generate URL-friendly slug from canvas title
 * Handles collisions by appending -2, -3, etc.
 */
export async function generateSlug(title: string, userId: string): Promise<string> {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Default if empty
  if (!slug) {
    slug = 'untitled-canvas';
  }

  // Check for collisions
  let finalSlug = slug;
  let counter = 2;

  while (true) {
    try {
      const existing = await serverDatabases.listDocuments(
        DATABASE_ID,
        CANVASES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('slug', finalSlug),
        ]
      );

      if (existing.documents.length === 0) {
        break; // No collision, we're good
      }

      finalSlug = `${slug}-${counter}`;
      counter++;
    } catch (error) {
      // Collection might not exist yet, that's okay
      break;
    }
  }

  return finalSlug;
}

/**
 * Format date for display (e.g., "Feb 13, 2026")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
```

**Step 2: Commit utilities**

```bash
git add lib/utils.ts
git commit -m "feat: add slug generation and date formatting utilities"
```

---

## Task 3: Server-Side Authentication Utilities

**Files:**
- Create: `lib/appwrite-server.ts`

**Step 1: Create session validation helper**

Create `lib/appwrite-server.ts`:
```typescript
import { cookies } from 'next/headers';
import { serverAccount } from './appwrite';
import type { Models } from 'appwrite';

/**
 * Get current session user from cookies
 * Returns user object or null if not authenticated
 */
export async function getSessionUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

    if (!session) {
      return null;
    }

    // Validate session with Appwrite
    const user = await serverAccount.get();
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 * Use in route handlers that require auth
 */
export async function requireAuth(): Promise<Models.User<Models.Preferences>> {
  const user = await getSessionUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
```

**Step 2: Commit server utilities**

```bash
git add lib/appwrite-server.ts
git commit -m "feat: add server-side authentication utilities"
```

---

## Task 4: Route Protection Middleware

**Files:**
- Create: `middleware.ts`

**Step 1: Create middleware for protected routes**

Create `middleware.ts` in project root:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie
  const sessionCookie = request.cookies.get(
    'a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  );

  // If no session and trying to access protected route, redirect to landing
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  // Session exists, allow the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/canvas/:path*',
  ],
};
```

**Step 2: Commit middleware**

```bash
git add middleware.ts
git commit -m "feat: add route protection middleware for auth"
```

---

## Task 5: OAuth Callback Handler

**Files:**
- Create: `app/auth/callback/route.ts`

**Step 1: Create OAuth callback route handler**

Create `app/auth/callback/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Appwrite automatically sets session cookies during OAuth flow
  // We just need to handle the redirect

  try {
    // Check if we have the session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

    if (!session) {
      // OAuth failed, redirect to landing with error
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'auth_failed');
      return NextResponse.redirect(url);
    }

    // Success - redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(url);
  }
}
```

**Step 2: Commit callback handler**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add OAuth callback route handler"
```

---

## Task 6: Error Banner Component

**Files:**
- Create: `app/components/ErrorBanner.tsx`

**Step 1: Create error banner component**

Create `app/components/ErrorBanner.tsx`:
```typescript
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
```

**Step 2: Commit error banner**

```bash
git add app/components/ErrorBanner.tsx
git commit -m "feat: add error banner component for auth errors"
```

---

## Task 7: Landing Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace current page with minimal landing page**

Replace entire contents of `app/page.tsx`:
```typescript
'use client';

import { Button, Heading, Text } from "@radix-ui/themes";
import { useSearchParams } from 'next/navigation';
import { account } from '@/lib/appwrite';
import { ErrorBanner } from './components/ErrorBanner';

export default function Home() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleSignIn = async () => {
    try {
      // Initiate OAuth flow with Google
      account.createOAuth2Session(
        'google',
        `${window.location.origin}/auth/callback`,
        `${window.location.origin}/?error=auth_failed`
      );
    } catch (err) {
      console.error('Sign in error:', err);
      window.location.href = '/?error=auth_failed';
    }
  };

  return (
    <>
      <ErrorBanner error={error} />

      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <Heading
              size="9"
              className="holographic-bg bg-clip-text text-transparent font-display text-balance"
            >
              RocketMap
            </Heading>

            <Text
              size="5"
              className="text-foreground-muted font-body max-w-xl mx-auto block leading-relaxed"
            >
              A Playable Business Model Engine
            </Text>
          </div>

          <div className="pt-4">
            <Button
              size="4"
              className="cursor-pointer px-8"
              onClick={handleSignIn}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
```

**Step 2: Test landing page**

Run: `npm run dev`
Navigate to: `http://localhost:3000`
Expected: Landing page with RocketMap heading and Google sign-in button

**Step 3: Commit landing page**

```bash
git add app/page.tsx
git commit -m "feat: create minimal landing page with Google sign-in"
```

---

## Task 8: Onboarding Modal Component

**Files:**
- Create: `app/components/OnboardingModal.tsx`

**Step 1: Create onboarding modal with 3 steps**

Create `app/components/OnboardingModal.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Dialog, Button, Heading, Text, Flex } from '@radix-ui/themes';

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
```

**Step 2: Commit onboarding modal**

```bash
git add app/components/OnboardingModal.tsx
git commit -m "feat: add onboarding modal with 3-step flow"
```

---

## Task 9: Canvas List Component

**Files:**
- Create: `app/components/CanvasList.tsx`

**Step 1: Create canvas list component**

Create `app/components/CanvasList.tsx`:
```typescript
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
```

**Step 2: Commit canvas list**

```bash
git add app/components/CanvasList.tsx
git commit -m "feat: add canvas list component with empty state"
```

---

## Task 10: Dashboard Page (Server Component)

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/DashboardClient.tsx`

**Step 1: Create dashboard client component**

Create `app/dashboard/DashboardClient.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingModal } from '../components/OnboardingModal';
import { CanvasList } from '../components/CanvasList';
import { serverDatabases, DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite';
import { Button, Flex, Text } from '@radix-ui/themes';
import { account } from '@/lib/appwrite';

interface DashboardClientProps {
  user: {
    $id: string;
    email: string;
    name: string;
  };
  onboardingCompleted: boolean;
  canvases: any[];
}

export function DashboardClient({ user, onboardingCompleted, canvases }: DashboardClientProps) {
  const [showOnboarding, setShowOnboarding] = useState(!onboardingCompleted);
  const router = useRouter();

  const handleOnboardingComplete = async () => {
    // Update user document to mark onboarding as completed
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
      // Fallback: just hide the modal
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
```

**Step 2: Create dashboard server component**

Create `app/dashboard/page.tsx`:
```typescript
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, USERS_COLLECTION_ID, CANVASES_COLLECTION_ID } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  // Get authenticated user
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  // Fetch or create user document
  let userDoc;
  try {
    const docs = await serverDatabases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('userId', user.$id)]
    );

    if (docs.documents.length === 0) {
      // First-time user - create user document
      userDoc = await serverDatabases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          email: user.email,
          name: user.name || '',
          onboardingCompleted: false,
        }
      );
    } else {
      userDoc = docs.documents[0];
    }
  } catch (error) {
    console.error('Error fetching user document:', error);
    // If database/collection doesn't exist yet, create minimal user state
    userDoc = {
      onboardingCompleted: false,
    };
  }

  // Fetch user's canvases
  let canvases = [];
  try {
    const canvasesResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('$updatedAt'),
      ]
    );
    canvases = canvasesResult.documents;
  } catch (error) {
    // Collection might not exist yet
    console.error('Error fetching canvases:', error);
  }

  return (
    <DashboardClient
      user={{
        $id: user.$id,
        email: user.email,
        name: user.name || '',
      }}
      onboardingCompleted={userDoc.onboardingCompleted || false}
      canvases={canvases}
    />
  );
}
```

**Step 3: Commit dashboard components**

```bash
git add app/dashboard/page.tsx app/dashboard/DashboardClient.tsx
git commit -m "feat: add dashboard with onboarding and canvas list"
```

---

## Task 11: Onboarding Completion API Route

**Files:**
- Create: `app/api/complete-onboarding/route.ts`

**Step 1: Create API route for onboarding completion**

Create `app/api/complete-onboarding/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/appwrite-server';
import { serverDatabases, DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';

export async function POST() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Find user document
    const docs = await serverDatabases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('userId', user.$id)]
    );

    if (docs.documents.length === 0) {
      return NextResponse.json({ error: 'User document not found' }, { status: 404 });
    }

    // Update onboarding status
    await serverDatabases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      docs.documents[0].$id,
      {
        onboardingCompleted: true,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
```

**Step 2: Commit API route**

```bash
git add app/api/complete-onboarding/route.ts
git commit -m "feat: add API route for onboarding completion"
```

---

## Task 12: Testing & Manual Verification

**Files:**
- None (manual testing)

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts on `http://localhost:3000`

**Step 2: Test landing page**

Navigate to: `http://localhost:3000`
Expected:
- Landing page displays with RocketMap heading
- "Sign in with Google" button visible
- Holographic styling applied

**Step 3: Test OAuth flow**

Action: Click "Sign in with Google" button
Expected:
- Redirects to Google OAuth consent screen
- After granting permissions, redirects back to `/auth/callback`
- Then redirects to `/dashboard`

**Step 4: Test onboarding flow**

Expected (first-time user):
- Onboarding modal appears with Step 1
- Can navigate through 3 steps
- "Skip" button works
- "Get Started" completes onboarding

**Step 5: Test dashboard**

Expected (after onboarding):
- Empty state shows "Start Your First Canvas"
- "+ New Canvas" button visible
- Logout button works

**Step 6: Test route protection**

Action: Logout, then try to access `/dashboard` directly
Expected: Redirects to `/?error=unauthorized`

**Step 7: Test error handling**

Action: Visit `/?error=auth_failed`
Expected: Error banner displays "Authentication failed"

**Step 8: Document test results**

Create a simple checklist:
```markdown
## Manual Test Results

- [ ] Landing page loads
- [ ] Google sign-in initiates OAuth
- [ ] OAuth callback redirects to dashboard
- [ ] Onboarding modal appears for new users
- [ ] Onboarding can be completed
- [ ] Returning users skip onboarding
- [ ] Dashboard shows empty state
- [ ] Logout works
- [ ] Route protection redirects unauthenticated users
- [ ] Error states display correctly
```

---

## Task 13: Create .env.example Documentation

**Files:**
- Modify: `.env.example`

**Step 1: Add comments to .env.example**

Update `.env.example` with helpful comments:
```bash
# Appwrite Configuration
# Get these values from your Appwrite Console (https://cloud.appwrite.io)

# Appwrite API endpoint (use cloud.appwrite.io or your self-hosted instance)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1

# Your Appwrite Project ID (found in Project Settings)
NEXT_PUBLIC_APPWRITE_PROJECT_ID=

# Appwrite API Key with server permissions (create in Project Settings > API Keys)
# Required permissions: documents.read, documents.write
APPWRITE_API_KEY=
```

**Step 2: Commit updated example**

```bash
git add .env.example
git commit -m "docs: add comments to environment variable template"
```

---

## Task 14: Final Build Test

**Files:**
- None (build verification)

**Step 1: Build production bundle**

Run: `npm run build`
Expected: Build completes without errors

**Step 2: Test production build locally**

Run: `npm run start`
Navigate to: `http://localhost:3000`
Expected: App works in production mode

**Step 3: Check for TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Run linter**

Run: `npm run lint`
Expected: No linting errors (or only minor warnings)

**Step 5: Final commit**

If any fixes were needed during build:
```bash
git add .
git commit -m "fix: resolve build and linting issues"
```

---

## Task 15: Documentation & README Update

**Files:**
- Modify: `README.md` (if exists) or create it

**Step 1: Add authentication setup to README**

Add section to README:
```markdown
## Authentication Setup

RocketMap uses Appwrite for authentication with Google OAuth.

### Prerequisites

1. Create an Appwrite account at [cloud.appwrite.io](https://cloud.appwrite.io)
2. Create a new project
3. Enable Google OAuth provider in **Authentication > Settings**
4. Add your OAuth redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Appwrite credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT` - Your Appwrite endpoint
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID` - Your project ID
- `APPWRITE_API_KEY` - Server API key with documents.read/write permissions

### Database Setup

Create these collections in your Appwrite database:

**Database:** `rocketmap_production`

**Collection:** `users`
- Attributes:
  - `userId` (string, required)
  - `email` (string, required)
  - `name` (string)
  - `onboardingCompleted` (boolean, default: false)

**Collection:** `canvases`
- Attributes:
  - `userId` (string, required)
  - `title` (string, required)
  - `slug` (string, required)
  - `blocks` (string, required) - JSON stringified data

Set permissions appropriately (user-level for canvases, server-only for users).
```

**Step 2: Commit README updates**

```bash
git add README.md
git commit -m "docs: add authentication setup instructions to README"
```

---

## Completion Checklist

Before considering this task complete, verify:

- [ ] All environment variables are documented
- [ ] Landing page works with Google OAuth
- [ ] OAuth callback handles success/failure
- [ ] Middleware protects dashboard and canvas routes
- [ ] Onboarding modal displays for new users
- [ ] Onboarding can be completed or skipped
- [ ] Dashboard shows canvas list (empty state works)
- [ ] Logout functionality works
- [ ] Error states display correctly
- [ ] Production build succeeds
- [ ] No TypeScript errors
- [ ] README documents setup process

---

## Notes for Implementation

### Important Reminders

1. **Appwrite Database Setup:** The user must manually create the database and collections in Appwrite Console before the app will fully work. Document this clearly.

2. **OAuth Redirect URLs:** Must be configured in Appwrite Console under Authentication > Google OAuth provider settings.

3. **API Key Permissions:** The server API key needs `documents.read` and `documents.write` permissions.

4. **Session Cookie Name:** Appwrite uses the format `a_session_{PROJECT_ID}` for cookie names. The middleware and auth utilities account for this.

5. **Error Handling:** All Appwrite calls are wrapped in try/catch because collections might not exist during initial setup.

6. **Canvas Creation:** Task 10 leaves canvas creation as a TODO since `/canvas/[slug]` is out of scope for this phase. This can be implemented later.

### Future Enhancements

- Canvas editor page (`/canvas/[slug]`)
- Canvas creation modal with title input
- Canvas deletion/archiving
- User profile settings
- Email/password auth option
- Session refresh logic
- Better error reporting (Sentry integration)

### Testing Strategy

Since this is MVP, manual testing is sufficient. For production:
- Add E2E tests with Playwright for OAuth flow
- Add unit tests for slug generation
- Add integration tests for API routes
- Add session expiration tests

---

**Plan Complete!**
