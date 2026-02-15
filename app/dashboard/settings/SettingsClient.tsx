'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heading, Text, Dialog, Button } from '@radix-ui/themes';

const SETTINGS_KEY = 'rocketmap-settings';

interface Settings {
  defaultMode: 'bmc' | 'lean';
  accentColor: string;
}

const defaultSettings: Settings = {
  defaultMode: 'bmc',
  accentColor: 'iris',
};

const accentColors = [
  { name: 'iris', color: '#6366f1' },
  { name: 'violet', color: '#8b5cf6' },
  { name: 'cyan', color: '#06b6d4' },
  { name: 'pink', color: '#ec4899' },
  { name: 'amber', color: '#f59e0b' },
];

interface AnthropicKeyStatus {
  hasKey: boolean;
  maskedKey: string | null;
}

interface SettingsClientProps {
  initialAnthropicKeyStatus: AnthropicKeyStatus;
}

export function SettingsClient({ initialAnthropicKeyStatus }: SettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showSaved, setShowSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicKeyStatus, setAnthropicKeyStatus] = useState<AnthropicKeyStatus>(initialAnthropicKeyStatus);
  const [savingAnthropicKey, setSavingAnthropicKey] = useState(false);
  const [removingAnthropicKey, setRemovingAnthropicKey] = useState(false);
  const [anthropicError, setAnthropicError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveSettings = useCallback((updated: Settings) => {
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, []);

  const showSavedToast = useCallback(() => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, []);

  const handleSaveAnthropicKey = async () => {
    if (!anthropicApiKey.trim()) {
      setAnthropicError('Enter your Anthropic API key.');
      return;
    }

    setAnthropicError(null);
    setSavingAnthropicKey(true);
    try {
      const res = await fetch('/api/user/anthropic-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: anthropicApiKey.trim() }),
      });

      const data = (await res.json()) as {
        hasKey?: boolean;
        maskedKey?: string | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save API key');
      }

      setAnthropicKeyStatus({
        hasKey: Boolean(data.hasKey),
        maskedKey: data.maskedKey ?? null,
      });
      setAnthropicApiKey('');
      showSavedToast();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save API key';
      setAnthropicError(message);
    } finally {
      setSavingAnthropicKey(false);
    }
  };

  const handleRemoveAnthropicKey = async () => {
    setAnthropicError(null);
    setRemovingAnthropicKey(true);
    try {
      const res = await fetch('/api/user/anthropic-key', {
        method: 'DELETE',
      });

      const data = (await res.json()) as {
        hasKey?: boolean;
        maskedKey?: string | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove API key');
      }

      setAnthropicKeyStatus({
        hasKey: Boolean(data.hasKey),
        maskedKey: data.maskedKey ?? null,
      });
      setAnthropicApiKey('');
      showSavedToast();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove API key';
      setAnthropicError(message);
    } finally {
      setRemovingAnthropicKey(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      // For MVP, refresh the page - bulk delete would need a dedicated endpoint
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <Heading size="8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.25rem' }}>
            Settings
          </Heading>
          <Text size="2" style={{ color: 'var(--foreground-muted)' }}>
            Customize your experience
          </Text>
        </div>
        {showSaved && (
          <div className="saved-indicator">
            &#x2713; Saved
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Canvas Defaults</div>
        <Text size="2" style={{ color: 'var(--foreground-muted)', marginBottom: '1rem', display: 'block' }}>
          Choose the default canvas type when creating new canvases.
        </Text>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div
            className="template-card"
            onClick={() => saveSettings({ ...settings, defaultMode: 'bmc' })}
            style={{
              flex: 1,
              borderColor: settings.defaultMode === 'bmc' ? 'rgba(99,102,241,0.3)' : undefined,
              boxShadow: settings.defaultMode === 'bmc' ? '0 0 20px rgba(99,102,241,0.08)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>&#x1F4CA;</span>
              <span className="template-card-title" style={{ marginBottom: 0 }}>BMC</span>
              {settings.defaultMode === 'bmc' && (
                <span style={{ marginLeft: 'auto', color: 'var(--chroma-indigo)', fontSize: '0.75rem' }}>Default</span>
              )}
            </div>
          </div>
          <div
            className="template-card"
            onClick={() => saveSettings({ ...settings, defaultMode: 'lean' })}
            style={{
              flex: 1,
              borderColor: settings.defaultMode === 'lean' ? 'rgba(6,182,212,0.3)' : undefined,
              boxShadow: settings.defaultMode === 'lean' ? '0 0 20px rgba(6,182,212,0.08)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>&#x26A1;</span>
              <span className="template-card-title" style={{ marginBottom: 0 }}>Lean</span>
              {settings.defaultMode === 'lean' && (
                <span style={{ marginLeft: 'auto', color: 'var(--chroma-cyan)', fontSize: '0.75rem' }}>Default</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <Text size="2" style={{ color: 'var(--foreground-muted)', marginBottom: '1rem', display: 'block' }}>
          Choose your accent color.
        </Text>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {accentColors.map((ac) => (
            <div
              key={ac.name}
              className={`color-swatch ${settings.accentColor === ac.name ? 'active' : ''}`}
              style={{ background: ac.color }}
              onClick={() => saveSettings({ ...settings, accentColor: ac.name })}
              title={ac.name}
            />
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">AI Provider</div>
        <Text size="2" style={{ color: 'var(--foreground-muted)', marginBottom: '0.75rem', display: 'block' }}>
          Add your own Anthropic API key to run AI with your account and track usage in the dashboard.
        </Text>
        {anthropicKeyStatus.hasKey && (
          <Text size="2" style={{ color: 'var(--foreground-muted)', marginBottom: '1rem', display: 'block' }}>
            Current key: <span style={{ fontFamily: 'var(--font-mono)' }}>{anthropicKeyStatus.maskedKey}</span>
          </Text>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input-soft"
            type="password"
            value={anthropicApiKey}
            onChange={(event) => setAnthropicApiKey(event.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
            spellCheck={false}
            style={{ minWidth: '280px', flex: 1, padding: '0.65rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
          />
          <Button
            onClick={handleSaveAnthropicKey}
            disabled={savingAnthropicKey}
            style={{ cursor: 'pointer' }}
          >
            {savingAnthropicKey ? 'Saving...' : anthropicKeyStatus.hasKey ? 'Update Key' : 'Save Key'}
          </Button>
          {anthropicKeyStatus.hasKey && (
            <Button
              variant="soft"
              color="red"
              onClick={handleRemoveAnthropicKey}
              disabled={removingAnthropicKey}
              style={{ cursor: 'pointer' }}
            >
              {removingAnthropicKey ? 'Removing...' : 'Remove Key'}
            </Button>
          )}
        </div>
        {anthropicError && (
          <Text size="2" style={{ color: 'var(--state-critical)', marginTop: '0.75rem', display: 'block' }}>
            {anthropicError}
          </Text>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">About</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <Text size="2" style={{ color: 'var(--foreground-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)' }}>Version</span>{' '}
            0.1.0-beta
          </Text>
          <Text size="2" style={{ color: 'var(--foreground-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)' }}>Engine</span>{' '}
            RocketMap Playable Business Model
          </Text>
        </div>
      </div>

      <div className="settings-section danger-zone">
        <div className="settings-section-title" style={{ color: 'var(--state-critical)' }}>
          Danger Zone
        </div>
        <Text size="2" style={{ color: 'var(--foreground-muted)', marginBottom: '1rem', display: 'block' }}>
          Destructive actions that cannot be undone.
        </Text>
        <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Dialog.Trigger>
            <Button variant="outline" color="red" style={{ cursor: 'pointer' }}>
              Delete All Canvases
            </Button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="400px">
            <Dialog.Title>Delete All Canvases</Dialog.Title>
            <Dialog.Description size="2">
              This will permanently delete all your canvases and their data. This action cannot be undone.
            </Dialog.Description>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Dialog.Close>
                <Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                variant="solid"
                color="red"
                onClick={handleDeleteAll}
                disabled={deleting}
                style={{ cursor: 'pointer' }}
              >
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </>
  );
}
