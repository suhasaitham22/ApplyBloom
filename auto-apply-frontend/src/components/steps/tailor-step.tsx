"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useStory } from "@/lib/story-context";
import { tailorResumeOnBackend } from "@/lib/backend-api-client";

export function TailorStep() {
  const { resume, job, tailored, setTailored, demoMode, setDemoMode, next, back } = useStory();
  const [loading, setLoading] = useState(!tailored);
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !resume || !job.title) return;
    ran.current = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await tailorResumeOnBackend(resume, { title: job.title, company: job.company || undefined, description: job.description, url: job.url || undefined });
        setTailored(data.tailored);
        setDemoMode(data.demo_mode);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Tailor request failed");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <motion.section key="tailor-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-xl px-6 pt-32 text-center">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-xl shadow-indigo-500/40">
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <h2 className="mb-2 text-2xl font-semibold text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>Rewriting your resume…</h2>
        <p className="text-neutral-600">Emphasizing the skills and wins that matter most for this role.</p>
      </motion.section>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-20 text-center text-rose-600">
        {error}
        <div className="mt-4"><button onClick={back} className="text-sm text-neutral-500 underline">Go back</button></div>
      </div>
    );
  }

  if (!tailored) return null;

  return (
    <motion.section key="tailor" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="mx-auto max-w-4xl px-6 pt-8">
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>Your tailored resume</h2>
        <p className="text-neutral-600">
          Aligned to <span className="font-medium text-neutral-900">{job.title}</span>
          {job.company ? <> at <span className="font-medium text-neutral-900">{job.company}</span></> : null}.
        </p>
        {demoMode && (<p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">Heuristic mode — wire Workers AI for full rewriting</p>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
          <h3 className="text-3xl font-semibold tracking-tight text-neutral-900">{resume?.full_name}</h3>
          <p className="mt-1 text-indigo-600">{tailored.headline}</p>
          <p className="mt-6 text-sm leading-relaxed text-neutral-700">{tailored.summary}</p>
          <div className="mt-6">
            <SectionTitle>Skills</SectionTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              {tailored.skills.map((s, i) => (
                <motion.span key={s + i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">{s}</motion.span>
              ))}
            </div>
          </div>
          <Section title="Experience" items={tailored.experience} />
          <Section title="Education" items={tailored.education} />
        </motion.div>
        <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 ring-1 ring-emerald-200">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-800">What changed</h4>
          <ul className="space-y-3">
            <AnimatePresence>
              {tailored.change_summary.map((c, i) => (
                <motion.li key={c} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex items-start gap-2 text-sm text-emerald-900">
                  <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">✓</span>
                  {c}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.aside>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <button onClick={back} className="text-sm text-neutral-500 hover:text-neutral-900">← Back</button>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={next} className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg">Ready to apply →</motion.button>
      </div>
    </motion.section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{children}</h4>;
}

function Section({ title, items }: { title: string; items: { heading: string; bullets: string[] }[] }) {
  return (
    <div className="mt-6">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-2 space-y-4">
        {items.map((it, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <p className="text-sm font-semibold text-neutral-900">{it.heading}</p>
            <ul className="mt-1 space-y-1">
              {it.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-neutral-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
