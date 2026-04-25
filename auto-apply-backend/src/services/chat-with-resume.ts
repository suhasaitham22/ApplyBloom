// Resume editing via natural language.
// - When an AI binding is available → Vercel AI SDK with proper tools
// - Otherwise → deterministic heuristic fallback (handles common intents)

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import { runChat, type LlmCallMeta } from "@/lib/ai/sdk";
import { PROMPTS } from "@/lib/prompts";
import type { StructuredResume, StructuredResumeSection } from "@/services/structure-resume";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatWithResumeInput {
  resume: StructuredResume;
  messages: ChatMessage[];
  instruction: string;
  job?: { title?: string; company?: string; description?: string; url?: string } | null;
  systemPromptOverride?: string | null;
}

export type ResumeOp =
  | { op: "replace_summary"; value: string }
  | { op: "replace_headline"; value: string }
  | { op: "set_skills"; value: string[] }
  | { op: "add_skills"; value: string[] }
  | { op: "remove_skills"; value: string[] }
  | { op: "rewrite_bullet"; section: "experience" | "education"; heading: string; index: number; value: string }
  | { op: "add_bullet"; section: "experience" | "education"; heading: string; value: string };

export interface ChatWithResumeResult {
  assistant_message: string;
  operations: ResumeOp[];
  thinking?: string;
  meta: LlmCallMeta;
}

// ============================================================
// AI SDK tools — the model decides when to call each
// ============================================================
function buildTools(): ToolSet {
  return {
    replace_summary: tool({
      description: "Replace the candidate's professional summary. Aim for 30–80 words targeting their field.",
      inputSchema: z.object({
        value: z.string().describe("New summary text"),
      }),
      execute: async ({ value }) => ({ ok: true, op: { op: "replace_summary", value } }),
    }),
    replace_headline: tool({
      description: "Replace the target role headline (e.g. 'Senior Backend Engineer').",
      inputSchema: z.object({ value: z.string() }),
      execute: async ({ value }) => ({ ok: true, op: { op: "replace_headline", value } }),
    }),
    add_skills: tool({
      description: "Add one or more new skills to the candidate's skill list.",
      inputSchema: z.object({
        skills: z.array(z.string()).describe("Skills to add"),
      }),
      execute: async ({ skills }) => ({ ok: true, op: { op: "add_skills", value: skills } }),
    }),
    remove_skills: tool({
      description: "Remove one or more skills from the candidate's skill list.",
      inputSchema: z.object({
        skills: z.array(z.string()),
      }),
      execute: async ({ skills }) => ({ ok: true, op: { op: "remove_skills", value: skills } }),
    }),
    rewrite_bullet: tool({
      description: "Rewrite a single achievement bullet to be stronger (start with action verb, include metrics).",
      inputSchema: z.object({
        section: z.enum(["experience", "education"]),
        heading: z.string().describe("Exact heading of the section containing the bullet"),
        index: z.number().int().min(0).describe("Zero-based index of the bullet to rewrite"),
        value: z.string().describe("New bullet text"),
      }),
      execute: async (input) => ({ ok: true, op: { op: "rewrite_bullet", ...input } }),
    }),
    add_bullet: tool({
      description: "Add a new achievement bullet to an existing experience or education section.",
      inputSchema: z.object({
        section: z.enum(["experience", "education"]),
        heading: z.string(),
        value: z.string().describe("New bullet — action verb first, include metric"),
      }),
      execute: async (input) => ({ ok: true, op: { op: "add_bullet", ...input } }),
    }),
  };
}

