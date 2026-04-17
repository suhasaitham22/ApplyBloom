"use client";

import { motion } from "framer-motion";
import { useStory } from "@/lib/story-context";

export function WelcomeStep() {
  const { next } = useStory();
  return (
    <motion.section
      key="welcome"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mx-auto max-w-3xl px-6 pt-20 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5, type: "spring" }}
        className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-xl shadow-indigo-500/30"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-4 text-5xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>
        Apply with craft, not spam.
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mx-auto mb-10 max-w-xl text-lg text-neutral-600">
        Upload your resume, paste a job, and get a tailored application ready to send in under a minute.
      </motion.p>
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={next} className="rounded-full bg-neutral-900 px-8 py-4 text-base font-medium text-white shadow-lg shadow-neutral-900/20 transition-shadow hover:shadow-xl">
        Begin →
      </motion.button>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6 text-xs text-neutral-400">
        Single-job apply mode · No account required in demo mode
      </motion.p>
    </motion.section>
  );
}
