"use client";

import { useState } from "react";
import { Dialog } from "@radix-ui/themes";

interface CanvasSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasSlug: string;
  description: string;
  isPublic: boolean;
  textZoom: number;
  onTextZoomChange: (zoom: number) => void;
  onSave: (updates: { description?: string; isPublic?: boolean }) => void;
  onDelete: () => void;
}

export function CanvasSettingsModal({
  open,
  onOpenChange,
  canvasSlug,
  description: initialDesc,
  isPublic: initialPublic,
  textZoom,
  onTextZoomChange,
  onSave,
  onDelete,
}: CanvasSettingsModalProps) {
  const [desc, setDesc] = useState(initialDesc);
  const [pub, setPub] = useState(initialPublic);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onSave({ description: desc, isPublic: pub });
    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/canvas/${canvasSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        setConfirmDelete(false);
      }}
    >
      <Dialog.Content
        maxWidth="480px"
        style={{ background: "var(--canvas-surface)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Dialog.Title size="4">Canvas Settings</Dialog.Title>

        <div className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground-muted uppercase tracking-wider">
              Text Size
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={85}
                max={160}
                step={5}
                value={Math.round(textZoom * 100)}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10) / 100;
                  onTextZoomChange(next);
                }}
                className="w-full accent-[var(--chroma-indigo)]"
              />
              <span className="text-xs font-mono text-foreground-muted min-w-12 text-right">
                {Math.round(textZoom * 100)}%
              </span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onTextZoomChange(1)}
                className="ui-btn ui-btn-xs ui-btn-ghost"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground-muted uppercase tracking-wider">
              Description
            </label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-[var(--chroma-indigo)]/40 resize-none min-h-[80px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe this canvas..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground-muted uppercase tracking-wider">
              Public link
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={`${window.location.origin}/canvas/${canvasSlug}`}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-foreground-muted outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="ui-btn ui-btn-sm ui-btn-secondary whitespace-nowrap"
              >
                Copy
              </button>
            </div>
            <div className={`text-xs ${copied ? "text-foreground" : "text-foreground-muted"}`}>
              {copied ? "Copied link to clipboard" : "Keep this URL private if this canvas is private"}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Public Canvas</div>
              <div className="text-xs text-foreground-muted">
                Allow others to view this canvas
              </div>
            </div>
            <button
              onClick={() => setPub(!pub)}
              className={`ui-switch ${pub ? "is-on" : ""}`}
              aria-pressed={pub}
              title={pub ? "Public enabled" : "Public disabled"}
            >
              <span className="ui-switch-thumb" />
            </button>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="ui-btn ui-btn-sm ui-btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="ui-btn ui-btn-sm ui-btn-secondary"
            >
              Save
            </button>
          </div>

          <hr className="border-white/5 my-2" />

          <div>
            <div className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
              Danger Zone
            </div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="ui-btn ui-btn-sm ui-btn-danger"
              >
                Delete Canvas
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--state-critical)]">
                  Are you sure?
                </span>
                <button onClick={onDelete} className="ui-btn ui-btn-sm ui-btn-danger">
                  Yes, Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="ui-btn ui-btn-sm ui-btn-ghost"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
