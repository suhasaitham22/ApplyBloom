import { NotificationList } from "@/components/notification-list";
import type { NotificationSummary } from "@/lib/api-types";
import Image from "next/image";
import Link from "next/link";

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
            <Image
              src="/applybloom-logo.svg"
              alt="ApplyBloom logo"
              width={40}
              height={40}
              className="brand-logo"
              priority
            />
            <div className="brand-copy">
              <strong>{title}</strong>
              <span>Workflow dashboard</span>
            </div>
          </div>
          <div className="dashboard-nav-actions" aria-label="Dashboard navigation">
            <Link href="/" prefetch={false} className="ui-button ui-button-ghost">
              Home
            </Link>
            <Link href="/job-studio" prefetch={false} className="ui-button ui-button-secondary">
              Job Studio
            </Link>
          </div>
        </div>
      </div>

      <main className="container dashboard-main">
        <div className="dashboard-preview">
          <section className="glow-card hero-panel" aria-label="Primary dashboard content">
            {children}
          </section>
          <aside className="dashboard-stack" aria-label="Notifications and status">
            <div className="soft-card summary-card">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                ApplyBloom status
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
