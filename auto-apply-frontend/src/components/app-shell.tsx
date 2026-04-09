import { NotificationList } from "@/components/notification-list";
import type { NotificationSummary } from "@/lib/api-types";

export function AppShell({
  title,
  notifications = [],
  children,
}: Readonly<{
  title: string;
  notifications?: NotificationSummary[];
  children: React.ReactNode;
}>) {
  return (
    <div className="page-shell">
      <div className="top-nav">
        <div className="container top-nav-inner">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true" />
            <div className="brand-copy">
              <strong>{title}</strong>
              <span>Workflow dashboard</span>
            </div>
          </div>
          <div className="nav-links" aria-label="Dashboard shortcuts">
            <a href="/">Overview</a>
            <a href="/resume-upload">Upload</a>
            <a href="/job-matches">Matches</a>
            <a href="/applications">Applications</a>
          </div>
        </div>
      </div>

      <main className="container" style={{ padding: "1.4rem 0 3rem" }}>
        <div className="dashboard-preview">
          <section className="glow-card hero-panel" aria-label="Primary dashboard content">
            {children}
          </section>
          <aside className="dashboard-stack" aria-label="Notifications and status">
            <div className="soft-card summary-card">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                ApplyBoom status
              </div>
              <h3>Everything is kept modular.</h3>
              <p>
                The dashboard owns UI. The backend owns automation. The runner owns browser work.
              </p>
            </div>
            <div className="soft-card summary-card">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Notifications
              </div>
              <NotificationList notifications={notifications} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
