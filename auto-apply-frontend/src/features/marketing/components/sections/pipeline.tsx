"use client";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { Upload, FileJson, Search, Wand2, Send, LineChart } from "lucide-react";

const STAGES = [
  { icon: Upload, label: "Upload", desc: "Drop your resume." },
  { icon: FileJson, label: "Parse", desc: "Structured in seconds." },
  { icon: Search, label: "Match", desc: "Ranked by fit, explained." },
  { icon: Wand2, label: "Tailor", desc: "Rewritten, never fabricated." },
  { icon: Send, label: "Apply", desc: "Submitted and logged." },
  { icon: LineChart, label: "Track", desc: "Every status, every time." },
];

export function PipelineSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const pathLen = useTransform(scrollYProgress, [0.05, 0.95], [0, 1]);
  const tokenLeft = useTransform(scrollYProgress, [0.05, 0.95], ["4%", "96%"]);

  return (
    <section ref={ref} id="pipeline" className="relative bg-[#0d1a28] text-white" style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(800px circle at 50% 50%, rgba(47,124,255,0.15), transparent 60%)" }}
        />

        <div className="relative mx-auto w-full max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">How it works</p>
            <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Upload → parse → match → tailor → apply → track.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">
              Scroll through the pipeline. Each stage lights up as the token passes.
            </p>
          </div>

          <div className="relative">
            <svg viewBox="0 0 1000 120" className="w-full" aria-hidden>
              <defs>
                <linearGradient id="pipelineGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#2f7cff" />
                  <stop offset="100%" stopColor="#f4a21b" />
                </linearGradient>
              </defs>
              <path d="M 40 60 Q 200 20, 360 60 T 680 60 T 960 60" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
              <motion.path
                d="M 40 60 Q 200 20, 360 60 T 680 60 T 960 60"
                stroke="url(#pipelineGrad)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                style={{ pathLength: pathLen }}
              />
            </svg>
            <motion.div
              className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-2xl"
              style={{ left: tokenLeft, background: "#f4a21b", boxShadow: "0 0 40px rgba(244,162,27,0.7)" }}
            >
              <span className="text-base font-bold text-[#0d1a28]">✦</span>
            </motion.div>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {STAGES.map((s, i) => (
              <StageCard key={s.label} stage={s} index={i} total={STAGES.length} progress={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StageCard({ stage, index, total, progress }: {
  stage: typeof STAGES[number]; index: number; total: number; progress: MotionValue<number>;
}) {
  // Distribute thresholds across 5–95% of section scroll, matching the token position.
  const mid = 0.05 + ((index + 0.5) / total) * 0.9;
  const start = mid - 0.08;
  const end = mid + 0.08;

  // Before: dim. During: full bright + scaled. After: stays "lit".
  const opacity = useTransform(progress, [start - 0.04, start, end, 1], [0.25, 1, 1, 0.85]);
  const scale = useTransform(progress, [start - 0.04, start, end, 1], [0.9, 1.15, 1.05, 1]);
  const ringOpacity = useTransform(progress, [start, mid, end], [0, 1, 0]);
  const iconColor = useTransform(progress, [start - 0.04, start], ["#ffffff", "#f4a21b"]);
  const borderColor = useTransform(
    progress,
    [start - 0.04, start, end, 1],
    ["rgba(255,255,255,0.2)", "rgba(244,162,27,0.9)", "rgba(244,162,27,0.9)", "rgba(47,124,255,0.5)"],
  );
  const bgColor = useTransform(
    progress,
    [start - 0.04, start, end, 1],
    ["rgba(255,255,255,0.05)", "rgba(244,162,27,0.15)", "rgba(244,162,27,0.1)", "rgba(47,124,255,0.1)"],
  );

  return (
    <motion.div style={{ opacity, scale }} className="relative text-center">
      <div className="relative mx-auto mb-3 h-12 w-12">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ borderColor: "rgba(244,162,27,0.8)", borderWidth: 2, borderStyle: "solid", opacity: ringOpacity }}
        />
        <motion.div
          className="flex h-full w-full items-center justify-center rounded-full border backdrop-blur"
          style={{ borderColor, background: bgColor }}
        >
          <motion.span style={{ color: iconColor }}>
            <stage.icon className="h-4 w-4" />
          </motion.span>
        </motion.div>
      </div>
      <p className="text-sm font-semibold">{stage.label}</p>
      <p className="mt-1 text-xs text-white/50">{stage.desc}</p>
    </motion.div>
  );
}
