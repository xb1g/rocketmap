# Landing Page + Google Authentication System Design

**Date:** 2026-02-13
**Status:** Approved
**Scope:** MVP landing page, Google OAuth login, dashboard with onboarding flow

---

## Overview

Build a minimal landing page with Google authentication that gets users into the RocketMap product quickly. After login, users see a lightweight onboarding flow (first visit) or their canvas dashboard (returning users).

**Core Philosophy:** Minimal gateway → fast authentication → brief orientation → productive workspace.

---

## Requirements Summary

- **Landing Page:** Minimal hero with tagline + "Sign in with Google" CTA
- **Authentication:** Google OAuth via Appwrite (already configured)
- **Post-Login:** Dashboard-centric routing with conditional onboarding
- **Onboarding:** 2-3 lightweight screens introducing the playable business model concept
- **Canvas URLs:** Slugified names (e.g., `/canvas/my-saas-startup`)
- **Architecture:** Next.js App Router with server components + Appwrite server SDK

---

## Architecture

### Route Structure

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Public | Minimal landing page with Google sign-in CTA |
| `/auth/callback` | Public | OAuth callback handler (server-side session creation) |
| `/dashboard` | Protected | Canvas workspace + onboarding modal (first visit) |
| `/canvas/[slug]` | Protected | Canvas editor (future scope, not implemented in this phase) |

### Authentication Flow

```
1. User clicks "Sign in with Google" on landing page
   ↓
2. Client SDK initiates OAuth → redirects to Google
   ↓
3. Google redirects to /auth/callback with OAuth tokens
   ↓
4. Server route handler creates Appwrite session + sets httpOnly cookie
   ↓
5. Redirects to /dashboard
   ↓
6. Middleware validates session on protected routes
   ↓
7. Dashboard server component fetches user data
   ↓
8. Shows onboarding modal (first visit) OR canvas list (returning user)
```

### Key Components

**Configuration:**
- `lib/appwrite.ts` - Client and server SDK initialization
- `lib/appwrite-server.ts` - Server-only session validation utilities
- `lib/utils.ts` - Slug generation helper
- `middleware.ts` - Route protection (validates session, redirects unauthenticated users)

**Routes:**
- `app/page.tsx` - Landing page (replaces current theme showcase)
- `app/auth/callback/route.ts` - OAuth callback handler (GET route)
- `app/dashboard/page.tsx` - Dashboard server component

**Client Components:**
- `app/components/OnboardingModal.tsx` - 3-step intro flow
- `app/components/CanvasList.tsx` - Grid of user's canvases
- `app/components/ErrorBanner.tsx` - Auth/network error display

---

## Landing Page Design

### Visual Structure

**Full-height centered hero section:**
- RocketMap logo/wordmark with `.holographic-bg` gradient
- Tagline: "A Playable Business Model Engine"
- Single primary CTA: "Sign in with Google" button with Google icon
- Dark background with chromatic theme aesthetic
- Optional: Subtle animated gradient or floating particles

**No additional content:** No footer, navbar, or marketing copy. The visual impact comes from the chromatic theme itself.

### Implementation

Replace current `app/page.tsx` showcase content with:
- Centered flex layout (vertical + horizontal centering)
- Heading using `font-display` and `.holographic-bg` class
- Subheading using `font-body` and `text-foreground-muted`
- Button onClick → `account.createOAuth2Session('google', successURL, failureURL)`

**Error Handling:**
- Parse `?error=` query params (e.g., `?error=auth_failed`, `?error=session_expired`)
- Show dismissible error banner above hero using `.glow-warning` or `.glow-critical`

---

## Authentication Implementation

### Environment Variables

**`.env.local` (not committed):**
```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-server-api-key
```

**`.env.example` (committed as template):**
```
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
```

### Client SDK Setup

**`lib/appwrite.ts`:**
- Initialize browser Appwrite client with endpoint + project ID
- Export `client` instance
- Export `account` service (OAuth methods)
- Export `databases` service (user/canvas queries)

### Server SDK Setup

**`lib/appwrite.ts` or `lib/appwrite-server.ts`:**
- Initialize Node.js Appwrite client with API key
- Used only in server components, route handlers, and middleware
- Export `serverClient` and `serverAccount`

### OAuth Flow Details

**1. Landing Page Button:**
```typescript
account.createOAuth2Session(
  'google',
  `${window.location.origin}/auth/callback`, // success
  `${window.location.origin}/?error=auth_failed` // failure
)
```

