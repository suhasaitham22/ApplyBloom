"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { StoryProvider, useStory, STORY_STEPS, type StoryStep } from "@/lib/story-context";
import { Progress } from "@/components/ui/progress";
import { WelcomeStep } from "@/components/steps/welcome-step";
import { UploadStep } from "@/components/steps/upload-step";
import { ReviewStep } from "@/components/steps/review-step";
import { JobStep } from "@/components/steps/job-step";
import { TailorStep } from "@/components/steps/tailor-step";
import { ApplyStep } from "@/components/steps/apply-step";
import { DoneStep } from "@/components/steps/done-step";

const LABELS: Record<StoryStep, string> = {
  welcome: "Start",
  upload: "Resume",
  review: "Review",
  job: "Job",
  tailor: "Tailor",
  apply: "Apply",
  done: "Done",
};

function Router() {
  const { step } = useStory();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {step === "welcome" && <WelcomeStep />}
        {step === "upload" && <UploadStep />}
        {step === "review" && <ReviewStep />}
        {step === "job" && <JobStep />}
        {step === "tailor" && <TailorStep />}
        {step === "apply" && <ApplyStep />}
        {step === "done" && <DoneStep />}
      </motion.div>
    </AnimatePresence>
  );
}

function TopBar() {
  const { step } = useStory();
  const idx = STORY_STEPS.indexOf(step);
  const percent = step === "welcome" ? 0 : Math.round((idx / (STORY_STEPS.length - 1)) * 100);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Image src="/applybloom-logo.svg" alt="ApplyBloom" width={28} height={28} priority />
          <span className="font-display text-lg tracking-tight">ApplyBloom</span>
        </div>
        {step !== "welcome" && (
          <div className="ml-auto mr-auto flex items-center gap-4 w-full max-w-sm">
            <Progress value={percent} className="h-1" />
            <span className="text-xs tabular-nums text-muted-foreground">{LABELS[step]}</span>
          </div>
        )}
        <span className="ml-auto text-xs text-muted-foreground">Demo</span>
      </div>
    </header>
  );
}

export function StoryApp() {
  return (
    <StoryProvider>
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <main><Router /></main>
      </div>
    </StoryProvider>
  );
}
