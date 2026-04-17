"use client";

import { AnimatePresence } from "framer-motion";
import { StoryProvider, useStory } from "@/lib/story-context";
import { StoryProgress } from "@/components/story-progress";
import { WelcomeStep } from "@/components/steps/welcome-step";
import { UploadStep } from "@/components/steps/upload-step";
import { ReviewStep } from "@/components/steps/review-step";
import { JobStep } from "@/components/steps/job-step";
import { TailorStep } from "@/components/steps/tailor-step";
import { ApplyStep } from "@/components/steps/apply-step";
import { DoneStep } from "@/components/steps/done-step";

function Router() {
  const { step } = useStory();
  return (
    <AnimatePresence mode="wait">
      {step === "welcome" && <WelcomeStep />}
      {step === "upload" && <UploadStep />}
      {step === "review" && <ReviewStep />}
      {step === "job" && <JobStep />}
      {step === "tailor" && <TailorStep />}
      {step === "apply" && <ApplyStep />}
      {step === "done" && <DoneStep />}
    </AnimatePresence>
  );
}

function ProgressGate() {
  const { step } = useStory();
  if (step === "welcome") return null;
  return <StoryProgress />;
}

export function StoryApp() {
  return (
    <StoryProvider>
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white pb-24">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow shadow-indigo-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>ApplyBloom</span>
          </div>
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white">Demo</span>
        </header>
        <ProgressGate />
        <main><Router /></main>
      </div>
    </StoryProvider>
  );
}
