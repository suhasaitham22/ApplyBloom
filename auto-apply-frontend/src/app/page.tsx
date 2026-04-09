import Link from "next/link";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const homeCards = [
  {
    title: "Job Studio",
    description:
      "Upload a resume, choose auto-apply or single-job mode, tune preferences, and preview tailored edits before submission.",
    href: "/resume-upload",
    tone: "accent",
  },
  {
    title: "Matches",
    description:
      "See ranked jobs that fit the current resume profile, with clear match signals and reasons.",
    href: "/job-matches",
    tone: "success",
  },
  {
    title: "Status",
    description:
      "Track application progress, events, and notifications in one calm view.",
    href: "/applications",
    tone: "warm",
  },
] as const;

export default async function HomePage() {
  const snapshot = await loadDashboardSnapshot();

  return (
    <div className="page-shell">
      <main className="container" style={{ padding: "1.6rem 0 3rem" }}>
        <section className="soft-card hero-panel">
          <div className="top-nav-inner" style={{ padding: 0, marginBottom: "1.2rem" }}>
            <div className="brand-lockup">
              <div className="brand-mark" aria-hidden="true" />
              <div className="brand-copy">
                <strong>ApplyBoom</strong>
                <span>Job applications on autopilot</span>
              </div>
            </div>
            <div className="nav-links">
              <Link href="/resume-upload">Job Studio</Link>
              <Link href="/job-matches">Matches</Link>
              <Link href="/applications">Status</Link>
            </div>
          </div>

          <div className="hero-grid">
            <div>
              <div className="hero-story-badge">
                <span className="live-dot" />
                <span className="eyebrow" style={{ margin: 0 }}>
                  Modern job automation
                </span>
              </div>
              <h1 className="page-title hero-title">
                One resume. Two modes. A clearer way to apply.
              </h1>
              <p className="hero-story-copy">
                ApplyBoom keeps the product simple: the home page explains the platform, the Job
                Studio handles upload and tailoring, and the Status page tracks everything after
                the apply step.
              </p>

              <div className="hero-actions">
                <Link className="primary-button" href="/resume-upload">
                  Open Job Studio
                </Link>
                <Link className="secondary-button" href="/job-matches">
                  Browse matches
                </Link>
              </div>

              <div className="hero-microcopy">
                <span className="chip" data-tone="accent">
                  {snapshot.matches.length} ranked jobs
                </span>
                <span className="chip" data-tone="success">
                  {snapshot.applications.length} tracked applications
                </span>
                <span className="chip" data-tone="warm">
                  {snapshot.notifications.length} notifications
                </span>
              </div>
            </div>

            <div className="soft-card summary-card">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                What the app does
              </div>
              <div className="mini-timeline" style={{ marginTop: "0.9rem" }}>
                <div className="mini-timeline-row">
                  <div>
                    <strong>Auto-apply mode</strong>
                    <small>Upload once and let the queue handle suitable jobs.</small>
                  </div>
                </div>
                <div className="mini-timeline-row">
                  <div>
                    <strong>Single-job mode</strong>
                    <small>Pick one role, tailor the resume, then submit just that one.</small>
                  </div>
                </div>
                <div className="mini-timeline-row">
                  <div>
                    <strong>Status view</strong>
                    <small>See applications, notifications, and delivery history.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="feature-grid">
            {homeCards.map((card) => (
              <Link key={card.title} href={card.href} className="soft-card feature-card">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  {card.title}
                </div>
                <h3 style={{ marginTop: "0.85rem" }}>{card.title}</h3>
                <p>{card.description}</p>
                <div className="chip-row">
                  <span className="chip" data-tone={card.tone}>
                    Open page
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="soft-card" style={{ padding: "1.3rem" }}>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Simple flow
            </div>
            <div className="pipeline-grid">
              <div className="soft-card pipeline-card">
                <div className="step-index">01</div>
                <h3>Upload</h3>
                <p>Resume comes in once and becomes the base profile.</p>
              </div>
              <div className="soft-card pipeline-card">
                <div className="step-index">02</div>
                <h3>Select mode</h3>
                <p>Choose auto-apply for scale or single-job for precision.</p>
              </div>
              <div className="soft-card pipeline-card">
                <div className="step-index">03</div>
                <h3>Edit</h3>
                <p>See the resume adapt to the selected job before it leaves the studio.</p>
              </div>
              <div className="soft-card pipeline-card">
                <div className="step-index">04</div>
                <h3>Track</h3>
                <p>Watch status, notifications, and application events update over time.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
