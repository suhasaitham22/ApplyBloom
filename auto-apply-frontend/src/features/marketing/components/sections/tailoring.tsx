"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

const ORIGINAL = "Built a dashboard that increased usage.";
const TAILORED = "Led the React + TypeScript dashboard redesign at Acme that lifted weekly active use 22% in Q3.";

export function TailoringSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Scroll-linked typewriter
  const charCount = useTransform(scrollYProgress, [0.2, 0.65], [0, TAILORED.length]);
  const typed = useTransform(charCount, (v) => TAILORED.slice(0, Math.round(v)));

  // Original fades / strikes through as we progress
  const leftOpacity = useTransform(scrollYProgress, [0.1, 0.25, 0.7], [0.4, 1, 0.5]);
  const leftX = useTransform(scrollYProgress, [0.1, 0.35], [-40, 0]);

  const rightOpacity = useTransform(scrollYProgress, [0.15, 0.3], [0, 1]);
  const rightX = useTransform(scrollYProgress, [0.15, 0.35], [40, 0]);
  const rightBorderBlur = useTransform(scrollYProgress, [0.6, 0.75], [0, 12]);

  return (
    <section ref={ref} id="tailoring" className="bg-background py-24 sm:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 max-w-2xl"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tailoring, truthfully</p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Rewrite bullets. <span className="italic text-muted-foreground">Never fabricate facts.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Scroll to watch a single bullet get tailored in real time — adapting phrasing without inventing anything.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <motion.div
            style={{ opacity: leftOpacity, x: leftX }}
            className="rounded-xl border border-border bg-secondary/40 p-6"
          >
            <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Original</p>
            <p className="font-mono text-sm text-muted-foreground line-through decoration-red-400/40 decoration-1">{ORIGINAL}</p>
          </motion.div>

          <div className="mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background shadow-sm"
            >
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </div>

          <motion.div
            style={{
              opacity: rightOpacity,
              x: rightX,
              boxShadow: useTransform(rightBorderBlur, (b) => `0 0 ${b}px rgba(47,124,255,0.3)`),
            }}
            className="rounded-xl border-2 p-6"
            // eslint-disable-next-line react/forbid-dom-props
            // using inline style for border color
          >
            <div className="rounded-xl" style={{ borderColor: "#2f7cff" }}>
              <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: "#2f7cff" }}>Tailored</p>
              <motion.p className="min-h-[3.5rem] font-mono text-sm leading-relaxed">
                <motion.span>{typed}</motion.span>
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#2f7cff] align-middle" />
              </motion.p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-14 flex max-w-md items-center gap-3 rounded-full border border-border bg-secondary/30 px-5 py-3 text-sm text-muted-foreground"
        >
          <ShieldCheck className="h-4 w-4" style={{ color: "#f4a21b" }} />
          <span>Every claim is cross-checked against your source resume.</span>
        </motion.div>
      </div>
    </section>
  );
}
