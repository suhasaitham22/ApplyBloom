"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { StructuredResume, TailoredResume } from "@/lib/api-types";

export type StoryStep = "welcome" | "upload" | "review" | "job" | "tailor" | "apply" | "done";

export interface StoryState {
  step: StoryStep;
  resume: StructuredResume | null;
  resumeFileName: string | null;
  rawResumeText: string | null;
  job: { title: string; company: string; description: string; url: string };
  tailored: TailoredResume | null;
  demoMode: boolean;
  statusMessage: string;
}

interface StoryContextValue extends StoryState {
  setStep: (s: StoryStep) => void;
  next: () => void;
  back: () => void;
  setResume: (r: StructuredResume | null) => void;
  setResumeFileName: (n: string | null) => void;
  setRawResumeText: (t: string | null) => void;
  setJob: (j: Partial<StoryState["job"]>) => void;
  setTailored: (t: TailoredResume | null) => void;
  setDemoMode: (v: boolean) => void;
  setStatusMessage: (m: string) => void;
  reset: () => void;
}

const STEPS: StoryStep[] = ["welcome", "upload", "review", "job", "tailor", "apply", "done"];

const defaultState: StoryState = {
  step: "welcome",
  resume: null,
  resumeFileName: null,
  rawResumeText: null,
  job: { title: "", company: "", description: "", url: "" },
  tailored: null,
  demoMode: false,
  statusMessage: "",
};

const StoryContext = createContext<StoryContextValue | null>(null);

export function StoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoryState>(defaultState);
  const patch = (p: Partial<StoryState>) => setState((prev) => ({ ...prev, ...p }));

  const value: StoryContextValue = {
    ...state,
    setStep: (step) => patch({ step }),
    next: () => {
      const i = STEPS.indexOf(state.step);
      if (i >= 0 && i < STEPS.length - 1) patch({ step: STEPS[i + 1] });
    },
    back: () => {
      const i = STEPS.indexOf(state.step);
      if (i > 0) patch({ step: STEPS[i - 1] });
    },
    setResume: (resume) => patch({ resume }),
    setResumeFileName: (resumeFileName) => patch({ resumeFileName }),
    setRawResumeText: (rawResumeText) => patch({ rawResumeText }),
    setJob: (j) => patch({ job: { ...state.job, ...j } }),
    setTailored: (tailored) => patch({ tailored }),
    setDemoMode: (demoMode) => patch({ demoMode }),
    setStatusMessage: (statusMessage) => patch({ statusMessage }),
    reset: () => setState(defaultState),
  };

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStory() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error("useStory must be used inside StoryProvider");
  return ctx;
}

export const STORY_STEPS = STEPS;
