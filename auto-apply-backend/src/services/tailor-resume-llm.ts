import { runLlmJson } from "@/lib/ai/workers-ai";
import type { StructuredResume } from "@/services/structure-resume";

export interface TailoredResumeResult {
  headline: string;
  summary: string;
  skills: string[];
  experience: { heading: string; bullets: string[] }[];
  education: { heading: string; bullets: string[] }[];
  change_summary: string[];
}

export interface TailorInput {
  resume: StructuredResume;
  job: { title: string; company?: string; description: string; url?: string };
}

export async function tailorResumeForJob(
  input: TailorInput,
  env: Pick<Env, "AI" | "DEMO_MODE">,
): Promise<{ data: TailoredResumeResult; demo: boolean }> {
  return runLlmJson<TailoredResumeResult>(env, {
    system:
      "You are a resume tailoring assistant. Rewrite the resume to better match the job. " +
      "Keep all truthful content — never invent employers, dates, or degrees. Prioritize relevant " +
      "skills, rewrite the summary to target the role, and adjust bullets to emphasize " +
      "relevant impact. Return ONLY valid JSON.",
    user: JSON.stringify({ job: input.job, resume: input.resume }),
    exampleOutput: {
      headline: "Senior Backend Engineer — [Target Role]",
      summary: "Backend engineer with X years targeting [company]. Strengths in [relevant].",
      skills: ["TypeScript", "Postgres", "AWS"],
      experience: [
        { heading: "Senior Engineer, Acme (2022-Present)", bullets: ["Impact 1", "Impact 2"] },
      ],
      education: [{ heading: "BS CS, State U", bullets: [] }],
      change_summary: [
        "Headline aligned to target role",
        "Prioritized TypeScript and Postgres in skills",
        "Rewrote summary to emphasize backend scale",
      ],
    },
    fallback: () => heuristicTailor(input),
  });
}

function heuristicTailor(input: TailorInput): TailoredResumeResult {
  const jobTokens = tokens(input.job.description + " " + input.job.title);
  const relevant = input.resume.skills.filter((s) => jobTokens.has(s.toLowerCase()));
  const other = input.resume.skills.filter((s) => !jobTokens.has(s.toLowerCase()));

  return {
    headline: input.job.title || input.resume.headline,
    summary:
      (input.resume.summary || "").slice(0, 220) +
      (relevant.length ? ` Emphasis: ${relevant.slice(0, 4).join(", ")}.` : ""),
    skills: [...relevant, ...other].slice(0, 20),
    experience: input.resume.experience,
    education: input.resume.education,
    change_summary: [
      `Headline set to "${input.job.title || input.resume.headline}"`,
      relevant.length
        ? `Prioritized ${relevant.slice(0, 3).join(", ")} in skills`
        : "Skill order preserved",
      "Content preserved — heuristic tailoring only (Workers AI unavailable)",
    ],
  };
}

function tokens(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/[^a-z0-9.+#-]+/).filter(Boolean),
  );
}
