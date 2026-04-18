"use client";
import { motion, useReducedMotion } from "framer-motion";

const JOBS = [
  { title: "Senior Product Designer", company: "Netflix", match: 92 },
  { title: "Staff Engineer", company: "Stripe", match: 88 },
  { title: "UX Researcher", company: "Figma", match: 85 },
  { title: "Full-stack Engineer", company: "Linear", match: 90 },
  { title: "Product Manager", company: "Notion", match: 81 },
  { title: "Design Engineer", company: "Vercel", match: 94 },
];

// Job cards stream across a strip just below the nav bar and above the logo.
// Strip is tall enough (6rem) to fully contain the card including its shadow.

export function JobStream() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 overflow-hidden"
      style={{ top: "5rem", height: "6rem" }}
      aria-hidden
    >
      {JOBS.map((job, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 -translate-y-1/2"
          initial={{ x: "110vw", opacity: 0, rotate: 0 }}
          animate={{
            x: "-30vw",
            opacity: [0, 0.85, 0.85, 0],
            rotate: [-1, 1, -1, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, delay: i * 2.6, ease: "linear" }}
        >
          <JobCard title={job.title} company={job.company} match={job.match} />
        </motion.div>
      ))}
    </div>
  );
}

function JobCard({ title, company, match }: { title: string; company: string; match: number }) {
  return (
    <div className="flex min-w-[220px] items-center gap-3 rounded-full border border-black/10 bg-white/95 px-4 py-2 shadow-lg shadow-black/5 backdrop-blur-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: "#2f7cff" }}>
        {company[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-tight text-[#0d1a28]">{title}</p>
        <p className="truncate text-[10px] leading-tight text-black/50">{company}</p>
      </div>
      <div className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(244,162,27,0.2)", color: "#8a5a0c" }}>
        {match}%
      </div>
    </div>
  );
}
