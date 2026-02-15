'use client';

import { Heading, Text } from '@radix-ui/themes';
import { UserAvatar } from '../../components/dashboard/UserAvatar';

interface AccountClientProps {
  user: {
    name: string;
    email: string;
    joinDate: string;
  };
  stats: {
    canvasCount: number;
    totalBlocksFilled: number;
    daysActive: number;
  };
}

export function AccountClient({ user, stats }: AccountClientProps) {
  const handleExport = async () => {
    try {
      const res = await fetch('/api/user/export');
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rocketmap-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <Heading size="8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.25rem' }}>
          Account
        </Heading>
        <Text size="2" style={{ color: 'var(--foreground-muted)' }}>
          Your profile and activity
        </Text>
      </div>

      <div className="profile-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <UserAvatar name={user.name || user.email} size="lg" />
          <div>
            <Heading size="5" style={{ fontFamily: 'var(--font-display)', marginBottom: '0.15rem' }}>
              {user.name || 'Anonymous'}
            </Heading>
            <Text size="2" style={{ color: 'var(--foreground-muted)', display: 'block' }}>
              {user.email}
            </Text>
            <Text size="1" style={{ color: 'var(--foreground-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem', display: 'block' }}>
              Joined {new Date(user.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="stat-card">
          <div className="stat-card-label">Canvases Created</div>
          <div className="stat-number">{stats.canvasCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Blocks Filled</div>
          <div className="stat-number">{stats.totalBlocksFilled}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Days Active</div>
          <div className="stat-number">{stats.daysActive}</div>
        </div>
      </div>

      <div className="profile-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Heading size="4" style={{ fontFamily: 'var(--font-display)' }}>Plan</Heading>
          <span className="mode-badge mode-badge-bmc" style={{ fontSize: '0.65rem' }}>FREE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.25rem' }}>
          <div className="feature-check">
            <span className="feature-check-icon">&#x2713;</span>
            Unlimited canvases
          </div>
          <div className="feature-check">
            <span className="feature-check-icon">&#x2713;</span>
            Business Model Canvas + Lean Canvas
          </div>
          <div className="feature-check">
            <span className="feature-check-icon">&#x2713;</span>
            AI-powered analysis
          </div>
          <div className="feature-check">
            <span className="feature-check-icon">&#x2713;</span>
            Data export
          </div>
        </div>
        <Text size="2" style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>
          Pro features coming soon
        </Text>
      </div>

      <div className="profile-card">
        <Heading size="4" style={{ fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
          Export Data
        </Heading>
        <Text size="2" style={{ color: 'var(--foreground-muted)', marginBottom: '1rem', display: 'block' }}>
          Download all your canvases and blocks as a JSON file.
        </Text>
        <button
          onClick={handleExport}
          className="ui-btn ui-btn-sm ui-btn-secondary"
        >
          Download Export
        </button>
      </div>
    </>
  );
}
