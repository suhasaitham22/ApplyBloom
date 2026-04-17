import { runLlmJson } from "@/lib/ai/workers-ai";

export interface StructuredResumeSection {
  heading: string;
  bullets: string[];
}

export interface StructuredResume {
  full_name: string;
  headline: string;
  contact: { email: string; phone: string; location: string };
  summary: string;
  skills: string[];
  experience: StructuredResumeSection[];
  education: StructuredResumeSection[];
  confidence: number;
}

export async function structureResume(
  resumeText: string,
  env: Pick<Env, "AI" | "DEMO_MODE">,
): Promise<{ data: StructuredResume; demo: boolean }> {
  const trimmed = resumeText.trim().slice(0, 20000);
  return runLlmJson<StructuredResume>(env, {
    system:
      "You are a resume parser. Extract a structured resume from the raw text. " +
      "Group work history under Experience (one section per role) with achievement bullets. " +
      "Group degrees under Education. Never invent content. Return ONLY valid JSON.",
    user: trimmed,
    exampleOutput: {
      full_name: "Jane Doe",
      headline: "Senior Software Engineer",
      contact: { email: "jane@example.com", phone: "555-0100", location: "Remote" },
      summary: "Senior engineer with 8 years of backend experience.",
      skills: ["TypeScript", "React", "Postgres"],
      experience: [
        { heading: "Senior Engineer, Acme Corp (2022-Present)", bullets: ["Led TS migration", "Reduced p99 latency by 40%"] },
      ],
      education: [{ heading: "BS Computer Science, State U (2015)", bullets: [] }],
      confidence: 0.85,
    },
    fallback: () => heuristicStructure(trimmed),
  });
}

function heuristicStructure(text: string): StructuredResume {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0] : "";
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";
  const namePattern = new RegExp("^[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}$");
  const name = lines.find((l) => namePattern.test(l)) ?? (lines[0] ?? "");
  const roleRegex = new RegExp("(engineer|developer|manager|designer|analyst|lead|architect)", "i");
  const headline = lines.find((l) => roleRegex.test(l) && l !== name) ?? "";
  const skills = extractSkills(text);
  const { experience, education } = extractSections(lines);
  return {
    full_name: name,
    headline,
    contact: { email, phone, location: "" },
    summary: lines.slice(1, 3).join(" ").slice(0, 400),
    skills,
    experience,
    education,
    confidence: 0.5,
  };
}

const SKILL_VOCAB = [
  "javascript","typescript","python","go","rust","java","ruby","php",
  "react","next.js","vue","angular","node","express","django","fastapi",
  "postgres","mysql","redis","mongodb","dynamodb","kafka","elasticsearch",
  "aws","gcp","azure","cloudflare","supabase","docker","kubernetes","terraform",
  "graphql","rest","grpc","playwright","cypress","jest","vitest",
  "machine learning","llm","pytorch","tensorflow",
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return Array.from(new Set(SKILL_VOCAB.filter((s) => lower.includes(s))));
}

function extractSections(lines: string[]): {
  experience: StructuredResumeSection[];
  education: StructuredResumeSection[];
} {
  const experience: StructuredResumeSection[] = [];
  const education: StructuredResumeSection[] = [];
  let mode: "exp" | "edu" | null = null;
  let current: StructuredResumeSection | null = null;
  const flush = () => {
    if (current && mode) (mode === "exp" ? experience : education).push(current);
    current = null;
  };
  const expHeader = new RegExp("^(experience|work experience|employment)$", "i");
  const eduHeader = new RegExp("^(education|academic)$", "i");
  const yearRe = new RegExp("\\b(19|20)\\d{2}\\b");
  const degreeRe = new RegExp("(engineer|developer|manager|analyst|architect|lead|university|college|school|bachelor|master|phd)", "i");
  for (const raw of lines) {
    const line = raw.trim();
    if (expHeader.test(line)) { flush(); mode = "exp"; continue; }
    if (eduHeader.test(line)) { flush(); mode = "edu"; continue; }
    if (!mode) continue;
    const isHeading = yearRe.test(line) || (degreeRe.test(line) && line.length < 120);
    if (isHeading && (!current || current.bullets.length > 0)) {
      flush();
      current = { heading: line, bullets: [] };
    } else if (current) {
      current.bullets.push(line.replace(/^[-\u2022*]\s*/, ""));
    } else {
      current = { heading: line, bullets: [] };
    }
  }
  flush();
  if (experience.length === 0) {
    experience.push({ heading: "Experience", bullets: lines.slice(0, 6) });
  }
  return { experience, education };
}