**2. Callback Handler (`app/auth/callback/route.ts`):**
- Extract OAuth tokens from URL parameters
- Create Appwrite session using server SDK
- Set httpOnly, secure session cookie
- Redirect to `/dashboard`
- Error handling: If session creation fails, redirect to `/?error=auth_failed`

**3. Middleware (`middleware.ts`):**
- Runs on paths: `['/dashboard/:path*', '/canvas/:path*']`
- Validate session from cookies using server SDK
- If invalid/missing → redirect to `/?error=unauthorized`
- If valid → allow request to proceed (returns `NextResponse.next()`)

### Session Management

- **Storage:** httpOnly cookies (managed by Appwrite SDK)
- **Expiration:** 14 days (Appwrite default)
- **Logout:** `account.deleteSession('current')` + redirect to `/`
- **Multi-device:** Appwrite supports multiple concurrent sessions

---

## Dashboard & Onboarding Flow

### Dashboard Page (`app/dashboard/page.tsx`)

**Server Component Logic:**
1. Validate session (middleware already handled this)
2. Fetch current user from Appwrite session
3. Query `users` collection for user document by `userId`
4. If user document doesn't exist (first login):
   - Create user document with `onboardingCompleted: false`
5. Pass user data and `onboardingCompleted` status to client components

### Two Dashboard States

#### A) First-Time User (`onboardingCompleted === false`)

Render `<OnboardingModal>` component:
- Full-screen modal overlay with dark backdrop
- 3 screens with "Next" / "Get Started" navigation
- "Skip" option in top-right (still marks onboarding complete)

**Onboarding Screens:**

1. **Welcome Screen:**
   - Heading: "Welcome to RocketMap"
   - Brief explanation: "A playable business model engine that validates your startup assumptions in real-time"

2. **How It Works:**
   - Visual: 9-block BMC grid illustration
   - Text: "Fill in your business model blocks. AI analyzes each one for hidden assumptions, risks, and critical questions."

3. **Start Building:**
   - Heading: "Ready to Validate Your Startup?"
   - CTA button: "Get Started"
   - On click: Update user document `onboardingCompleted: true` → close modal → show canvas workspace

#### B) Returning User (`onboardingCompleted === true`)

Render canvas workspace dashboard:

**Header:**
- "Your Canvases" heading
- "+ New Canvas" button (top-right)
- Logout button (top-right corner)

**Canvas Grid/List:**
- Display all canvases for current user
- Each card shows:
  - Canvas title
  - Last modified date
  - Click → navigate to `/canvas/[slug]`
- Empty state (no canvases): "Start your first canvas" with CTA button

**New Canvas Flow:**
- Click "+ New Canvas" → show modal/dialog prompting for canvas title
- Generate slug from title → create canvas document → redirect to `/canvas/[slug]`

### Onboarding Modal Component

**`app/components/OnboardingModal.tsx`:**
- Client component (`'use client'`)
- Uses Radix Dialog for modal structure
- Local state: `currentStep` (1, 2, or 3)
- Styled with chromatic theme (holographic accents, `.glow-ai` or `.glow-healthy`)
- Navigation: "Next" button (steps 1-2), "Get Started" button (step 3)
- Skip button calls same completion handler as "Get Started"

---

## Data Model

### Appwrite Database: `rocketmap_production`

#### Collection: `users`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string (unique) | Appwrite user ID (primary key) |
| `email` | string | User's email from Google OAuth |
| `name` | string | Display name from Google |
| `onboardingCompleted` | boolean | Default: false |
| `createdAt` | datetime | Auto-generated |
| `updatedAt` | datetime | Auto-updated |

**Permissions:**
- Read/write only by server (API key authentication)

#### Collection: `canvases`

| Field | Type | Description |
|-------|------|-------------|
| `canvasId` | string (unique) | Auto-generated Appwrite document ID |
| `userId` | string | Owner's Appwrite user ID |
| `title` | string | User-defined canvas name |
| `slug` | string | URL-friendly version (unique per user) |
| `blocks` | JSON | BMC data (9 blocks with content, AI analysis, state) |
| `createdAt` | datetime | Auto-generated |
| `updatedAt` | datetime | Auto-updated |

**Permissions:**
- Read/write only by document owner (user-level permissions)

### Slug Generation Logic

**`lib/utils.ts` helper function:**
1. Convert canvas title to lowercase
2. Replace spaces with hyphens
3. Remove special characters (keep alphanumeric + hyphens)
4. Query existing canvases: `WHERE userId = currentUser AND slug = generatedSlug`
5. If collision detected, append `-2`, `-3`, etc.

