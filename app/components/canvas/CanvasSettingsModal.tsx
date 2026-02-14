'use client';

import { useState } from 'react';
import { Dialog } from '@radix-ui/themes';

interface CanvasSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasId: string;
  description: string;
  isPublic: boolean;
  onSave: (updates: { description?: string; isPublic?: boolean }) => void;
  onDelete: () => void;
}

export function CanvasSettingsModal({
  open,
  onOpenChange,
  description: initialDesc,
  isPublic: initialPublic,
  onSave,
  onDelete,
}: CanvasSettingsModalProps) {
  const [desc, setDesc] = useState(initialDesc);
  const [pub, setPub] = useState(initialPublic);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    onSave({ description: desc, isPublic: pub });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { onOpenChange(o); setConfirmDelete(false); }}>
      <Dialog.Content maxWidth="480px" style={{ background: 'var(--canvas-surface)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Dialog.Title size="4">Canvas Settings</Dialog.Title>

        <div className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground-muted uppercase tracking-wider">Description</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-[var(--chroma-indigo)]/40 resize-none min-h-[80px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe this canvas..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Public Canvas</div>
              <div className="text-xs text-foreground-muted">Allow others to view this canvas</div>
            </div>
            <button
              onClick={() => setPub(!pub)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                pub ? 'bg-[var(--chroma-indigo)]' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  pub ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm rounded-lg glass-morphism hover:bg-white/10 transition-colors"
            >
              Save
            </button>
          </div>

          <hr className="border-white/5 my-2" />

          <div>
            <div className="text-xs text-foreground-muted uppercase tracking-wider mb-2">Danger Zone</div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 text-sm text-[var(--state-critical)] border border-[var(--state-critical)]/20 rounded-lg hover:bg-[var(--state-critical)]/10 transition-colors"
              >
                Delete Canvas
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--state-critical)]">Are you sure?</span>
                <button
                  onClick={onDelete}
                  className="px-4 py-2 text-sm bg-[var(--state-critical)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
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
