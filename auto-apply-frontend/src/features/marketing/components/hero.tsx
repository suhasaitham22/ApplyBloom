"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingResumes } from "./animations/floating-resumes";
import { JobStream } from "./animations/job-stream";

export function MarketingHero() {
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      {/* aurora bg */}
      <div className="pointer-events-none absolute inset-0 -z-20" aria-hidden>
        <div
          className="absolute left-1/2 top-1/3 h-[60rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(47,124,255,0.22), transparent 70%)" }}
        />
        <div
          className="absolute right-0 bottom-0 h-[40rem] w-[40rem] translate-x-1/3 translate-y-1/3 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(244,162,27,0.18), transparent 70%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(13,26,40,0.06) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* floating resumes: below the job-stream band, outer margins only */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 top-48 -z-10 overflow-hidden"
        aria-hidden
      >
        <FloatingResumes />
      </div>

      {/* job stream: strip between nav and logo — hidden on tiny screens to avoid cramped overlap */}
      <div className="hidden sm:block">
        <JobStream />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-32 text-center sm:pt-48">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
          <Image src="/applybloom-logo.svg" alt="" width={72} height={72} priority />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mt-6 text-xs uppercase tracking-[0.24em] text-muted-foreground"
        >
          AI job application studio
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
          className="mt-6 font-display text-[2.75rem] leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]"
        >
          Apply with{" "}
          <span className="relative inline-block px-3">
            <motion.span
              aria-hidden
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-md"
              style={{ background: "#f4a21b" }}
            />
            <span className="relative italic" style={{ color: "#2f7cff" }}>craft</span>
          </span>
          ,
          <br />
          not spam.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-8 max-w-xl text-lg text-muted-foreground"
        >
          Upload your resume. Paste a job. Get a tailored application your future self will thank you for — tracked, truthful, and ready in under a minute.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Button size="lg" asChild className="group">
            <Link href="/signup">
              Begin your story
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="/login">I already have an account</Link>
          </Button>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
          className="mt-20 text-xs text-muted-foreground"
        >
          Scroll to see how it works ↓
        </motion.p>
      </div>
    </section>
  );
}
