"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@/lib/oauth";
import { ErrorBanner } from "./components/ErrorBanner";
import { StaticBMC } from "./components/StaticBMC";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LandingContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#07070a] text-white">
      <ErrorBanner error={error} />
      
      {/* Hero Section */}
      <div className="max-w-md w-full text-center space-y-8 py-20 px-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">RocketMap</h1>
          <p className="text-xl text-gray-400">
            AI-powered Business Model Canvas validation. Stress-test your startup idea in seconds.
          </p>
        </div>

        <button
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-200 transition-colors py-4 px-6 rounded-xl font-semibold text-lg"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <p className="text-sm text-gray-500">
          No credit card required. Free forever plan.
        </p>
      </div>

      {/* Demo Section - Now Full Width */}
      <div className="w-full px-4 md:px-12 lg:px-20 space-y-12 pb-20">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white/90">Interactive Demo</h2>
          <p className="text-white/40 font-mono text-xs uppercase tracking-[0.2em]">Explore the engine features</p>
        </div>
        <StaticBMC />
      </div>
      
      <div className="h-20" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
