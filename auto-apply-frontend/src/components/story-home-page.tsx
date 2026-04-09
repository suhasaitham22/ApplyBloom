"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/lib/load-dashboard-snapshot";

const STORY_STEPS = [
  {
    label: "Parse",
    title: "Resume to structured profile in seconds",
    description: "Extract skills, seniority, and intent from one upload and normalize everything.",
  },
  {
    label: "Match",
    title: "Live job discovery across trusted sources",
    description: "Blend API feeds and curated scraping paths, then rank by role fit and constraints.",
  },
  {
    label: "Tailor",
    title: "Per-job resume transformation with guardrails",
    description:
      "Generate targeted bullets and summaries while preserving facts from the original resume.",
  },
  {
    label: "Apply",
    title: "Two execution modes for full control",
    description: "Run auto-apply at scale or handpick a single role and submit with precision.",
  },
];

const LIVE_FEED = [
  "Resume uploaded",
  "Skills extracted",
  "847 jobs discovered",
  "72 jobs above threshold",
  "8 applications submitted",
  "Email digest sent",
];

export function StoryHomePage({
  snapshot,
}: Readonly<{
  snapshot: DashboardSnapshot;
}>) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const next = total > 0 ? window.scrollY / total : 0;
      setScrollProgress(Math.max(0, Math.min(1, next)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { threshold: 0.2 },
    );

    const targets = document.querySelectorAll("[data-reveal]");
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="page-shell story-home">
      <div className="story-progress-rail" aria-hidden="true">
        <span style={{ transform: `scaleX(${scrollProgress})` }} />
      </div>

      <header className="story-nav">
        <div className="container story-nav-inner">
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
              <strong>ApplyBloom</strong>
              <span>AI job application platform</span>
            </div>
          </div>
          <nav className="nav-links">
            <Link href="/sign-in" prefetch={false}>
              Sign In
            </Link>
            <Link href="/job-studio" prefetch={false}>
              Job Studio
            </Link>
            <Link href="/applications" prefetch={false}>
              Status
            </Link>
          </nav>
        </div>
      </header>

      <main className="container story-shell">
        <section className="story-hero-block story-chapter reveal-up" data-reveal>
          <div className="story-hero-copy">
            <div className="story-product-title">
              <Image
                src="/applybloom-logo.svg"
                alt="ApplyBloom logo"
                width={46}
                height={46}
                className="brand-logo"
                priority
              />
              <h1 className="story-product-name">ApplyBloom</h1>
            </div>
            <Badge variant="accent">Resume intelligence + controlled automation</Badge>
            <h2 className="story-hero-title">A complete job search pipeline, designed like a product demo.</h2>
            <p>
              ApplyBloom turns one resume into a guided flow: parse profile, rank jobs, tailor for each
              role, then submit in Auto-apply mode or Single-job mode.
            </p>
            <div className="story-hero-actions">
              <Link href="/job-studio" className="ui-button ui-button-primary" prefetch={false}>
                Open Job Studio
              </Link>
            </div>
          </div>

          <Card className="story-live-console">
            <CardHeader>
              <CardTitle>Live Flow Preview</CardTitle>
              <CardDescription>What users see while the system is running.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="story-video-shell" aria-hidden="true">
                <div className="story-video-bar">
                  <span />
                </div>
                <div className="story-video-grid">
                  <div />
                  <div />
                  <div />
                </div>
              </div>
              <div className="story-log-stream">
                {LIVE_FEED.map((line, index) => (
                  <div key={line} className="story-log-line" style={{ animationDelay: `${index * 110}ms` }}>
                    <span className="story-log-dot" />
                    {line}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="story-snapshot-grid story-chapter reveal-up" data-reveal>
          <Card>
            <CardHeader>
              <CardTitle>{snapshot.matches.length}</CardTitle>
              <CardDescription>ranked matches available now</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{snapshot.applications.length}</CardTitle>
              <CardDescription>tracked applications in the current workspace</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{snapshot.notifications.length}</CardTitle>
              <CardDescription>notifications and delivery events</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="story-step-stack story-chapter">
          {STORY_STEPS.map((step, index) => (
            <article key={step.label} className="story-step reveal-up" data-reveal>
              <div className="story-step-index">0{index + 1}</div>
              <Card className="story-step-card">
                <CardHeader>
                  <Badge variant="success">{step.label}</Badge>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            </article>
          ))}
        </section>

        <section className="story-mode-grid story-chapter reveal-up" data-reveal>
          <Card className="story-mode-card">
            <CardHeader>
              <Badge variant="accent">Mode A</Badge>
              <CardTitle>Auto-apply mode</CardTitle>
              <CardDescription>
                Set threshold, sources, and daily caps once. The system continues through the queue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="story-bullet-list">
                <li>Bulk discovery and ranking</li>
                <li>Queue-backed submissions with retries</li>
                <li>Digest notifications by email</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="story-mode-card">
            <CardHeader>
              <Badge variant="warm">Mode B</Badge>
              <CardTitle>Single-job mode</CardTitle>
              <CardDescription>
                Focus one role. Edit resume intent, preview changes, then submit manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="story-bullet-list">
                <li>Job-specific tailoring preview</li>
                <li>Inline review before apply</li>
                <li>Clear audit trail per submission</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="story-cta story-chapter reveal-up" data-reveal>
          <Card>
            <CardHeader>
              <Badge variant="success">Next Step</Badge>
              <CardTitle>Run the workflow in Job Studio</CardTitle>
              <CardDescription>
                Job Studio now includes setup, assistant prompt input, resume editing, and apply.
              </CardDescription>
            </CardHeader>
            <CardContent className="story-cta-actions">
              <Link href="/job-studio" prefetch={false} className="ui-button ui-button-primary">
                Open Job Studio
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
