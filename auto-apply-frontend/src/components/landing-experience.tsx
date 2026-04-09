"use client";

import { useState } from "react";
import type { DashboardSnapshot } from "@/lib/load-dashboard-snapshot";

const autoApplySteps = [
  {
    index: "01",
    title: "Upload once",
    body: "The user drops a resume into the system and ApplyBoom builds a structured profile from it.",
  },
  {
    index: "02",
    title: "Discover matches",
    body: "Job sources are queried and normalized into a single ranked stream of relevant opportunities.",
  },
  {
    index: "03",
    title: "Tailor and queue",
    body: "Each strong match gets a tailored resume and goes into the apply queue with guardrails.",
  },
  {
    index: "04",
    title: "Apply automatically",
    body: "The browser runner submits applications and records the outcome without blocking the UI.",
  },
];

const singleJobSteps = [
  {
    index: "01",
    title: "Pick one job",
    body: "The user selects a specific target role from the ranked feed or pastes a job link.",
  },
  {
    index: "02",
    title: "Shape the resume",
    body: "ApplyBoom rewrites the resume to fit the role with a focused summary, headline, and skills order.",
  },
  {
    index: "03",
    title: "Submit that job",
    body: "The runner opens the exact application flow and submits only this one role.",
  },
  {
    index: "04",
    title: "Track the result",
    body: "Application status, notifications, and audit logs stay connected to this specific job.",
  },
];

const sourceAdapters = [
  "JobSpy style source adapters",
  "Greenhouse boards",
  "Lever boards",
  "Playwright apply runner",
];

const signalPills = [
  "Resume parsing",
  "Ranked matches",
  "Tailored resume",
  "Auto-apply queue",
  "Email notifications",
];

