"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useStory } from "@/lib/story-context";

export function JobStep() {
  const { job, setJob, next, back } = useStory();
  const [error, setError] = useState("");

  function onContinue() {
    if (!job.title.trim() || !job.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setError("");
    next();
  }

  return (
    <motion.section key="job" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl px-6 pt-16">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>Which job are we targeting?</h2>
        <p className="text-neutral-600">Paste the posting — we’ll tailor your resume to it.</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <Field label="Job title" value={job.title} onChange={(v) => setJob({ title: v })} placeholder="Senior Backend Engineer" />
        <Field label="Company (optional)" value={job.company} onChange={(v) => setJob({ company: v })} placeholder="Acme Corp" />
        <Field label="Job URL (optional)" value={job.url} onChange={(v) => setJob({ url: v })} placeholder="https://…" />
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Job description</span>
          <textarea value={job.description} onChange={(e) => setJob({ description: e.target.value })} rows={10} placeholder="Paste the full job description here…" className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          <button onClick={back} className="text-sm text-neutral-500 hover:text-neutral-900">← Back</button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onContinue} className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg">
            Tailor my resume →
          </motion.button>
        </div>
      </motion.div>
    </motion.section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
    </div>
  );
}