export async function chatWithResume(
  input: ChatWithResumeInput,
  env: import("@/lib/ai/sdk").AiEnv,
): Promise<ChatWithResumeResult> {
  // Build priming context block
  const contextParts: string[] = [];
  contextParts.push("CURRENT RESUME (JSON):\n```json\n" + JSON.stringify(input.resume, null, 2) + "\n```");
  if (input.job && (input.job.title || input.job.description)) {
    contextParts.push(
      "TARGET JOB:\n" +
        (input.job.title ? `Title: ${input.job.title}\n` : "") +
        (input.job.company ? `Company: ${input.job.company}\n` : "") +
        (input.job.url ? `URL: ${input.job.url}\n` : "") +
        (input.job.description ? `\nDescription:\n${input.job.description.slice(0, 4000)}` : ""),
    );
  }

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: contextParts.join("\n\n") },
    { role: "assistant", content: "Got it — I have your resume in view. What would you like to work on?" },
    ...input.messages,
    { role: "user", content: input.instruction },
  ];

  const system = input.systemPromptOverride?.trim()
    ? input.systemPromptOverride.trim()
    : PROMPTS.chat_resume.system;

  const { text, toolCalls, meta } = await runChat(env, {
    system,
    messages,
    tools: buildTools(),
    promptVersion: PROMPTS.chat_resume.version,
    fallback: () => {
      const fb = heuristicChat(input);
      return {
        text: fb.assistant_message,
        toolCalls: fb.operations.map((op) => ({ toolName: op.op, input: opToToolInput(op) })),
      };
    },
  });

  const operations: ResumeOp[] = toolCalls
    .map((tc) => toolInputToOp(tc.toolName, tc.input))
    .filter((o): o is ResumeOp => o !== null);

  // Llama-family models on Workers AI often return tool calls with NO accompanying text.
  // Synthesise a plain-English confirmation so the user sees what changed.
  const finalText = text?.trim() || synthesiseToolSummary(operations);

  return {
    assistant_message: finalText,
    operations,
    meta,
  };
}

function synthesiseToolSummary(ops: ResumeOp[]): string {
  if (ops.length === 0) {
    return "I heard you, but didn't have anything specific to change. Try: 'tighten my summary', 'add Python to skills', or 'rewrite my Acme bullets'.";
  }
  const parts: string[] = [];
  for (const op of ops) {
    switch (op.op) {
      case "replace_summary": parts.push("rewrote your professional summary"); break;
      case "replace_headline": parts.push(`set your headline to "${op.value}"`); break;
      case "add_skills": parts.push(`added ${op.value.length} skill${op.value.length === 1 ? "" : "s"}: ${op.value.join(", ")}`); break;
      case "remove_skills": parts.push(`removed ${op.value.length} skill${op.value.length === 1 ? "" : "s"}: ${op.value.join(", ")}`); break;
      case "set_skills": parts.push(`set your skills list (${op.value.length} items)`); break;
      case "rewrite_bullet": parts.push(`rewrote a bullet at ${op.heading.split(",")[0]}`); break;
      case "add_bullet": parts.push(`added a bullet to ${op.heading.split(",")[0]}`); break;
    }
  }
  const head = parts.length === 1 ? `Done — ${parts[0]}.` : `Done — ${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}.`;
  return head + " Check the preview on the left; say 'undo' if you want to roll back.";
}

function opToToolInput(op: ResumeOp): Record<string, unknown> {
  switch (op.op) {
    case "replace_summary":
    case "replace_headline":
      return { value: op.value };
    case "set_skills":
    case "add_skills":
    case "remove_skills":
      return { skills: op.value };
    case "rewrite_bullet":
      return { section: op.section, heading: op.heading, index: op.index, value: op.value };
    case "add_bullet":
      return { section: op.section, heading: op.heading, value: op.value };
  }
}

function toolInputToOp(name: string, raw: unknown): ResumeOp | null {
  const input = raw as Record<string, unknown>;
  try {
    switch (name) {
      case "replace_summary": return { op: "replace_summary", value: String(input.value ?? "") };
      case "replace_headline": return { op: "replace_headline", value: String(input.value ?? "") };
      case "add_skills": return { op: "add_skills", value: Array.isArray(input.skills) ? input.skills.map(String) : [] };
      case "remove_skills": return { op: "remove_skills", value: Array.isArray(input.skills) ? input.skills.map(String) : [] };
      case "rewrite_bullet": return {
        op: "rewrite_bullet",
        section: (input.section as "experience" | "education") ?? "experience",
        heading: String(input.heading ?? ""),
        index: Number(input.index ?? 0),
        value: String(input.value ?? ""),
      };
      case "add_bullet": return {
        op: "add_bullet",
        section: (input.section as "experience" | "education") ?? "experience",
        heading: String(input.heading ?? ""),
        value: String(input.value ?? ""),
      };
      default: return null;
    }
  } catch {
    return null;
  }
}

