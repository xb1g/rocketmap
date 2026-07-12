"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserAvatar } from "./UserAvatar";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { signOut } from "@/lib/oauth";

interface DashboardSidebarProps {
  user: { name: string; email: string };
  aiQuota: {
    allowed: boolean;
    used: number;
    limit: number;
    tier: string;
    resetsAt: string;
    lifetimeCalls: number;
  };
}

const workspaceNav = [
  {
    label: "Canvases",
    href: "/dashboard",
    exact: true,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h9A1.5 1.5 0 0 1 14 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-11ZM3.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-9Z" />
        <path d="M5 5.5A.5.5 0 0 1 5.5 5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 5.5ZM5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8Zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Z" />
      </svg>
    ),
  },
  {
    label: "Brainstorm",
    href: "/dashboard/brainstorm",
    exact: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5a.5.5 0 0 1 .5.5v1.5a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5ZM3.05 3.05a.5.5 0 0 1 .707 0l1.06 1.06a.5.5 0 1 1-.707.707L3.05 3.757a.5.5 0 0 1 0-.707ZM12.95 3.05a.5.5 0 0 1 0 .707l-1.06 1.06a.5.5 0 1 1-.707-.707l1.06-1.06a.5.5 0 0 1 .707 0ZM1.5 8a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5Zm12 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H14a.5.5 0 0 1-.5-.5ZM4.11 11.89a.5.5 0 0 1 .707 0l1.06-1.06a.5.5 0 0 1 .707.707l-1.06 1.06a.5.5 0 0 1-.707-.707Zm7.78 0a.5.5 0 0 1 0-.707l1.06-1.06a.5.5 0 0 1 .707.707l-1.06 1.06a.5.5 0 0 1-.707 0ZM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
      </svg>
    ),
  },
];

const accountNav = [
  {
    label: "Account",
    href: "/dashboard/account",
    exact: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8ZM3 14.5A5.5 5.5 0 0 1 8.5 9h-1A4.5 4.5 0 0 0 3 13.5v1h10v-1A4.5 4.5 0 0 0 8.5 9h-1A5.5 5.5 0 0 1 14 14.5v.5H3v-.5Z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    exact: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492ZM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0Z" />
        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319Zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319Z" />
      </svg>
    ),
  },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function tierLabel(tier: string): string {
  if (tier === "pro") return "Pro";
  if (tier === "free") return "Free";
  return tier.slice(0, 1).toUpperCase() + tier.slice(1);
}

function SidebarUsage({
  used,
  limit,
  tier,
}: {
  used: number;
  limit: number;
  tier: string;
}) {
  const percent =
    limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
  const status =
    percent >= 90 ? "critical" : percent >= 70 ? "warning" : "healthy";

  return (
    <div className="sidebar-usage">
      <div className="sidebar-usage-header">
        <span className="sidebar-usage-label">AI budget</span>
        <span
          className={`sidebar-usage-tier sidebar-usage-tier-${tier === "pro" ? "pro" : "free"}`}
        >
          {tierLabel(tier)}
        </span>
      </div>
      <div
        className="sidebar-usage-bar"
        role="img"
        aria-label={`${Math.round(percent)} percent used`}
      >
        <div
          className={`sidebar-usage-fill sidebar-usage-fill-${status}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="sidebar-usage-figures">
        <span className="sidebar-usage-used">{formatCurrency(used)}</span>
        <span className="sidebar-usage-limit">/ {formatCurrency(limit)}</span>
      </div>
    </div>
  );
}

function NavSection({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: typeof workspaceNav;
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="sidebar-section">
      <span className="sidebar-section-label">{label}</span>
      <div className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${isActive(item.href, item.exact) ? "active" : ""}`}
            onClick={onNavigate}
          >
            {item.icon}
            <span className="sidebar-nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardSidebar({ user, aiQuota }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNewCanvas = async () => {
    if (creating) return;
    setCreating(true);
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
      setCreating(false);
    }
  };

  return (
    <>
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" suppressHydrationWarning>
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      <div
        className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`dashboard-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Link href="/dashboard" className="sidebar-brand" onClick={() => setMobileOpen(false)}>
            <span className="sidebar-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                <rect x="11" y="2" width="7" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.25" />
                <rect x="11" y="7.5" width="7" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.25" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                <rect x="11" y="13" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </span>
            <span className="sidebar-brand-text">RocketMap</span>
          </Link>

          <button
            type="button"
            className="sidebar-new-btn"
            onClick={handleNewCanvas}
            disabled={creating}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4Z" />
            </svg>
            New canvas
          </button>
        </div>

        <div className="sidebar-scroll">
          <NavSection
            label="Workspace"
            items={workspaceNav}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
          <NavSection
            label="Account"
            items={accountNav}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>

        <div className="sidebar-lower">
          <SidebarUsage
            used={aiQuota.used}
            limit={aiQuota.limit}
            tier={aiQuota.tier}
          />

          <div className="sidebar-theme">
            <ThemeToggle variant="segmented" showLabels={false} />
          </div>

          <div className="sidebar-user">
            <UserAvatar name={user.name || user.email} size="sm" />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user.name || user.email.split("@")[0]}
              </div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
            <button
              className="sidebar-user-signout"
              onClick={() => signOut()}
              title="Sign out"
              aria-label="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
