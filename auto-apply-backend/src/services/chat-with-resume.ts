import { runLlmJson } from "@/lib/ai/workers-ai";
import type { StructuredResume } from "@/services/structure-resume";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatWithResumeInput {
  resume: StructuredResume;
  messages: ChatMessage[];
  /** User's latest instruction, e.g. "make the summary more concise". */
  instruction: string;
}

export interface ChatWithResumeResult {
  assistant_message: string;
  updated_resume: StructuredResume | null;
  operations: Array<
    | { op: "replace_summary"; value: string }
    | { op: "replace_headline"; value: string }
    | { op: "set_skills"; value: string[] }
    | { op: "rewrite_bullet"; section: "experience" | "education"; heading: string; index: number; value: string }
  >;
}

export async function chatWithResume(
  input: ChatWithResumeInput,
  env: Pick<Env, "AI" | "DEMO_MODE">,
): Promise<{ data: ChatWithResumeResult; demo: boolean }> {
  return runLlmJson<ChatWithResumeResult>(env, {
    system:
      "You help the user iterate on their resume via chat. Answer conversationally in " +
      "assistant_message and, when the user asks for a change, emit structured operations " +
      "the editor can apply. Never invent employers, dates, or degrees. Return ONLY JSON.",
    user: JSON.stringify(input),
    exampleOutput: {
      assistant_message: "I tightened the summary to two sentences.",
      updated_resume: null,
      operations: [{ op: "replace_summary", value: "New concise summary." }],
    },
    fallback: () => heuristicChat(input),
  });
}

function heuristicChat(input: ChatWithResumeInput): ChatWithResumeResult {
  const lower = input.instruction.toLowerCase();

  if (lower.includes("shorter") || lower.includes("concise") || lower.includes("tighten")) {
    const value = input.resume.summary.split(/(?<=\.)\s+/).slice(0, 2).join(" ");
    return {
      assistant_message: "Tightened your summary to the first two sentences.",
      updated_resume: null,
      operations: [{ op: "replace_summary", value }],
    };
  }
  if (lower.includes("headline")) {
    return {
      assistant_message: `Headline kept as "${input.resume.headline}" — Workers AI is unavailable so I can only apply explicit edits.`,
      updated_resume: null,
      operations: [],
    };
  }
  return {
    assistant_message:
      "I'm in heuristic mode (Workers AI unavailable). Try: 'make the summary shorter' or " +
      "'reorder skills to emphasize X'.",
    updated_resume: null,
    operations: [],
  };
}
