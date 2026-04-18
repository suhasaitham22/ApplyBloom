"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStory } from "@/lib/story-context";

export function DoneStep() {
  const { job, reset } = useStory();
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary"
      >
        <Check className="h-8 w-8 text-primary-foreground" strokeWidth={3} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display text-5xl tracking-tightest"
      >
        Nice work.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-4 text-muted-foreground"
      >
        {job.title}{job.company && <> at {job.company}</>} is logged.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-10"
      >
        <Button size="lg" onClick={reset}>
          <Sparkles className="mr-2 h-4 w-4" /> Tailor another
        </Button>
      </motion.div>
    </section>
  );
}
