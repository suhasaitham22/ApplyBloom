"use client";
import { motion } from "framer-motion";

// A visual "pause" between sections — a thin animated marker that signals a new beat
// as the reader scrolls. Shows on-enter only.

export function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-xl px-6">
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8 }}
        className="h-px origin-center"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(47,124,255,0.5), rgba(244,162,27,0.5), transparent)",
        }}
      />
      {label ? (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
        >
          {label}
        </motion.p>
      ) : null}
    </div>
  );
}
