This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
