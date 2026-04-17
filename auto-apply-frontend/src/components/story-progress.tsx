"use client";

import { motion } from "framer-motion";
import { STORY_STEPS, type StoryStep, useStory } from "@/lib/story-context";

const LABELS: Record<StoryStep, string> = {
  welcome: "Welcome",
  upload: "Upload",
  review: "Review",
  job: "Job",
  tailor: "Tailor",
  apply: "Apply",
  done: "Done",
};

export function StoryProgress() {
  const { step } = useStory();
  const currentIndex = STORY_STEPS.indexOf(step);

  return (
    <div className="mx-auto max-w-4xl px-6 pt-6">
      <ol className="flex items-center justify-between gap-2">
        {STORY_STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center gap-2">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: done ? "#10b981" : active ? "#6366f1" : "#e5e7eb",
                    scale: active ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                >
                  {done ? "✓" : i + 1}
                </motion.div>
                {i < STORY_STEPS.length - 1 && (
                  <motion.div
                    initial={false}
                    animate={{ backgroundColor: done ? "#10b981" : "#e5e7eb" }}
                    transition={{ duration: 0.4 }}
                    className="h-0.5 flex-1"
                  />
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  active ? "text-indigo-600" : done ? "text-emerald-600" : "text-neutral-400"
                }`}
              >
                {LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