**Examples:**
- "My SaaS Idea!" → `my-saas-idea`
- "My SaaS Idea!" (duplicate) → `my-saas-idea-2`
- "Fintech Startup (B2B)" → `fintech-startup-b2b`

---

## Error Handling & Edge Cases

### Authentication Errors

| Scenario | Behavior |
|----------|----------|
| Google OAuth fails | Redirect to `/?error=auth_failed` |
| User denies permissions | Same as OAuth failure |
| Session expired during use | Middleware redirects to `/?error=session_expired` |
| Invalid callback tokens | Redirect to `/?error=auth_failed` |

**Landing Page Error Display:**
- Parse URL query params for `?error=` value
- Show dismissible error banner above hero section
- Use `.glow-warning` or `.glow-critical` styles
- Error messages:
  - `auth_failed`: "Authentication failed. Please try again."
  - `session_expired`: "Your session has expired. Please sign in again."
  - `unauthorized`: "Please sign in to continue."

### Network/API Failures

- **Appwrite SDK errors:** Wrap all calls in try/catch blocks
- **Dashboard data fetch fails:** Show error state with "Retry" button
- **Onboarding completion fails:** Retry automatically, fallback to skip
- **Canvas creation fails:** Show error toast, keep user on dashboard

### Session Edge Cases

| Case | Handling |
|------|----------|
| User clears cookies mid-session | Middleware catches on next navigation → redirect to landing |
| Multiple tabs open | Appwrite syncs session state automatically |
| Concurrent logins (different devices) | Allowed (Appwrite supports multiple sessions) |
| Session cookie manipulation | Server SDK validates integrity → fails auth if invalid |

### Loading States

- **OAuth redirect:** Instant (handled by Appwrite/Google)
- **`/auth/callback` processing:** Show loading spinner during server-side session creation
- **Dashboard initial load:** Skeleton UI for canvas grid while fetching data
- **Onboarding modal:** No loading needed (static content)
- **Canvas navigation:** Loading state on route transition (Next.js default)

---

## File Structure

### New Files

```
lib/
├── appwrite.ts                    # Client & server SDK initialization
├── appwrite-server.ts             # Server-only session validation utilities
└── utils.ts                       # Slug generation helper

middleware.ts                       # Route protection logic

app/
├── page.tsx                       # Landing page (replace current showcase)
├── auth/
│   └── callback/
│       └── route.ts               # OAuth callback handler (GET route)
├── dashboard/
│   └── page.tsx                   # Dashboard server component
└── components/
    ├── OnboardingModal.tsx        # Client component (3-step onboarding)
    ├── CanvasList.tsx             # Client component (canvas grid)
    └── ErrorBanner.tsx            # Client component (error display)

.env.local                         # Environment variables (not committed)
.env.example                       # Template for env vars (committed)
```

### Updated Files

- `app/layout.tsx` - No changes needed (Radix Theme wrapper remains)
- `app/globals.css` - Potentially add loading spinner animation
- `package.json` - No new dependencies (Appwrite already installed)

---

## Component Responsibilities

### `lib/appwrite.ts`

**Exports:**
- `client` - Browser Appwrite instance (endpoint + project ID)
- `account` - Account service for OAuth methods
- `databases` - Database service for queries
- `serverClient` - Node.js Appwrite instance with API key (server-side only)
- `serverAccount` - Server-side account service
- `serverDatabases` - Server-side database service

### `lib/appwrite-server.ts`

**Server-only utilities:**
- `getSessionUser()` - Validates session from request cookies, returns user or null
- `requireAuth(request)` - Throws if no valid session (used in route handlers)

### `lib/utils.ts`

**Helpers:**
- `generateSlug(title: string, userId: string)` - Creates unique slug for canvas
- `formatDate(date: Date)` - Formats last modified dates for dashboard

### `middleware.ts`

**Logic:**
- Match paths: `['/dashboard/:path*', '/canvas/:path*']`
- Extract session cookie from request
- Validate with Appwrite server SDK
- Redirect to `/?error=unauthorized` if invalid
- Return `NextResponse.next()` if valid

### `app/auth/callback/route.ts`

**GET Route Handler:**
- Extract OAuth tokens from URL search params
- Create Appwrite session using server SDK
- Set session cookie (httpOnly, secure, sameSite)
- Redirect to `/dashboard`
- Error handling: Try/catch → redirect to `/?error=auth_failed` on failure