/**
 * Chat when no resume is attached yet. General career Q&A.
 */
export async function chatWithoutResume(
  input: {
    messages: ChatMessage[];
    instruction: string;
    job?: { title?: string; company?: string; description?: string; url?: string } | null;
    systemPromptOverride?: string | null;
  },
  env: import("@/lib/ai/sdk").AiEnv,
): Promise<{ assistant_message: string; meta: LlmCallMeta }> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (input.job && (input.job.title || input.job.description)) {
    messages.push({
      role: "user",
      content:
        "Context — TARGET JOB:\n" +
        (input.job.title ? `Title: ${input.job.title}\n` : "") +
        (input.job.company ? `Company: ${input.job.company}\n` : "") +
        (input.job.description ? `\nDescription:\n${input.job.description.slice(0, 4000)}` : ""),
    });
    messages.push({ role: "assistant", content: "Got it — I have the job context. What would you like to know?" });
  }
  messages.push(...input.messages);
  messages.push({ role: "user", content: input.instruction });

  const system = input.systemPromptOverride?.trim()
    ? input.systemPromptOverride.trim()
    : PROMPTS.general_chat.system;

  const { text, meta } = await runChat(env, {
    system,
    messages,
    promptVersion: PROMPTS.general_chat.version,
    fallback: () => ({
      text: heuristicNoResumeReply(input.instruction, input.job ?? null),
    }),
  });

  return {
    assistant_message: text || "(no response)",
    meta,
  };
}

function heuristicNoResumeReply(instruction: string, job: { title?: string } | null): string {
  const lower = instruction.toLowerCase().trim();
  if (/^(hi|hello|hey|yo|howdy|sup)\b/.test(lower)) {
    return job?.title
      ? `Hi! I see you're looking at ${job.title}. Upload your resume and I'll help tailor it for this role.`
      : "Hi! Upload your resume (click 'Add resume' above) and I'll help you polish it, tailor it to jobs, and improve your ATS score.";
  }
  if (/(resume|upload|cv)/i.test(lower)) {
    return "Click 'Add resume' at the top to upload a PDF, DOCX, or TXT. I parse it and then we can iterate together — rewrite bullets, add skills, tailor to a job, etc.";
  }
  if (/(how|what|why|advice|tip)/i.test(lower)) {
    return "Happy to help! Upload your resume first so I can give specific advice rather than generic tips. Once uploaded, ask me things like 'tighten my summary' or 'quantify my bullets'.";
  }
  return "Upload a resume first (click 'Add resume' above), then I can help you edit it, improve ATS score, and tailor it to a job.";
}

