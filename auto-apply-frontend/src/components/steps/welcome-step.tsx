"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStory } from "@/lib/story-context";

export function WelcomeStep() {
  const { next } = useStory();
  return (
    <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.5 }}
        className="mb-8"
      >
        <Image src="/applybloom-logo.svg" alt="ApplyBloom" width={72} height={72} priority />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground"
      >
        Single-apply mode
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="font-display text-6xl leading-[0.95] tracking-tightest sm:text-7xl md:text-8xl"
      >
        Apply with
        <br />
        <span className="relative inline-block px-3">
          <span className="absolute inset-0 rounded-md" style={{ background: "#f4a21b" }} aria-hidden />
          <span className="relative italic" style={{ color: "#2f7cff" }}>craft</span>
        </span>
        , not spam.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 max-w-lg text-lg text-muted-foreground"
      >
        Upload your resume, paste a job, and get a tailored application in under a minute.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-12"
      >
        <Button size="lg" onClick={next} className="group">
          Begin
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </motion.div>
    </section>
  );
}
