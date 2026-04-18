"use client";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONVERGERS = [
  { fromX: "-60vw", fromY: "-40vh", rotate: -12, delay: 0 },
  { fromX: "60vw", fromY: "-30vh", rotate: 8, delay: 0.1 },
  { fromX: "-50vw", fromY: "40vh", rotate: 6, delay: 0.2 },
  { fromX: "55vw", fromY: "35vh", rotate: -9, delay: 0.3 },
  { fromX: "-30vw", fromY: "-50vh", rotate: 14, delay: 0.4 },
  { fromX: "40vw", fromY: "50vh", rotate: -6, delay: 0.5 },
];

export function FinalCtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const highlightScale = useTransform(scrollYProgress, [0.3, 0.7], [0, 1]);

  return (
    <section ref={ref} id="cta" className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#0d1a28] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(700px circle at 50% 60%, rgba(244,162,27,0.2), transparent 60%)" }}
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {CONVERGERS.map((c, i) => {
          const progress = [0.1 + c.delay * 0.3, 0.55 + c.delay * 0.3];
          const x = useTransform(scrollYProgress, progress, [c.fromX, "-50%"]);
          const y = useTransform(scrollYProgress, progress, [c.fromY, "-50%"]);
          const rotate = useTransform(scrollYProgress, progress, [c.rotate * 3, c.rotate]);
          const opacity = useTransform(scrollYProgress, [progress[0] - 0.05, progress[0] + 0.05, progress[1]], [0, 0.9, 0.7]);
          return (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 h-32 w-24 rounded-lg border border-white/20 bg-white/95 shadow-2xl"
              style={{ x, y, rotate, opacity }}
            />
          );
        })}
      </div>

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs uppercase tracking-[0.24em] text-white/50"
        >
          Your move
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="mt-4 font-display text-4xl sm:text-6xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl lg:text-[7rem]"
        >
          Begin your{" "}
          <span className="relative inline-block px-3">
            <motion.span
              aria-hidden
              style={{ scaleX: highlightScale, originX: 0 }}
              className="absolute inset-0 rounded-md"
              // background
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-md"
              style={{ background: "#f4a21b", transformOrigin: "left", transform: `scaleX(0)` }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-md"
              style={{ background: "#f4a21b", scaleX: highlightScale, originX: 0 }}
            />
            <span className="relative italic" style={{ color: "#2f7cff" }}>story</span>
          </span>
          .
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="mx-auto mt-8 max-w-md text-lg text-white/70"
        >
          Sign up free. Upload a resume. See what tailoring with craft actually feels like.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button size="lg" asChild className="group">
            <Link href="/signup">
              Begin your story <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
