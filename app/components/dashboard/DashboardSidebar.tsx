"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

const navItems = [
  {
    label: "Home",
    href: "/dashboard",
    exact: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Brainstorm",
    href: "/dashboard/brainstorm",
    exact: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: "Account",
    href: "/dashboard/account",
    exact: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    exact: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
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
  const percent = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
  const status = percent >= 90 ? "critical" : percent >= 70 ? "warning" : "healthy";

  return (
    <div className="sidebar-usage">
      <div className="sidebar-usage-header">
        <span className="sidebar-usage-label">AI Usage</span>
        <span className={`sidebar-usage-tier sidebar-usage-tier-${tier === "pro" ? "pro" : "free"}`}>
          {tierLabel(tier)}
        </span>
      </div>
      <div className="sidebar-usage-bar" role="img" aria-label={`${Math.round(percent)} percent used`}>
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

export function DashboardSidebar({ user, aiQuota }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          suppressHydrationWarning
        >
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

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span style={{ fontSize: "1.3rem" }}>&#x1F680;</span>
          <span className="sidebar-brand-text">RocketMap</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive(item.href, item.exact) ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

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
            <UserAvatar name={user.name || user.email} size="md" />
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
