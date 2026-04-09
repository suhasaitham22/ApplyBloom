"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResumeRichTextEditor } from "@/components/resume-rich-text-editor";
import {
  createApplicationInBackend,
  requestResumeTailoring,
  uploadResumeToBackend,
} from "@/lib/auto-apply-backend";
import {
  DEFAULT_JOB_STUDIO_PREFERENCES,
  JOB_STUDIO_PREFERENCES_STORAGE_KEY,
  JOB_STUDIO_RESUME_DRAFT_STORAGE_KEY,
  JOB_SOURCE_OPTIONS,
  JOB_TYPE_OPTIONS,
  SENIORITY_OPTIONS,
  normalizeJobStudioPreferences,
  type JobSourceOption,
  type JobStudioMode,
  type JobStudioPreferences,
  type JobTypeOption,
  type SeniorityOption,
} from "@/lib/job-studio-preferences";
import type { DashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export function ResumeWorkflowStudio({
  snapshot,
}: Readonly<{
  snapshot: DashboardSnapshot;
}>) {
  const matches = snapshot.matches.length > 0 ? snapshot.matches : FALLBACK_MATCHES;
  const [mode, setMode] = useState<JobStudioMode>(DEFAULT_JOB_STUDIO_PREFERENCES.mode);
  const [jobType, setJobType] = useState<JobTypeOption>(DEFAULT_JOB_STUDIO_PREFERENCES.jobType);
  const [seniority, setSeniority] = useState<SeniorityOption>(
    DEFAULT_JOB_STUDIO_PREFERENCES.seniority,
  );
  const [selectedSources, setSelectedSources] = useState<JobSourceOption[]>(
    DEFAULT_JOB_STUDIO_PREFERENCES.selectedSources,
  );
  const [matchScore, setMatchScore] = useState(DEFAULT_JOB_STUDIO_PREFERENCES.matchScore);
  const [dailyCap, setDailyCap] = useState(DEFAULT_JOB_STUDIO_PREFERENCES.dailyCap);
  const [remoteOnly, setRemoteOnly] = useState(DEFAULT_JOB_STUDIO_PREFERENCES.remoteOnly);
  const [location, setLocation] = useState(DEFAULT_JOB_STUDIO_PREFERENCES.location);
  const [blacklistedCompanies, setBlacklistedCompanies] = useState(
    DEFAULT_JOB_STUDIO_PREFERENCES.blacklistedCompanies,
  );

  const [resumeFileName, setResumeFileName] = useState("No file selected");
  const [resumeDraft, setResumeDraft] = useState(DEFAULT_RESUME_DRAFT);
  const [resumeEditorSeed, setResumeEditorSeed] = useState(0);
  const [parsedSummary, setParsedSummary] = useState(DEFAULT_PARSED_SUMMARY);

  const [assistantInput, setAssistantInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready.");
  const [selectedJobId, setSelectedJobId] = useState(matches[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedJob = useMemo(
    () => matches.find((job) => job.id === selectedJobId) ?? matches[0] ?? null,
    [matches, selectedJobId],
  );

  const tailoredPreview = useMemo(() => {
    if (!selectedJob) {
      return {
        headline: "Tailored resume preview",
        summary: "Choose a target job to see edits.",
        bullets: ["Experience reordered", "Skills prioritized", "Summary adapted"],
      };
    }
    return {
      headline: `${selectedJob.title} optimized`,
      summary: selectedJob.reason ?? "Draft aligned to role requirements.",
      bullets: [
        `Headline aligned to ${selectedJob.title}`,
        `Summary aligned to ${selectedJob.company}`,
        `Location fit aligned to ${selectedJob.location ?? "job constraints"}`,
      ],
    };
  }, [selectedJob]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedPreferences = window.localStorage.getItem(JOB_STUDIO_PREFERENCES_STORAGE_KEY);
    const storedDraft = window.localStorage.getItem(JOB_STUDIO_RESUME_DRAFT_STORAGE_KEY);

    if (storedPreferences) {
      try {
        const parsed = normalizeJobStudioPreferences(
          JSON.parse(storedPreferences) as Partial<JobStudioPreferences>,
        );
        setMode(parsed.mode);
        setJobType(parsed.jobType);
        setSeniority(parsed.seniority);
        setSelectedSources(parsed.selectedSources);
        setMatchScore(parsed.matchScore);
        setDailyCap(parsed.dailyCap);
        setRemoteOnly(parsed.remoteOnly);
        setLocation(parsed.location);
        setBlacklistedCompanies(parsed.blacklistedCompanies);
      } catch {
        // keep defaults
      }
    }

    if (storedDraft && storedDraft.trim().length > 0) {
      setResumeDraft(storedDraft);
      setParsedSummary(buildParsedSummary(storedDraft));
      setResumeEditorSeed((current) => current + 1);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const value = normalizeJobStudioPreferences({
      mode,
      jobType,
      seniority,
      selectedSources,
      matchScore,
      dailyCap,
      remoteOnly,
      location,
      blacklistedCompanies,
    });
    window.localStorage.setItem(JOB_STUDIO_PREFERENCES_STORAGE_KEY, JSON.stringify(value));
  }, [
    mode,
    jobType,
    seniority,
    selectedSources,
    matchScore,
    dailyCap,
    remoteOnly,
    location,
    blacklistedCompanies,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(JOB_STUDIO_RESUME_DRAFT_STORAGE_KEY, resumeDraft);
  }, [resumeDraft]);

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.currentTarget.files?.[0];
      if (!file) {
        return;
      }

      setResumeFileName(file.name);
      setStatusMessage("Parsing resume...");

      const text = await file.text();
      setResumeDraft(text || DEFAULT_RESUME_DRAFT);
      setParsedSummary(buildParsedSummary(text));
      setResumeEditorSeed((current) => current + 1);

      await uploadResumeToBackend({
        file_name: file.name,
        file_type: file.type,
        storage_path: `resume-ingest/${file.name}`,
        resume_text: text,
      });
      setStatusMessage("Resume uploaded and parsed.");
    } catch (error) {
      console.warn("Resume upload backend unavailable. Falling back to local mode.", error);
      setStatusMessage("Local mode active. Backend unavailable.");
    }
  }

  async function handleTailorJob(jobId: string) {
    setSelectedJobId(jobId);
    setStatusMessage("Tailoring preview...");
    try {
      await requestResumeTailoring(jobId);
      setStatusMessage("Tailored preview updated.");
    } catch (error) {
      console.warn("Tailor endpoint unavailable. Showing local preview.", error);
      setStatusMessage("Tailored preview updated locally.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedJob) {
      setStatusMessage("Select a job first.");
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
        setStatusMessage(`Single-job submission queued for ${selectedJob.title}.`);
      } else {
        await createApplicationInBackend({
          job_id: selectedJob.id,
          resume_artifact_id: `auto-${selectedJob.id}`,
          apply_mode: "auto_apply",
        });
        setStatusMessage(`Auto-apply queue started with ${selectedJob.title}.`);
      }
    } catch (error) {
      console.warn("Apply submission failed due to backend connectivity.", error);
      setStatusMessage("Submission failed. Check backend connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleSource(source: JobSourceOption) {
    setSelectedSources((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    );
  }

  function applyAssistantPrompt() {
    const message = assistantInput.trim();
    if (!message) {
      return;
    }
    const updated = applyPromptToPreferences(message, {
      mode,
      jobType,
      seniority,
      selectedSources,
      matchScore,
      dailyCap,
      remoteOnly,
      location,
      blacklistedCompanies,
    });
    setMode(updated.mode);
    setJobType(updated.jobType);
    setSeniority(updated.seniority);
    setSelectedSources(updated.selectedSources);
    setMatchScore(updated.matchScore);
    setDailyCap(updated.dailyCap);
    setRemoteOnly(updated.remoteOnly);
    setLocation(updated.location);
    setBlacklistedCompanies(updated.blacklistedCompanies);
    setAssistantInput("");
    setStatusMessage("Preferences updated.");
  }

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
              <strong>ApplyBloom</strong>
              <span>Job Studio</span>
            </div>
          </div>
          <div className="dashboard-nav-actions" aria-label="Studio navigation">
            <Link href="/" prefetch={false} className="ui-button ui-button-ghost">
              Home
            </Link>
            <Link href="/applications" prefetch={false} className="ui-button ui-button-secondary">
              Applications
            </Link>
          </div>
        </div>
      </div>
      <main className="container studio-v2">
        <Card className="studio-v2-header">
          <CardHeader>
            <Badge variant="accent">Job Studio</Badge>
            <CardTitle>Simple 3-step workflow</CardTitle>
            <CardDescription>Set preferences, edit resume, then apply.</CardDescription>
          </CardHeader>
          <CardContent className="studio-v2-header-content">
            <div className="studio-v2-badges">
              <Badge variant="accent">{resumeFileName}</Badge>
              <Badge variant="success">{statusMessage}</Badge>
              <Badge>{mode === "auto" ? "Auto-apply" : "Single-job"}</Badge>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="studio-v2-simple-flow">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Setup</CardTitle>
              <CardDescription>Upload resume and configure targeting.</CardDescription>
            </CardHeader>
            <CardContent className="studio-v2-section-stack">
              <div className="workflow-upload-box">
                <input
                  id="resume-upload-input"
                  name="resume"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelection}
                />
                <div className="workflow-upload-copy">
                  <h3>Upload resume file</h3>
                  <p>PDF, DOCX, or TXT.</p>
                </div>
              </div>

              <div className="studio-mode-actions">
                <Button
                  variant={mode === "auto" ? "primary" : "secondary"}
                  onClick={() => setMode("auto")}
                >
                  Auto-apply mode
                </Button>
                <Button
                  variant={mode === "single" ? "primary" : "ghost"}
                  onClick={() => setMode("single")}
                >
                  Single-job mode
                </Button>
              </div>

              <div className="studio-chat-composer">
                <Input
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder="Optional: remote senior backend, 85% minimum, 20/day, skip Meta"
                />
                <Button type="button" variant="secondary" onClick={applyAssistantPrompt}>
                  Apply Prompt
                </Button>
              </div>

              <div>
                <div className="workflow-label-row">
                  <strong>Job type</strong>
                  <span>{jobType}</span>
                </div>
                <div className="workflow-select-grid">
                  {JOB_TYPE_OPTIONS.map((option) => (
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

              <div>
                <div className="workflow-label-row">
                  <strong>Seniority</strong>
                  <span>{seniority}</span>
                </div>
                <div className="workflow-select-grid">
                  {SENIORITY_OPTIONS.map((option) => (
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

              <Label className="slider-field">
                <span>Minimum match score: {matchScore}%</span>
                <input
                  type="range"
                  min="40"
                  max="95"
                  value={matchScore}
                  onChange={(event) => setMatchScore(Number(event.target.value))}
                />
              </Label>

              <Label className="slider-field">
                <span>Applications per day: {dailyCap}</span>
                <input
                  type="range"
                  min="5"
                  max="200"
                  value={dailyCap}
                  onChange={(event) => setDailyCap(Number(event.target.value))}
                />
              </Label>

              <Label className="toggle-field">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(event) => setRemoteOnly(event.target.checked)}
                />
                <span>Remote only</span>
              </Label>

              <Label className="field-stack">
                <span>Location</span>
                <Input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Remote - United States"
                />
              </Label>

              <Label className="field-stack">
                <span>Blacklisted companies</span>
                <Textarea
                  rows={2}
                  value={blacklistedCompanies}
                  onChange={(event) => setBlacklistedCompanies(event.target.value)}
                  placeholder="Comma-separated company names"
                />
              </Label>

              <div>
                <div className="workflow-label-row">
                  <strong>Sources</strong>
                  <span>{selectedSources.length} selected</span>
                </div>
                <div className="workflow-source-grid">
                  {JOB_SOURCE_OPTIONS.map((source) => (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Resume Editor</CardTitle>
              <CardDescription>Update resume content before tailoring.</CardDescription>
            </CardHeader>
            <CardContent className="studio-v2-section-stack">
              <ResumeRichTextEditor
                key={resumeEditorSeed}
                initialText={resumeDraft}
                onPlainTextChange={(value) => {
                  setResumeDraft(value);
                  setParsedSummary(buildParsedSummary(value));
                }}
              />
              <p className="muted-copy">{parsedSummary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3: Select Job And Apply</CardTitle>
              <CardDescription>Pick a job, preview tailoring, then submit.</CardDescription>
            </CardHeader>
            <CardContent className="studio-v2-section-stack">
              <div className="workflow-tabs">
                {matches.slice(0, 4).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className="workflow-tab"
                    data-active={selectedJob?.id === job.id}
                    onClick={() => handleTailorJob(job.id)}
                  >
                    <strong>{job.title}</strong>
                    <span>
                      {job.company} | {Math.round((job.score ?? 0) * 100)}%
                    </span>
                  </button>
                ))}
              </div>

              <Card className="selected-job-card">
                <CardContent>
                  {selectedJob ? (
                    <div className="studio-v2-selected-job">
                      <div>
                        <strong>{selectedJob.title}</strong>
                        <p>{selectedJob.company}</p>
                      </div>
                      <div className="chip-row">
                        <Badge variant="accent">
                          {Math.round((selectedJob.score ?? 0) * 100)}% match
                        </Badge>
                        <Badge>{selectedJob.location ?? "No location listed"}</Badge>
                        <Badge variant="success">{selectedJob.remote ? "Remote" : "Onsite"}</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="muted-copy">No job selected yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="preview-panel">
                <CardHeader>
                  <CardTitle>{tailoredPreview.headline}</CardTitle>
                  <CardDescription>{tailoredPreview.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="change-list">
                    {tailoredPreview.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="studio-v2-footer">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Submitting..."
                    : mode === "auto"
                      ? "Start auto-apply"
                      : "Tailor and apply"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}

function applyPromptToPreferences(prompt: string, current: JobStudioPreferences) {
  const text = prompt.toLowerCase();
  const next: Partial<JobStudioPreferences> = { ...current };

  if (text.includes("single")) {
    next.mode = "single";
  }
  if (text.includes("auto")) {
    next.mode = "auto";
  }
  if (text.includes("remote only")) {
    next.remoteOnly = true;
    next.jobType = "Remote only";
  }
  if (text.includes("onsite")) {
    next.remoteOnly = false;
  }

  for (const value of SENIORITY_OPTIONS) {
    if (text.includes(value.toLowerCase().replaceAll(" / ", "/"))) {
      next.seniority = value;
    }
  }

  for (const value of JOB_TYPE_OPTIONS) {
    if (text.includes(value.toLowerCase())) {
      next.jobType = value;
    }
  }

  const scoreMatch = text.match(/(\d{2})\s*%?\s*(minimum|match|score)/);
  if (scoreMatch) {
    next.matchScore = Number(scoreMatch[1]);
  }

  const capMatch = text.match(/(\d{1,3})\s*(\/day|per day|applications)/);
  if (capMatch) {
    next.dailyCap = Number(capMatch[1]);
  }

  const skipMatch = text.match(/skip\s+([a-z0-9,\s-]+)/i);
  if (skipMatch) {
    next.blacklistedCompanies = skipMatch[1].trim();
  }

  for (const source of JOB_SOURCE_OPTIONS) {
    if (text.includes(source.toLowerCase())) {
      next.selectedSources = [...new Set([...(next.selectedSources ?? []), source])];
    }
  }

  return normalizeJobStudioPreferences(next);
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

const DEFAULT_RESUME_DRAFT = `John Doe
Backend Engineer

Summary
Platform-focused engineer with 5+ years building APIs, queues, and production automation.

Experience
- Led backend delivery for high-throughput workflow systems.
- Built resume tailoring and job matching services with measurable conversion lift.

Skills
TypeScript, Python, Postgres, Redis, Cloudflare Workers, Playwright`;

const DEFAULT_PARSED_SUMMARY = "Upload a resume to see extracted skills and targeting signals.";

const FALLBACK_MATCHES = [
  {
    id: "local-backend-engineer",
    title: "Backend Engineer",
    company: "Example Labs",
    location: "Remote - US",
    remote: true,
    score: 0.88,
    reason: "Strong match on backend systems, TypeScript, and API ownership.",
  },
  {
    id: "local-platform-engineer",
    title: "Platform Engineer",
    company: "Core Systems",
    location: "San Francisco, CA",
    remote: false,
    score: 0.81,
    reason: "Good overlap on infra automation, queue processing, and observability.",
  },
];