// ============================================================
// Heuristic fallback — runs when AI binding absent (demo / CI)
// ============================================================
function heuristicChat(input: ChatWithResumeInput): { assistant_message: string; operations: ResumeOp[] } {
  const raw = input.instruction.trim();
  const lower = raw.toLowerCase();
  const r = input.resume;

  if (/^(hi|hey|hello|yo|howdy)\b/i.test(raw)) {
    return {
      assistant_message: `Hi! I see your resume (${r.skills?.length ?? 0} skills, ${r.experience?.length ?? 0} roles). Try: "tighten my summary", "add Python", "quantify my Acme bullets", or "improve my ATS score".`,
      operations: [],
    };
  }

  if (/(what|show|tell).{0,20}(resume|summary|skills|experience)/i.test(raw)) {
    return { assistant_message: summariseResume(r), operations: [] };
  }

  if (/(shorter|concise|tighten|trim).{0,20}(summary|intro)/i.test(lower)) {
    const sentences = (r.summary || "").split(/(?<=[.!?])\s+/).filter(Boolean);
    const value = sentences.slice(0, 2).join(" ").slice(0, 250);
    return {
      assistant_message: value ? "Tightened your summary to two sentences." : "I couldn't find a summary to tighten.",
      operations: value ? [{ op: "replace_summary", value }] : [],
    };
  }

  if (/(longer|more detail|expand).{0,20}(summary|intro)/i.test(lower)) {
    const value = buildSummary(r);
    return {
      assistant_message: "Expanded the summary with skills + role count.",
      operations: value ? [{ op: "replace_summary", value }] : [],
    };
  }

  const headlineMatch = raw.match(/(?:change|set|update).*(?:headline|title).*(?:to|as)\s+"?([^"]+?)"?$/i);
  if (headlineMatch) {
    return {
      assistant_message: `Updated your headline to "${headlineMatch[1].trim()}".`,
      operations: [{ op: "replace_headline", value: headlineMatch[1].trim() }],
    };
  }

  const addSkillMatch = raw.match(/\badd\s+(.+?)\s+(?:to\s+(?:my\s+)?skills|skill)?$/i);
  if (addSkillMatch && /^add\s/i.test(raw)) {
    const items = addSkillMatch[1].split(/,\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
    if (items.length > 0) return {
      assistant_message: `Added ${items.join(", ")} to your skills.`,
      operations: [{ op: "add_skills", value: items }],
    };
  }

  const rmSkillMatch = raw.match(/\bremove\s+(.+?)\s+from\s+(?:my\s+)?skills/i);
  if (rmSkillMatch) {
    const items = rmSkillMatch[1].split(/,\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
    return {
      assistant_message: `Removed ${items.join(", ")} from your skills.`,
      operations: [{ op: "remove_skills", value: items }],
    };
  }

  if (/\b(improve|optimize|optimise|boost).{0,30}(ats|score)|\b(quantify|metrics|add numbers)\b/i.test(lower)) {
    const ops: ResumeOp[] = [];
    const updates: string[] = [];
    const exp = r.experience ?? [];
    for (const e of exp) {
      e.bullets.forEach((b, idx) => {
        if (!/\d/.test(b) && b.length > 10) {
          const improved = addMetricPlaceholder(b);
          if (improved !== b) ops.push({ op: "rewrite_bullet", section: "experience", heading: e.heading, index: idx, value: improved });
        }
      });
    }
    const words = (r.summary || "").split(/\s+/).length;
    if (words < 30) {
      const value = buildSummary(r);
      if (value) { ops.push({ op: "replace_summary", value }); updates.push("expanded summary"); }
    }
    if ((r.skills?.length ?? 0) < 10) {
      const sugg = suggestSkillsFromHeadline(r.headline || "", r.skills ?? []);
      if (sugg.length > 0) { ops.push({ op: "add_skills", value: sugg }); updates.push(`added ${sugg.length} skill keywords`); }
    }
    if (ops.length === 0) return { assistant_message: "Your resume already looks strong! Try: 'rewrite my Acme bullets' or 'add a project'.", operations: [] };
    const metrics = ops.filter((o) => o.op === "rewrite_bullet").length;
    if (metrics > 0) updates.unshift(`flagged ${metrics} bullets for quantification`);
    return { assistant_message: `ATS pass: ${updates.join("; ")}. Review the changes in the preview.`, operations: ops };
  }

  const rewriteMatch = raw.match(/rewrite.*(?:bullets?|points?).*(?:at|for|in)\s+([\w .&-]+)/i);
  if (rewriteMatch) {
    const target = rewriteMatch[1].trim().toLowerCase();
    const exp = r.experience ?? [];
    const match = exp.find((e) => e.heading.toLowerCase().includes(target));
    if (match) {
      const ops: ResumeOp[] = match.bullets.map((b, idx) => ({
        op: "rewrite_bullet", section: "experience", heading: match.heading, index: idx, value: addMetricPlaceholder(b),
      }));
      return { assistant_message: `Rewrote ${ops.length} bullets at ${match.heading.split(",")[0]} with metric placeholders.`, operations: ops };
    }
    return { assistant_message: `I couldn't find "${rewriteMatch[1]}" in your experience.`, operations: [] };
  }

  return {
    assistant_message: `I can see your resume (${r.skills?.length ?? 0} skills, ${r.experience?.length ?? 0} roles). Try: "improve my ATS score", "tighten my summary", "add AWS to skills", or "rewrite my Acme bullets".`,
    operations: [],
  };
}

function summariseResume(r: StructuredResume): string {
  const parts: string[] = [];
  if (r.full_name) parts.push(`${r.full_name}${r.headline ? ` · ${r.headline}` : ""}`);
  if (r.summary) parts.push(`Summary: "${r.summary.slice(0, 160)}${r.summary.length > 160 ? "…" : ""}"`);
  if (r.skills?.length) parts.push(`Skills: ${r.skills.slice(0, 10).join(", ")}${r.skills.length > 10 ? ` (+${r.skills.length - 10})` : ""}`);
  if (r.experience?.length) parts.push(`Experience: ${r.experience.map((e) => e.heading.split(",")[0]).slice(0, 4).join(", ")}`);
  return parts.join("\n");
}

function buildSummary(r: StructuredResume): string {
  const role = r.headline || "Senior professional";
  const topSkills = (r.skills ?? []).slice(0, 5).join(", ");
  const firstExp = r.experience?.[0]?.heading.split(",")[0] || "";
  return `${role} with proven impact shipping production systems${firstExp ? ` at ${firstExp}` : ""}. Experienced in ${topSkills || "modern technologies"} with a track record of delivering measurable outcomes across the stack.`.slice(0, 400);
}

function addMetricPlaceholder(bullet: string): string {
  const b = bullet.trim();
  if (/\d/.test(b)) return b;
  if (/^(led|built|shipped|reduced|increased)/i.test(b)) return b + " (add metric, e.g. 30% / 5k users / 2x faster)";
  return "Delivered " + b.charAt(0).toLowerCase() + b.slice(1) + " (add metric)";
}

function suggestSkillsFromHeadline(headline: string, existing: string[]): string[] {
  const lower = headline.toLowerCase();
  const existingLower = new Set(existing.map((s) => s.toLowerCase()));
  const buckets: Record<string, string[]> = {
    backend: ["PostgreSQL", "Redis", "Docker", "Kubernetes", "CI/CD", "REST", "GraphQL"],
    frontend: ["React", "TypeScript", "Next.js", "Tailwind", "Vitest", "Accessibility"],
    fullstack: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "GraphQL"],
    data: ["SQL", "Python", "Airflow", "dbt", "Snowflake", "Pandas"],
    ml: ["Python", "PyTorch", "TensorFlow", "scikit-learn", "SQL", "AWS"],
    product: ["JIRA", "Figma", "A/B Testing", "SQL", "Roadmapping"],
    designer: ["Figma", "Sketch", "Prototyping", "User Research", "Accessibility"],
  };
  let bucket: string[] = [];
  for (const key of Object.keys(buckets)) { if (lower.includes(key)) { bucket = buckets[key]; break; } }
  if (bucket.length === 0) bucket = ["Agile", "Git", "Communication"];
  return bucket.filter((s) => !existingLower.has(s.toLowerCase())).slice(0, 5);
}

