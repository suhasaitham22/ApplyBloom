"use client";

import { motion } from "framer-motion";
import { Download, ExternalLink, Check, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    const jsPDF = mod.default;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 54;
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
      const { data } = await recordApplicationOnBackend({
        job_title: job.title,
        company: job.company || undefined,
        apply_url: job.url || undefined,
        status,
      });
      setEmailMessage(data.notification.message);
      next();
    } catch (err) {
      setEmailMessage(err instanceof Error ? err.message : "Failed to record");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-6 pt-20 pb-16">
      <div className="mb-10">
        <h2 className="font-display text-4xl tracking-tightest sm:text-5xl">Three steps to ship.</h2>
        <p className="mt-3 text-muted-foreground">Download the PDF, open the job, then mark it.</p>
      </div>

      <div className="space-y-3">
        <ActionCard
          number={1}
          title="Download tailored resume"
          description="Clean PDF with your rewritten content."
          actionLabel={downloaded ? "Downloaded" : "Download"}
          onClick={downloadPdf}
          done={downloaded}
          icon={<Download className="h-4 w-4" />}
        />
        <ActionCard
          number={2}
          title={job.url ? "Open the job posting" : "Paste into your ATS"}
          description={job.url ? "Opens in a new tab." : "No URL provided."}
          actionLabel={opened ? "Opened" : job.url ? "Open" : "Skip"}
          onClick={job.url ? openApply : () => setOpened(true)}
          done={opened}
          icon={<ExternalLink className="h-4 w-4" />}
        />
        <ActionCard
          number={3}
          title="Once applied, mark it"
          description="We’ll log it and send a confirmation."
          done={false}
          footer={
            <div className="mt-4 flex gap-2">
              <Button onClick={() => mark("submitted")} disabled={submitting !== null} size="sm">
                {submitting === "submit" ? "Saving…" : "Mark submitted"}
              </Button>
              <Button variant="outline" onClick={() => mark("saved_for_later")} disabled={submitting !== null} size="sm">
                Save for later
              </Button>
            </div>
          }
        />
      </div>

      {emailMessage && <p className="mt-5 text-center text-xs text-muted-foreground">{emailMessage}</p>}

      <div className="mt-10 text-center">
        <Button variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to tailored resume
        </Button>
      </div>
    </section>
  );
}

function ActionCard({ number, title, description, actionLabel, onClick, done, icon, footer }: {
  number: number; title: string; description: string; actionLabel?: string; onClick?: () => void; done: boolean; icon?: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: number * 0.08 }}>
      <Card className={done ? "border-primary/40" : ""}>
        <CardContent className="flex items-start gap-4 p-5">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${done ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {done ? <Check className="h-4 w-4" strokeWidth={3} /> : number}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            {footer}
          </div>
          {actionLabel && onClick && (
            <Button size="sm" variant={done ? "outline" : "default"} onClick={onClick}>
              {icon}<span className={icon ? "ml-1.5" : ""}>{actionLabel}</span>
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function renderResumeText(t: { headline: string; summary: string; skills: string[]; experience: { heading: string; bullets: string[] }[]; education: { heading: string; bullets: string[] }[] }, name: string, contact: { email: string; phone: string; location: string }) {
  const parts: string[] = [name, t.headline, [contact.email, contact.phone, contact.location].filter(Boolean).join("  |  "), "", "SUMMARY", t.summary, "", "SKILLS", t.skills.join(", "), "", "EXPERIENCE"];
  t.experience.forEach((s) => { parts.push(s.heading); s.bullets.forEach((b) => parts.push("  • " + b)); parts.push(""); });
  parts.push("EDUCATION");
  t.education.forEach((s) => { parts.push(s.heading); s.bullets.forEach((b) => parts.push("  • " + b)); });
  return parts.join("\n");
}
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