export function LandingExperience({
  snapshot,
}: Readonly<{
  snapshot: DashboardSnapshot;
}>) {
  const [mode, setMode] = useState<"auto" | "single">("auto");
  const topMatch = snapshot.matches[0];
  const activeSteps = mode === "auto" ? autoApplySteps : singleJobSteps;

  return (
    <div className="page-shell">
      <div className="top-nav">
        <div className="container top-nav-inner">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true" />
            <div className="brand-copy">
              <strong>ApplyBoom</strong>
              <span>Job applications on autopilot</span>
            </div>
          </div>
          <nav className="nav-links" aria-label="Primary">
            <a href="#story">Story</a>
            <a href="#modes">Modes</a>
            <a href="#signals">Signals</a>
            <a href="/resume-upload">Upload</a>
          </nav>
          <div className="hero-actions" style={{ marginTop: 0 }}>
            <a className="ghost-button" href="/sign-in">
              Sign in
            </a>
            <a className="primary-button" href="/resume-upload">
              Start now
            </a>
          </div>
        </div>
      </div>

      <main>
        <section className="container" style={{ padding: "3rem 0 1.1rem" }}>
          <div className="hero-grid">
            <div className="glow-card hero-panel">
              <div className="hero-story-badge">
                <span className="live-dot" />
                <span className="eyebrow" style={{ margin: 0 }}>
                  ApplyBoom engine
                </span>
              </div>

              <h1 className="page-title hero-title">
                Job applications, tailored and launched like a product flow.
              </h1>
              <p className="hero-story-copy">
                Upload a resume once. ApplyBoom parses the profile, ranks real jobs, rewrites
                the resume for each fit, and routes the right applications into an automation
                runner built for scale.
              </p>

              <div className="hero-actions">
                <a className="primary-button" href="/resume-upload">
                  Upload resume
                </a>
                <a className="secondary-button" href="/job-matches">
                  See matches
                </a>
              </div>

              <div className="hero-microcopy">
                {signalPills.map((pill) => (
                  <span className="chip" key={pill} data-tone="accent">
                    {pill}
                  </span>
                ))}
              </div>

              <div className="stat-rail" aria-label="ApplyBoom highlights">
                <div className="stat-card">
                  <strong>{snapshot.matches.length || "∞"}</strong>
                  <span>ranked jobs ready to inspect</span>
                </div>
                <div className="stat-card">
                  <strong>{snapshot.applications.length || "0"}</strong>
                  <span>applications tracked in the system</span>
                </div>
                <div className="stat-card">
                  <strong>{snapshot.notifications.length || "0"}</strong>
                  <span>notifications queued for the user</span>
                </div>
              </div>
            </div>

            <div className="glow-card hero-panel" id="story">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Product story
              </div>
              <h2 className="section-title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.9rem)", marginTop: "0.85rem" }}>
                Two modes. One pipeline.
              </h2>
              <p className="muted-copy" style={{ marginTop: "0.75rem", lineHeight: 1.7 }}>
                The platform is intentionally split into two clean workflows: a true autopilot
                batch mode and a precise single-job tailoring mode.
              </p>

              <div className="mode-switcher" id="modes">
                <button
                  type="button"
                  className="mode-pill"
                  data-active={mode === "auto"}
                  onClick={() => setMode("auto")}
                >
                  Auto-apply mode
                </button>
                <button
                  type="button"
                  className="mode-pill"
                  data-active={mode === "single"}
                  onClick={() => setMode("single")}
                >
                  Single-job mode
                </button>
              </div>

              <div className="mode-story-shell section-block">
                <div className="soft-card" style={{ padding: "1rem" }}>
                  <div className="eyebrow" style={{ marginBottom: "0.8rem" }}>
                    <span className="eyebrow-dot" />
                    {mode === "auto" ? "Autopilot flow" : "Targeted flow"}
                  </div>
                  <div className="mode-story-details">
                    {activeSteps.map((step) => (
                      <div key={step.index} className="mini-timeline-row">
                        <div>
                          <strong style={{ display: "block" }}>{step.title}</strong>
                          <small>{step.body}</small>
                        </div>
                        <span className="chip" data-tone="success">
                          {step.index}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="soft-card" style={{ padding: "1rem" }}>
                  <div className="eyebrow" style={{ marginBottom: "0.8rem" }}>
                    <span className="eyebrow-dot" />
                    Live snapshot
                  </div>
                  <div className="mini-timeline">
                    <div className="mini-timeline-row">
                      <div>
                        <strong>Top match</strong>
                        <small>
                          {topMatch ? `${topMatch.title} · ${topMatch.company}` : "Waiting on the first ranked job"}
                        </small>
                      </div>
                      <span className="chip" data-tone="accent">
                        {topMatch ? `${Math.round((topMatch.score ?? 0) * 100)}%` : "0%"}
                      </span>
                    </div>
                    <div className="mini-timeline-row">
                      <div>
                        <strong>Applications</strong>
                        <small>
                          {snapshot.applications.length === 0
                            ? "No submissions yet"
                            : `${snapshot.applications.length} tracked applications`}
                        </small>
                      </div>
                      <span className="chip" data-tone="warm">
                        {snapshot.applications.length}
                      </span>
                    </div>
                    <div className="mini-timeline-row">
                      <div>
                        <strong>Notifications</strong>
                        <small>
                          {snapshot.notifications.length === 0
                            ? "Delivery events will appear here"
                            : `${snapshot.notifications.length} events logged`}
                        </small>
                      </div>
                      <span className="chip" data-tone="success">
                        {snapshot.notifications.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container section-block" id="signals">
          <div className="section-stack">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                System signals
              </div>
              <h2 className="section-title" style={{ marginTop: "0.85rem" }}>
                Every step is visible.
              </h2>
              <p className="section-subtitle" style={{ marginTop: "0.9rem" }}>
                The UI is meant to feel like a live operations console, not a static brochure.
                Users can see the flow, the ranking signals, and the final outcome without losing
                context.
              </p>
            </div>

            <div className="signal-grid">
              <div className="soft-card signal-card">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Resume intelligence
                </div>
                <h3>Parse the profile into structure</h3>
                <p>
                  Skills, experience, summary, and targeting data are transformed into an
                  application-ready profile before any job work begins.
                </p>
                <div className="chip-row">
                  <span className="chip">Parsing</span>
                  <span className="chip">Normalization</span>
                  <span className="chip">Profile cache</span>
                </div>
              </div>

              <div className="soft-card signal-card">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Job discovery
                </div>
                <h3>Normalize sources into one ranked feed</h3>
                <p>
                  Greenhouse, Lever, and other adapters can feed the same UX, so the user only
                  sees job relevance rather than source complexity.
                </p>
                <div className="chip-row">
                  {sourceAdapters.map((adapter) => (
                    <span className="chip" key={adapter}>
                      {adapter}
                    </span>
                  ))}
                </div>
              </div>

              <div className="soft-card signal-card">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Apply orchestration
                </div>
                <h3>Queue, tailor, submit, notify</h3>
                <p>
                  The workflow is event-driven, so one automation failure does not collapse the
                  dashboard or stop other jobs from moving forward.
                </p>
                <div className="chip-row">
                  <span className="chip">Queue-backed</span>
                  <span className="chip">Playwright runner</span>
                  <span className="chip">Resend alerts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container section-block">
          <div className="dashboard-preview">
            <div className="glow-card dashboard-hero">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Live dashboard language
              </div>
              <h2 className="section-title" style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)", marginTop: "0.85rem" }}>
                The product should feel like progress.
              </h2>
              <p className="muted-copy" style={{ marginTop: "0.8rem", lineHeight: 1.75 }}>
                Rather than a basic table of records, the dashboard should read like a timeline of
                the user&apos;s automation session. That means progress cards, match summaries,
                and application events that move in a clear visual sequence.
              </p>

              <div className="pipeline" aria-label="Pipeline overview">
                <div className="pipeline-row">
                  <div>
                    <strong>Resume uploaded</strong>
                    <span>Profile extraction ready</span>
                  </div>
                  <span className="score">Step 1</span>
                </div>
                <div className="pipeline-row">
                  <div>
                    <strong>Jobs matched</strong>
                    <span>Ranked by fit and intent</span>
                  </div>
                  <span className="score">Step 2</span>
                </div>
                <div className="pipeline-row">
                  <div>
                    <strong>Resume tailored</strong>
                    <span>Job-specific version prepared</span>
                  </div>
                  <span className="score">Step 3</span>
                </div>
                <div className="pipeline-row">
                  <div>
                    <strong>Applications submitted</strong>
                    <span>Events and notifications recorded</span>
                  </div>
                  <span className="score">Step 4</span>
                </div>
              </div>
            </div>

            <div className="dashboard-stack">
              <div className="soft-card summary-card">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Why it feels modern
                </div>
                <h3>Layered depth, not plain sections</h3>
                <p>
                  Soft glass panels, warm gradients, floating cards, and deliberate hierarchy give
                  the UI a strong product identity.
                </p>
                <div className="chip-row">
                  <span className="chip" data-tone="accent">
                    Glass UI
                  </span>
                  <span className="chip" data-tone="success">
                    Motion-ready
                  </span>
                  <span className="chip" data-tone="warm">
                    Story-first
                  </span>
                </div>
              </div>

              <div className="soft-card summary-card">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Pages
                </div>
                <h3>Every route should feel composed</h3>
                <p>
                  Resume upload, job matches, applications, and sign-in all need to share the same
                  visual language so the product feels intentional.
                </p>
                <div className="chip-row">
                  <a className="chip" href="/resume-upload">
                    Upload
                  </a>
                  <a className="chip" href="/job-matches">
                    Matches
                  </a>
                  <a className="chip" href="/applications">
                    Applications
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container section-block">
          <div className="soft-card" style={{ padding: "1.3rem" }}>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Tech stack
            </div>
            <h2 className="section-title" style={{ fontSize: "clamp(1.8rem, 3.8vw, 2.6rem)", marginTop: "0.85rem" }}>
              A stack that stays practical.
            </h2>
            <p className="section-subtitle" style={{ marginTop: "0.75rem" }}>
              The visuals can be premium without becoming fragile. The structure still maps to the
              actual backend contract and the repository boundaries you asked for.
            </p>

            <div className="feature-grid section-block">
              <div className="soft-card feature-card">
                <h3>Frontend</h3>
                <p>Next.js, React, TypeScript, motion-forward UI, and thin API calls.</p>
              </div>
              <div className="soft-card feature-card">
                <h3>Backend</h3>
                <p>Cloudflare Workers orchestration, Supabase, queues, and provider adapters.</p>
              </div>
              <div className="soft-card feature-card">
                <h3>Automation</h3>
                <p>Dedicated Playwright runner for application submission and isolation.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="container footer-note">
          Built as a story-led product surface for ApplyBoom.
        </div>
      </main>
    </div>
  );
}