// ============================================================
// Apply operations to a structured resume
// ============================================================
export function applyOperations(resume: StructuredResume, ops: ResumeOp[]): StructuredResume {
  const out: StructuredResume = JSON.parse(JSON.stringify(resume));
  for (const op of ops) {
    switch (op.op) {
      case "replace_summary": out.summary = op.value; break;
      case "replace_headline": out.headline = op.value; break;
      case "set_skills": out.skills = op.value; break;
      case "add_skills": {
        const lowerExisting = new Set(out.skills.map((s) => s.toLowerCase()));
        for (const s of op.value) if (!lowerExisting.has(s.toLowerCase())) out.skills.push(s);
        break;
      }
      case "remove_skills": {
        const rm = new Set(op.value.map((s) => s.toLowerCase()));
        out.skills = out.skills.filter((s) => !rm.has(s.toLowerCase()));
        break;
      }
      case "rewrite_bullet": {
        const list: StructuredResumeSection[] = op.section === "experience" ? out.experience : out.education;
        const sec = list.find((s) => s.heading === op.heading);
        if (sec && sec.bullets[op.index] !== undefined) sec.bullets[op.index] = op.value;
        break;
      }
      case "add_bullet": {
        const list: StructuredResumeSection[] = op.section === "experience" ? out.experience : out.education;
        const sec = list.find((s) => s.heading === op.heading);
        if (sec) sec.bullets.push(op.value);
        break;
      }
    }
  }
  return out;
}