### `app/dashboard/page.tsx`

**Server Component:**
- Async function (awaits user data fetch)
- Fetch current user from session
- Query user document from `users` collection
- Create user document if doesn't exist (first login)
- Query canvases for current user
- Pass data to client components via props
- Conditionally render `<OnboardingModal>` or `<CanvasList>` based on `onboardingCompleted`

### `app/components/OnboardingModal.tsx`

**Client Component:**
- Props: `onComplete: () => void`
- State: `currentStep` (1-3)
- Radix Dialog component wrapper
- 3 screens with navigation
- Skip button in header
- Completion handler updates user document → calls `onComplete` prop

### `app/components/CanvasList.tsx`

**Client Component:**
- Props: `canvases: Canvas[]`, `onNewCanvas: () => void`
- Grid layout of canvas cards
- Empty state when no canvases
- Each card links to `/canvas/[slug]`
- "+ New Canvas" button triggers `onNewCanvas`

### `app/components/ErrorBanner.tsx`

**Client Component:**
- Props: `error: string | null`, `onDismiss: () => void`
- Conditionally rendered based on `error` prop
- Styled with `.glow-warning` or `.glow-critical`
- Dismissible (X button)
- Maps error codes to user-friendly messages

---

## Implementation Notes

### Security Considerations

- **Session cookies:** httpOnly, secure, sameSite=lax (prevent XSS/CSRF)
- **API keys:** Never exposed to client (server SDK only)
- **Route protection:** Middleware validates ALL protected routes (no client-side bypasses)
- **User data isolation:** Appwrite permissions enforce user-level access (can't read other users' canvases)

### Performance Optimizations

- **Server components:** Dashboard fetches data server-side (no client-side loading flash)
- **Parallel queries:** Fetch user document and canvases list simultaneously
- **Minimal client JS:** Only onboarding modal and canvas list are client components
- **Static landing page:** Could be statically generated (no dynamic data)

### Accessibility

- **Keyboard navigation:** All interactive elements focusable
- **ARIA labels:** Buttons and modals properly labeled
- **Error announcements:** Screen readers notified of auth errors
- **High contrast:** Chromatic theme maintains WCAG AA contrast ratios (white text on dark backgrounds)

### Testing Strategy

**Manual Testing Checklist:**
1. Landing page loads correctly
2. "Sign in with Google" initiates OAuth flow
3. Google OAuth success redirects to `/dashboard`
4. First-time user sees onboarding modal
5. Onboarding completion shows canvas workspace
6. Returning user bypasses onboarding
7. Logout clears session and redirects to landing
8. Protected routes redirect unauthenticated users
9. Session expiration handled gracefully
10. Error states display correctly

**Future Automated Tests:**
- E2E tests for auth flow (Playwright)
- Unit tests for slug generation logic
- Integration tests for Appwrite session validation

---

## Future Enhancements (Out of Scope)

- Canvas editor implementation (`/canvas/[slug]` functionality)
- Canvas sharing/collaboration features
- User profile/settings page
- Email/password authentication option
- Social previews for shared canvases
- Analytics tracking (user onboarding completion rate)

---

## Success Criteria

**MVP is complete when:**
1. Users can sign in with Google from landing page
2. First-time users see onboarding flow
3. Returning users see canvas dashboard
4. Sessions persist across page refreshes
5. Logout works correctly
6. Error states display user-friendly messages
7. All routes are properly protected
8. Code follows existing chromatic theme aesthetic

---

## Timeline Estimate

**Implementation phases:**
1. **Appwrite setup** (30 min) - SDK initialization, environment config
2. **Landing page** (1 hour) - Replace showcase, add OAuth button, error banner
3. **Auth flow** (2 hours) - Callback handler, middleware, session management
4. **Dashboard skeleton** (1 hour) - Server component, data fetching logic
5. **Onboarding modal** (1.5 hours) - 3-step flow, styling, completion logic
6. **Canvas list** (1.5 hours) - Grid component, empty state, new canvas flow
7. **Testing & polish** (1 hour) - Manual testing, error handling, edge cases

**Total: ~8.5 hours** (can be split across multiple sessions)

---

## Conclusion

This design provides a streamlined path from landing page to productive workspace using Google authentication. The minimal gateway approach respects user time, the onboarding flow orients new users without friction, and the server-side authentication architecture ensures security and scalability. The implementation leverages Next.js 16 App Router best practices and maintains consistency with RocketMap's chromatic design system.
