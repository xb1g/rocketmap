'use client';

interface QuickStatsProps {
  stats: {
    totalCanvases: number;
    lastUpdated: string | null;
    avgCompletion: number;
  };
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
      <div className="stat-card">
        <div className="stat-card-label">Total Canvases</div>
        <div className="stat-number">{stats.totalCanvases}</div>
      </div>
      <div className="stat-card">
        <div className="stat-card-label">Last Activity</div>
        <div className="stat-number" style={{ fontSize: '1.25rem' }}>
          {stats.lastUpdated ? timeAgo(stats.lastUpdated) : '\u2014'}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-card-label">Avg Completion</div>
        <div className="stat-number">{stats.avgCompletion}%</div>
      </div>
    </div>
  );
}
