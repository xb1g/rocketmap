"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "../components/OnboardingModal";
import { QuickStats } from "../components/dashboard/QuickStats";
import { CanvasCard } from "../components/dashboard/CanvasCard";
import { AIGuidedModal } from "../components/dashboard/AIGuidedModal";
import { Heading, Text } from "@radix-ui/themes";

interface DashboardClientProps {
  user: {
    $id: string;
    email: string;
    name: string;
  };
  onboardingCompleted: boolean;
  canvases: {
    $id: string;
    title: string;
    slug: string;
    $updatedAt: string;
    blocksCount: number;
  }[];
  stats: {
    totalCanvases: number;
    lastUpdated: string | null;
    avgCompletion: number;
  };
}

export function DashboardClient({
  user,
  onboardingCompleted,
  canvases,
  stats,
}: DashboardClientProps) {
  const [showOnboarding, setShowOnboarding] = useState(!onboardingCompleted);
  const [showGuidedModal, setShowGuidedModal] = useState(false);
  const router = useRouter();

  const handleOnboardingComplete = async () => {
    try {
      const response = await fetch("/api/complete-onboarding", {
        method: "POST",
      });
      if (response.ok) {
        setShowOnboarding(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setShowOnboarding(false);
    }
  };

  const handleNewCanvas = async () => {
    try {
      const res = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Canvas" }),
      });
      if (!res.ok) throw new Error("Failed to create canvas");
      const { slug } = await res.json();
      router.push(`/canvas/${slug}`);
    } catch (error) {
      console.error("Failed to create canvas:", error);
    }
  };

  const handleDuplicate = async (canvasId: string) => {
    try {
      const res = await fetch(`/api/canvas/${canvasId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      router.refresh();
    } catch (error) {
      console.error("Failed to duplicate canvas:", error);
    }
  };

  const handleDelete = async (canvasId: string) => {
    if (!confirm("Delete this canvas? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/canvas/${canvasId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete canvas:", error);
    }
  };

  const firstName = user.name ? user.name.split(" ")[0] : "there";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
      <AIGuidedModal
        open={showGuidedModal}
        onOpenChange={setShowGuidedModal}
      />

      <div style={{ marginBottom: "2rem" }}>
        <Heading
          size="8"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            marginBottom: "0.25rem",
          }}
        >
          Welcome back, {firstName}
        </Heading>
        <Text
          size="2"
          style={{
            color: "var(--foreground-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {today}
        </Text>
      </div>

      <QuickStats stats={stats} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <Heading size="4" style={{ fontFamily: "var(--font-display)" }}>
          Your Canvases
        </Heading>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="quick-launch" onClick={handleNewCanvas}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Quick Canvas
          </button>
          <button
            className="quick-launch"
            onClick={() => setShowGuidedModal(true)}
            style={{
              background: 'linear-gradient(135deg, var(--chroma-indigo), var(--chroma-violet))',
              borderColor: 'transparent',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            AI-Guided
          </button>
        </div>
      </div>

      {canvases.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {canvases.map((canvas) => (
            <CanvasCard
              key={canvas.$id}
              canvas={canvas}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">&#x1F680;</div>
          <Heading
            size="5"
            style={{
              fontFamily: "var(--font-display)",
              marginBottom: "0.5rem",
            }}
          >
            Launch your first canvas
          </Heading>
          <Text
            size="2"
            style={{
              color: "var(--foreground-muted)",
              marginBottom: "1.5rem",
              maxWidth: "400px",
            }}
          >
            Start building your business model. Map out your assumptions,
            validate your ideas, and stress-test your startup.
          </Text>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button className="quick-launch" onClick={handleNewCanvas}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Quick Canvas
            </button>
            <button
              className="quick-launch"
              onClick={() => setShowGuidedModal(true)}
              style={{
                background: 'linear-gradient(135deg, var(--chroma-indigo), var(--chroma-violet))',
                borderColor: 'transparent',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              AI-Guided
            </button>
          </div>
        </div>
      )}
    </>
  );
}
