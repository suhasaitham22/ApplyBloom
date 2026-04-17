"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useStory } from "@/lib/story-context";
import { recordApplicationOnBackend } from "@/lib/backend-api-client";

export function ApplyStep() {
  const { tailored, job, resume, next, back } = useStory();
  const [downloaded, setDownloaded] = useState(false);
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState<null | "submit" | "save">(null);
  const [emailMessage, setEmailMessage] = useState("");

  if (!tailored || !resume) return null;

  async function downloadPdf() {
    const mod = await import("jspdf").catch(() => null);
    const text = renderResumeText(tailored!, resume!.full_name, resume!.contact);
    if (!mod) {
      const blob = new Blob([text], { type: "text/plain" });
      triggerDownload(blob, `${resume!.full_name || "resume"}.txt`);
      setDownloaded(true);
      return;
    }
    const jsPDF = mod.default || (mod as unknown as { jsPDF: typeof mod.default }).jsPDF;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const lines = doc.splitTextToSize(text, width);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(lines, margin, margin + 12);
    doc.save(`${resume!.full_name || "resume"}-tailored.pdf`);
    setDownloaded(true);
  }

  function openApply() {
    if (job.url) {
      window.open(job.url, "_blank", "noopener,noreferrer");
      setOpened(true);
    }
  }

  async function mark(status: "submitted" | "saved_for_later") {
    setSubmitting(status === "submitted" ? "submit" : "save");
    try {
      const { data } = await recordApplicationOnBackend({ job_title: job.title, company: job.company || undefined, apply_url: job.url || undefined, status });
      setEmailMessage(data.notification.message);
      next();
    } catch (err) {
      setEmailMessage(err instanceof Error ? err.message : "Failed to record");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <motion.section key="apply" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl px-6 pt-16">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>Three steps to ship it.</h2>
        <p className="text-neutral-600">Download the tailored PDF, open the ATS, then mark as submitted.</p>
      </div>
      <div className="space-y-4">
        <ActionCard number={1} title="Download tailored resume" description="A clean PDF with your rewritten content." actionLabel={downloaded ? "Downloaded ✓" : "Download PDF"} onClick={downloadPdf} done={downloaded} />
        <ActionCard number={2} title={job.url ? "Open the job posting" : "Paste resume into ATS"} description={job.url ? "We’ll open it in a new tab so you can apply." : "No URL provided — open your application system."} actionLabel={opened ? "Opened ✓" : job.url ? "Open ↗" : "Skip"} onClick={job.url ? openApply : () => setOpened(true)} done={opened} />
        <ActionCard number={3} title="Once applied, mark it" description="We’ll log it in your application history and send a confirmation email." done={false}>
          <div className="mt-3 flex gap-2">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => mark("submitted")} disabled={submitting !== null} className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow disabled:opacity-50">{submitting === "submit" ? "Saving…" : "Mark submitted"}</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => mark("saved_for_later")} disabled={submitting !== null} className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50">Save for later</motion.button>
          </div>
        </ActionCard>
      </div>
      {emailMessage && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-xs text-neutral-500">{emailMessage}</motion.p>)}
      <div className="mt-8 text-center"><button onClick={back} className="text-sm text-neutral-500 hover:text-neutral-900">← Back to tailored resume</button></div>
    </motion.section>
  );
}

function ActionCard({ number, title, description, actionLabel, onClick, done, children }: { number: number; title: string; description: string; actionLabel?: string; onClick?: () => void; done: boolean; children?: React.ReactNode; }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: number * 0.08 }} className={`flex items-start gap-4 rounded-3xl p-5 ring-1 transition-all ${done ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-neutral-200"}`}>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-emerald-500 text-white" : "bg-neutral-900 text-white"}`}>{done ? "✓" : number}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-600">{description}</p>
        {children}
      </div>
      {actionLabel && onClick && (
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onClick} className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow">{actionLabel}</motion.button>
      )}
    </motion.div>
  );
}

function renderResumeText(t: { headline: string; summary: string; skills: string[]; experience: { heading: string; bullets: string[] }[]; education: { heading: string; bullets: string[] }[] }, name: string, contact: { email: string; phone: string; location: string }) {
  const parts: string[] = [];
  parts.push(name);
  parts.push(t.headline);
  parts.push([contact.email, contact.phone, contact.location].filter(Boolean).join("  |  "));
  parts.push("");
  parts.push("SUMMARY");
  parts.push(t.summary);
  parts.push("");
  parts.push("SKILLS");
  parts.push(t.skills.join(", "));
  parts.push("");
  parts.push("EXPERIENCE");
  t.experience.forEach((s) => { parts.push(s.heading); s.bullets.forEach((b) => parts.push("  • " + b)); parts.push(""); });
  parts.push("EDUCATION");
  t.education.forEach((s) => { parts.push(s.heading); s.bullets.forEach((b) => parts.push("  • " + b)); });
  return parts.join("\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
