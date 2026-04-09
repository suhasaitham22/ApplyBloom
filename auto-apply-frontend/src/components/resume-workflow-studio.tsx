"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createApplicationInBackend, requestResumeTailoring, uploadResumeToBackend } from "@/lib/auto-apply-backend";
import type { DashboardSnapshot } from "@/lib/load-dashboard-snapshot";
import type { JobMatchSummary } from "@/lib/api-types";

const jobTypes = ["Full-time", "Part-time", "Contract", "Remote only"] as const;
const seniorities = ["Junior", "Mid-level", "Senior", "Lead / Staff"] as const;
const sources = ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Workday", "Wellfound"] as const;

export function ResumeWorkflowStudio({
  snapshot,
}: Readonly<{
  snapshot: DashboardSnapshot;
}>) {
  const [mode, setMode] = useState<"auto" | "single">("auto");
  const [jobType, setJobType] = useState<(typeof jobTypes)[number]>("Full-time");
  const [seniority, setSeniority] = useState<(typeof seniorities)[number]>("Mid-level");
  const [selectedSources, setSelectedSources] = useState<string[]>(["LinkedIn", "Greenhouse", "Lever"]);
  const [matchScore, setMatchScore] = useState(75);
  const [dailyCap, setDailyCap] = useState(50);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [location, setLocation] = useState("Remote · United States");
  const [blacklistedCompanies, setBlacklistedCompanies] = useState("Amazon, Meta");
  const [resumeFileName, setResumeFileName] = useState("No file selected");
  const [resumePreview, setResumePreview] = useState(DEFAULT_RESUME_PREVIEW);
  const [parsedSummary, setParsedSummary] = useState(DEFAULT_PARSED_SUMMARY);
  const [statusMessage, setStatusMessage] = useState("Ready for a new resume.");
  const [selectedJobId, setSelectedJobId] = useState(snapshot.matches[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedJob = useMemo(
    () => snapshot.matches.find((job) => job.id === selectedJobId) ?? snapshot.matches[0] ?? null,
    [selectedJobId, snapshot.matches],
  );

  const tailoredPreview = useMemo(() => {
    if (!selectedJob) {
      return {
        headline: "Tailored resume will appear here",
        summary: "Select a job and ApplyBoom will show the rewritten resume preview here.",
        bullets: [
          "Experience section aligned to the role",
          "Skills reordered for the target job",
          "Summary rewritten for the selected mode",
        ],
      };
    }

    const bullets = [
      `Headline aligned to ${selectedJob.title}`,
      `Summary tuned for ${selectedJob.company}`,
      `Emphasis shifted to ${selectedJob.location ?? "location-free"} opportunity`,
    ];

    return {
      headline: `${selectedJob.title} ready`,
      summary:
        selectedJob.reason ?? "The tailored draft highlights the strongest fit signals for this role.",
      bullets,
    };
  }, [selectedJob]);

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    setResumeFileName(file.name);
    setStatusMessage("Parsing resume...");

    const text = await file.text();
    setResumePreview(text.slice(0, 680) || DEFAULT_RESUME_PREVIEW);
    setParsedSummary(buildParsedSummary(text));

    await uploadResumeToBackend({
      file_name: file.name,
      file_type: file.type,
      storage_path: `resume-ingest/${file.name}`,
      resume_text: text,
    });

    setStatusMessage("Resume uploaded and ready for job matching.");
  }

  async function handleTailorJob(jobId: string) {
    setSelectedJobId(jobId);
    setStatusMessage("Applying tailoring instructions...");
    await requestResumeTailoring(jobId);
    setStatusMessage("Tailored preview updated.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedJob) {
      setStatusMessage("Upload a resume and select a job before applying.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "single") {
        await requestResumeTailoring(selectedJob.id);
        await createApplicationInBackend({
          job_id: selectedJob.id,
          resume_artifact_id: `tailored-${selectedJob.id}`,
          apply_mode: "manual_review",
        });
        setStatusMessage(`Queued a tailored application for ${selectedJob.title}.`);
      } else {
        await createApplicationInBackend({
          job_id: selectedJob.id,
          resume_artifact_id: `auto-${selectedJob.id}`,
          apply_mode: "auto_apply",
        });
        setStatusMessage(`Auto-apply mode queued ${selectedJob.title}.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleSource(source: string) {
    setSelectedSources((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    );
  }

  return (
    <div className="page-shell">
      <main className="container" style={{ padding: "1.6rem 0 3rem" }}>
        <section className="soft-card workflow-hero">
          <div className="workflow-hero-grid">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Resume studio
              </div>
              <h1 className="section-title" style={{ marginTop: "0.9rem" }}>
                Upload once. Shape the job strategy. See the resume change live.
              </h1>
              <p className="section-subtitle" style={{ marginTop: "0.9rem" }}>
                This is the control center for ApplyBoom. Users can switch between autopilot and
                single-job mode, tune preferences, and preview how the tailored resume changes
                before the browser runner is triggered.
              </p>

              <div className="hero-actions">
                <label className="primary-button" htmlFor="resume-upload-input" style={{ display: "inline-flex" }}>
                  Upload resume
                </label>
                <button type="button" className="secondary-button" onClick={() => setMode("auto")}>
                  Auto-apply mode
                </button>
                <button type="button" className="ghost-button" onClick={() => setMode("single")}>
                  Single-job mode
                </button>
              </div>

              <div className="hero-microcopy">
                <span className="chip" data-tone="accent">
                  {resumeFileName}
                </span>
                <span className="chip" data-tone="success">
                  {statusMessage}
                </span>
              </div>
            </div>

            <div className="soft-card workflow-status-card">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Session summary
              </div>
              <div className="workflow-status-stack">
                <div className="workflow-status-row">
                  <strong>{mode === "auto" ? "Auto-apply" : "Single-job"}</strong>
                  <span>Current mode</span>
                </div>
                <div className="workflow-status-row">
                  <strong>{matchScore}%</strong>
                  <span>Minimum match score</span>
                </div>
                <div className="workflow-status-row">
                  <strong>{dailyCap}</strong>
                  <span>Applications per day</span>
                </div>
                <div className="workflow-status-row">
                  <strong>{selectedSources.length}</strong>
                  <span>Job sources enabled</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="workflow-grid">
          <section className="soft-card workflow-panel">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              1. Intake
            </div>
            <div className="workflow-upload-box">
              <input
                id="resume-upload-input"
                name="resume"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelection}
              />
              <div className="workflow-upload-copy">
                <h3>Drop the resume here</h3>
                <p>PDF, DOCX, or TXT. The preview updates as soon as the file is loaded.</p>
              </div>
            </div>

            <div className="workflow-panel-section">
              <div className="workflow-label-row">
                <strong>Mode</strong>
                <span>{mode === "auto" ? "Autopilot" : "Single-job targeting"}</span>
              </div>
              <div className="mode-switcher" style={{ marginTop: 0 }}>
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
            </div>

            <div className="workflow-panel-section">
              <div className="workflow-label-row">
                <strong>Job type</strong>
                <span>What kinds of roles should be surfaced</span>
              </div>
              <div className="workflow-select-grid">
                {jobTypes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="workflow-choice"
                    data-active={jobType === option}
                    onClick={() => setJobType(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="workflow-panel-section">
              <div className="workflow-label-row">
                <strong>Seniority</strong>
                <span>Align the search to the user&apos;s experience level</span>
              </div>
              <div className="workflow-select-grid">
                {seniorities.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="workflow-choice"
                    data-active={seniority === option}
                    onClick={() => setSeniority(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="workflow-panel-section">
              <div className="workflow-label-row">
                <strong>Search filters</strong>
                <span>Match score, location, and daily cap</span>
              </div>
              <label className="slider-field">
                <span>Minimum match score: {matchScore}%</span>
                <input
                  type="range"
                  min="40"
                  max="95"
                  value={matchScore}
                  onChange={(event) => setMatchScore(Number(event.target.value))}
                />
              </label>
              <label className="slider-field">
                <span>Applications per day: {dailyCap}</span>
                <input
                  type="range"
                  min="5"
                  max="200"
                  value={dailyCap}
                  onChange={(event) => setDailyCap(Number(event.target.value))}
                />
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(event) => setRemoteOnly(event.target.checked)}
                />
                <span>Remote only</span>
              </label>
              <label className="field-stack">
                <span>Location</span>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Remote · United States"
                />
              </label>
              <label className="field-stack">
                <span>Blacklisted companies</span>
                <textarea
                  rows={3}
                  value={blacklistedCompanies}
                  onChange={(event) => setBlacklistedCompanies(event.target.value)}
                  placeholder="Comma-separated company names"
                />
              </label>
            </div>

            <div className="workflow-panel-section">
              <div className="workflow-label-row">
                <strong>Sources</strong>
                <span>Choose where jobs should come from</span>
              </div>
              <div className="workflow-source-grid">
                {sources.map((source) => (
                  <button
                    key={source}
                    type="button"
                    className="workflow-choice"
                    data-active={selectedSources.includes(source)}
                    onClick={() => toggleSource(source)}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <div className="workflow-panel-section">
              <button className="primary-button workflow-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Launching..."
                  : mode === "auto"
                    ? "Start auto-apply"
                    : "Tailor and apply"}
              </button>
            </div>
          </section>

          <section className="soft-card workflow-panel">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              2. Live preview
            </div>

            <div className="workflow-tabs">
              {snapshot.matches.slice(0, 4).map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className="workflow-tab"
                  data-active={selectedJob?.id === job.id}
                  onClick={() => handleTailorJob(job.id)}
                >
                  <strong>{job.title}</strong>
                  <span>
                    {job.company} · {Math.round((job.score ?? 0) * 100)}%
                  </span>
                </button>
              ))}
            </div>

            <div className="workflow-preview-grid">
              <div className="soft-card preview-panel">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Original resume
                </div>
                <pre className="resume-preview">{resumePreview}</pre>
              </div>

              <div className="soft-card preview-panel">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Tailored draft
                </div>
                <h3>{tailoredPreview.headline}</h3>
                <p>{tailoredPreview.summary}</p>
                <ul className="change-list">
                  {tailoredPreview.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="workflow-panel-section">
              <div className="workflow-label-row">
                <strong>Parsed profile</strong>
                <span>{parsedSummary}</span>
              </div>
            </div>

            <div className="workflow-panel-section">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                3. Selected job
              </div>
              {selectedJob ? (
                <div className="selected-job-card">
                  <div>
                    <strong>{selectedJob.title}</strong>
                    <p>{selectedJob.company}</p>
                  </div>
                  <div className="chip-row">
                    <span className="chip" data-tone="accent">
                      {Math.round((selectedJob.score ?? 0) * 100)}% match
                    </span>
                    <span className="chip">{selectedJob.location ?? "No location listed"}</span>
                    <span className="chip">{selectedJob.remote ? "Remote" : "Onsite"}</span>
                  </div>
                </div>
              ) : (
                <p className="muted-copy">No job selected yet.</p>
              )}
            </div>

            <div className="workflow-panel-section">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                4. How it submits
              </div>
              <div className="workflow-mini-columns">
                <div className="mini-timeline-row">
                  <div>
                    <strong>Auto mode</strong>
                    <small>Rank, tailor, queue, and apply in batches.</small>
                  </div>
                </div>
                <div className="mini-timeline-row">
                  <div>
                    <strong>Single-job mode</strong>
                    <small>Tailor the resume and submit only one application.</small>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

function buildParsedSummary(text: string) {
  const content = text.toLowerCase();
  const signals = [
    content.includes("typescript") ? "TypeScript" : null,
    content.includes("react") ? "React" : null,
    content.includes("node") ? "Node.js" : null,
    content.includes("python") ? "Python" : null,
    content.includes("postgres") ? "Postgres" : null,
    content.includes("aws") ? "AWS" : null,
  ].filter(Boolean);

  return signals.length > 0
    ? `Detected ${signals.join(", ")} in the profile`
    : DEFAULT_PARSED_SUMMARY;
}

const DEFAULT_RESUME_PREVIEW = `John Doe
Backend Engineer

Experience:
- Built TypeScript services and automation systems
- Shipped job matching and resume tailoring features

Skills:
TypeScript, React, Node.js, Postgres, Redis, Playwright`;

const DEFAULT_PARSED_SUMMARY = "Upload a resume to see extracted skills and targeting signals.";
