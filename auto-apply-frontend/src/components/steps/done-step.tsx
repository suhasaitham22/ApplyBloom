"use client";

import { motion } from "framer-motion";
import { useStory } from "@/lib/story-context";

export function DoneStep() {
  const { job, reset } = useStory();
  return (
    <motion.section key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring" }} className="mx-auto max-w-xl px-6 pt-24 text-center">
      <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/40">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <h2 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>Nice work.</h2>
      <p className="text-neutral-600">Your application for <span className="font-medium text-neutral-900">{job.title}</span>{job.company ? <> at <span className="font-medium text-neutral-900">{job.company}</span></> : null} is logged.</p>
      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={reset} className="mt-8 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg">Tailor another</motion.button>
    </motion.section>
  );
}
