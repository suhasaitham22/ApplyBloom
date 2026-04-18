"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Drifting paper cards only in the outer margins and lower half — avoid the center title zone.

const PAPERS = [
  { x: "4%", y: "30%", rotate: -12, delay: 0, scale: 0.9 },
  { x: "86%", y: "32%", rotate: 9, delay: 1.1, scale: 1 },
  { x: "6%", y: "70%", rotate: 6, delay: 0.5, scale: 0.85 },
  { x: "88%", y: "72%", rotate: -7, delay: 1.6, scale: 0.95 },
  { x: "12%", y: "92%", rotate: 3, delay: 0.8, scale: 0.75 },
  { x: "82%", y: "90%", rotate: -15, delay: 0.3, scale: 0.8 },
];

export function FloatingResumes() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const fn = () => setReduced(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PAPERS.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: p.x, top: p.y }}
          initial={{ opacity: 0, y: 20, rotate: p.rotate }}
          animate={
            reduced
              ? { opacity: 0.4, y: 0, rotate: p.rotate }
              : {
                  opacity: [0, 0.5, 0.5, 0.35, 0.5],
                  y: [20, 0, -12, 8, 0],
                  rotate: [p.rotate, p.rotate + 3, p.rotate - 2, p.rotate + 4, p.rotate],
                }
          }
          transition={{
            duration: 12 + i * 0.8,
            repeat: reduced ? 0 : Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        >
          <ResumePaper scale={p.scale} variant={i % 3} />
        </motion.div>
      ))}
    </div>
  );
}

function ResumePaper({ scale = 1, variant = 0 }: { scale?: number; variant?: number }) {
  const accents = [
    { head: "#2f7cff", bar: "rgba(47,124,255,0.15)" },
    { head: "#f4a21b", bar: "rgba(244,162,27,0.15)" },
    { head: "#0d1a28", bar: "rgba(13,26,40,0.1)" },
  ];
  const a = accents[variant % accents.length];
  return (
    <div
      className="rounded-lg border border-black/5 bg-white/95 shadow-xl shadow-black/5 backdrop-blur-sm"
      style={{ width: 180 * scale, padding: 14 * scale, transform: `scale(${scale})` }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-10 rounded-full" style={{ background: a.head }} />
        <div className="h-1.5 w-16 rounded-full bg-black/10" />
      </div>
      <div className="space-y-1.5">
        <div className="h-1 w-full rounded-full" style={{ background: a.bar }} />
        <div className="h-1 w-[88%] rounded-full" style={{ background: a.bar }} />
        <div className="h-1 w-[76%] rounded-full" style={{ background: a.bar }} />
        <div className="h-1 w-[92%] rounded-full bg-black/5" />
        <div className="h-1 w-[60%] rounded-full bg-black/5" />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: a.head }} />
        <div className="h-1 w-8 rounded-full bg-black/10" />
      </div>
    </div>
  );
}
