"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "../components/OnboardingModal";
import { CanvasCard } from "../components/dashboard/CanvasCard";
import { AIGuidedModal } from "../components/dashboard/AIGuidedModal";
import type { BlockType } from "@/lib/types/canvas";

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
    description: string;
    isPublic: boolean;
    $updatedAt: string;
    $createdAt: string;
    blocksCount: number;
    filledBlocks: BlockType[];
    viabilityScore: number | null;
    viabilityPotentialScore: number | null;
  }[];
}

export function DashboardClient({
  user,
  onboardingCompleted,
  canvases,
}: DashboardClientProps) {
  const [showOnboarding, setShowOnboarding] = useState(!onboardingCompleted);
  const [showGuidedModal, setShowGuidedModal] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const shareFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const clearShareFeedback = () => {
    if (shareFeedbackTimer.current) {
      clearTimeout(shareFeedbackTimer.current);
      shareFeedbackTimer.current = null;
    }
  };

  const showShareFeedbackMessage = (message: string) => {
    clearShareFeedback();
    setShareFeedback(message);
    shareFeedbackTimer.current = setTimeout(() => {
      setShareFeedback((current) => (current === message ? null : current));
    }, 2200);
  };

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

  const handleShare = async (slug: string) => {
    try {
      const url = `${window.location.origin}/canvas/${slug}`;
      await navigator.clipboard.writeText(url);
      showShareFeedbackMessage("Canvas link copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy link:", error);
      showShareFeedbackMessage("Failed to copy link. Please try again.");
    }
  };

  const handleTogglePublic = async (canvasId: string, isPublic: boolean) => {
    try {
      const res = await fetch(`/api/canvas/${canvasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
      if (!res.ok) throw new Error("Failed to update canvas visibility");
      showShareFeedbackMessage("Canvas visibility updated.");
      router.refresh();
    } catch (error) {
      console.error("Failed to update visibility:", error);
      showShareFeedbackMessage("Failed to update visibility. Please try again.");
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

  useEffect(() => {
    return () => clearShareFeedback();
  }, []);

  const firstName = user.name ? user.name.split(" ")[0] : "there";

  return (
    <>
      {shareFeedback && (
        <div className="dashboard-toast">{shareFeedback}</div>
      )}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onChatToCreate={() => setShowGuidedModal(true)}
      />
      <AIGuidedModal
        open={showGuidedModal}
        onOpenChange={setShowGuidedModal}
      />

      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back, {firstName}</h1>
          <p className="dashboard-subtitle">{canvases.length} canvas{canvases.length === 1 ? "" : "es"}</p>
        </div>
        <div className="dashboard-actions">
          <button
            className="ui-btn ui-btn-secondary"
            onClick={() => setShowGuidedModal(true)}
          >
            Chat to Create
          </button>
          <button
            className="ui-btn ui-btn-primary"
            onClick={handleNewCanvas}
          >
            Start Blank
          </button>
        </div>
      </header>

      {canvases.length > 0 ? (
        <section className="canvas-list">
          {canvases.map((canvas) => (
            <CanvasCard
              key={canvas.$id}
              canvas={canvas}
              onShare={handleShare}
              onTogglePublic={handleTogglePublic}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">&#x1F680;</div>
          <h2 className="empty-state-title">Launch your first canvas</h2>
          <p className="empty-state-text">
            Start building your business model. Map out your assumptions,
            validate your ideas, and stress-test your startup.
          </p>
          <div className="dashboard-actions" style={{ justifyContent: "center" }}>
            <button
              className="ui-btn ui-btn-secondary"
              onClick={() => setShowGuidedModal(true)}
            >
              Chat to Create
            </button>
            <button
              className="ui-btn ui-btn-primary"
              onClick={handleNewCanvas}
            >
              Start Blank
            </button>
          </div>
        </div>
      )}
    </>
  );
}
