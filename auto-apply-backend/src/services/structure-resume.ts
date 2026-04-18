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
      "You are an ATS-focused resume parser. Extract a structured, ATS-friendly resume from the raw text. " +
      "Group work history under Experience (one section per role) with achievement bullets starting with strong action verbs " +
      "(Led, Built, Shipped, Reduced, Increased, Launched, Designed, Architected, Scaled, Delivered). " +
      "Preserve quantified metrics (percentages, dollar amounts, user counts). " +
      "Group degrees under Education. Extract a 30–80 word professional summary targeting the candidate's field. " +
      "Extract 10+ skills as individual keywords. Never invent content. Return ONLY valid JSON.",
    user: trimmed,
    exampleOutput: {
      full_name: "Jane Doe",
      headline: "Senior Backend Engineer",
      contact: { email: "jane@example.com", phone: "555-0100", location: "Austin, TX" },
      summary: "Senior backend engineer with 8+ years building high-scale distributed systems. Led the TypeScript migration at Acme, reducing p99 latency 40% and shipping reliability improvements across 4 product teams. Experienced in Go, Postgres, Kafka, and AWS.",
      skills: ["TypeScript", "Go", "Python", "Postgres", "Kafka", "AWS", "Kubernetes", "Docker", "Terraform", "GraphQL"],
      experience: [
        { heading: "Senior Engineer, Acme Corp (2022 — Present)", bullets: ["Led TypeScript migration across 4 teams, reducing bugs 60%", "Reduced p99 latency by 40% via query optimization", "Shipped real-time analytics pipeline processing 10M events/day"] },
      ],
      education: [{ heading: "BS Computer Science, State University (2015)", bullets: [] }],
      confidence: 0.9,
    },
    fallback: () => heuristicStructure(trimmed),
  });
}

// ============================================================
// Heuristic fallback — produces ATS-friendly output even without LLM
// ============================================================

const LOCATION_RE = /\b([A-Z][a-zA-Z]+(?:[\s.-][A-Z][a-zA-Z]+)*),\s*([A-Z]{2}|[A-Z][a-zA-Z]+)\b/;
const REMOTE_RE = /\b(remote|worldwide|anywhere)\b/i;

const ROLE_KEYWORDS = [
  "engineer","developer","manager","designer","analyst","lead","architect","scientist",
  "director","consultant","founder","specialist","researcher","product","marketing","designer",
];

const ACTION_VERBS = [
  "Led","Built","Shipped","Designed","Architected","Migrated","Reduced","Increased","Launched",
  "Drove","Owned","Scaled","Automated","Implemented","Delivered","Spearheaded","Established",
  "Developed","Created","Optimized","Streamlined","Coordinated","Mentored","Managed",
];

const SKILL_VOCAB = [
  "JavaScript","TypeScript","Python","Go","Rust","Java","Ruby","PHP","Swift","Kotlin","Scala","C++","C#",
  "React","Next.js","Vue","Angular","Svelte","Node.js","Express","Nest.js","Django","FastAPI","Flask","Rails","Spring",
  "Postgres","MySQL","Redis","MongoDB","DynamoDB","Kafka","RabbitMQ","Elasticsearch","Cassandra","ClickHouse",
  "AWS","GCP","Azure","Cloudflare","Supabase","Vercel","Docker","Kubernetes","Terraform","Ansible","CloudFormation",
  "GraphQL","REST","gRPC","WebSockets","OAuth","JWT",
  "Playwright","Cypress","Jest","Vitest","Selenium","Puppeteer",
  "Machine Learning","LLM","PyTorch","TensorFlow","Pandas","NumPy","scikit-learn","Jupyter",
  "Figma","Sketch","Adobe XD","Photoshop","Illustrator",
  "Agile","Scrum","Kanban","JIRA","Confluence","Git","GitHub","GitLab","CI/CD",
];

function heuristicStructure(text: string): StructuredResume {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lowerText = text.toLowerCase();

  // Contact
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0] : "";
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";
  const locMatch = text.match(LOCATION_RE);
  const location = locMatch ? locMatch[0] : (REMOTE_RE.test(text) ? "Remote" : "");

  // Name — first line with 2+ capitalized words, not an email/URL
  const namePattern = /^[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3}$/;
  const name = lines.slice(0, 6).find((l) => namePattern.test(l) && !/[@/]/.test(l)) ?? lines[0] ?? "";

  // Headline — first line after name that mentions a role
  const roleRe = new RegExp(`\\b(${ROLE_KEYWORDS.join("|")})\\b`, "i");
  const headline = lines.slice(0, 8).find((l) => l !== name && roleRe.test(l) && l.length < 120) ?? "";

  // Skills — from vocab + capitalized tokens that look like tech
  const foundSkills = new Set<string>();
  for (const skill of SKILL_VOCAB) {
    if (new RegExp(`\\b${skill.replace(/[.+]/g, "\\$&")}\\b`, "i").test(text)) {
      foundSkills.add(skill);
    }
  }
  const skills = Array.from(foundSkills);

  // Sections
  const { summary, experience, education } = extractSections(lines, name, headline);

  // If summary is empty, synthesize from headline + skills + years of experience
  let finalSummary = summary;
  if (!finalSummary || finalSummary.split(/\s+/).length < 20) {
    const years = guessYearsOfExperience(text);
    const topSkills = skills.slice(0, 6).join(", ");
    const roleLabel = headline || ROLE_KEYWORDS.find((k) => lowerText.includes(k)) || "Professional";
    finalSummary = [
      `${roleLabel}${years ? ` with ${years}+ years` : ""} delivering production systems across the stack.`,
      topSkills ? `Experienced in ${topSkills}.` : "",
      experience.length >= 1 ? `Proven track record shipping impact at ${experience[0].heading.split(",")[1]?.trim() || experience[0].heading}.` : "",
    ].filter(Boolean).join(" ").slice(0, 500);
  }

  // Upgrade bullets — prefix with action verb if missing
  for (const sec of experience) {
    sec.bullets = sec.bullets.map((b) => upgradeBullet(b));
  }

  const confidence = scoreConfidence({ name, email, skills, experience, education });

  return {
    full_name: name,
    headline,
    contact: { email, phone, location },
    summary: finalSummary,
    skills,
    experience,
    education,
    confidence,
  };
}

function guessYearsOfExperience(text: string): number {
  const years = Array.from(text.matchAll(/\b(19|20)\d{2}\b/g)).map((m) => parseInt(m[0], 10));
  if (years.length < 2) return 0;
  const min = Math.min(...years);
  const current = new Date().getFullYear();
  const diff = current - min;
  return diff >= 1 && diff <= 40 ? diff : 0;
}

function upgradeBullet(b: string): string {
  const trimmed = b.replace(/^[-•*]\s*/, "").trim();
  if (!trimmed) return trimmed;
  const firstWord = trimmed.split(/\s+/)[0];
  const startsWithAction = ACTION_VERBS.some((v) => v.toLowerCase() === firstWord.toLowerCase());
  if (startsWithAction) return trimmed;
  // Capitalize first letter; if it starts with a weak word, prefix "Delivered"
  const weakStart = /^(was|did|worked|responsible|helped|supported)\b/i;
  if (weakStart.test(trimmed)) {
    return "Delivered " + trimmed.replace(weakStart, "").trim();
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function scoreConfidence(d: { name: string; email: string; skills: string[]; experience: StructuredResumeSection[]; education: StructuredResumeSection[] }): number {
  let c = 0.4;
  if (d.name) c += 0.1;
  if (d.email) c += 0.1;
  if (d.skills.length >= 5) c += 0.15;
  if (d.skills.length >= 10) c += 0.05;
  if (d.experience.length >= 1) c += 0.1;
  if (d.experience.some((e) => e.bullets.length >= 3)) c += 0.1;
  return Math.min(1, c);
}

function extractSections(lines: string[], name: string, headline: string): {
  summary: string;
  experience: StructuredResumeSection[];
  education: StructuredResumeSection[];
} {
  const experience: StructuredResumeSection[] = [];
  const education: StructuredResumeSection[] = [];
  let summary = "";
  let mode: "exp" | "edu" | "sum" | null = null;
  let current: StructuredResumeSection | null = null;

  const flush = () => {
    if (current && (mode === "exp" || mode === "edu")) {
      (mode === "exp" ? experience : education).push(current);
    }
    current = null;
  };

  const sumHeader = /^(summary|professional summary|profile|about|objective)$/i;
  const expHeader = /^(experience|work experience|professional experience|employment|career)$/i;
  const eduHeader = /^(education|academic|qualifications)$/i;
  const skillsHeader = /^(skills|technical skills|core skills|competencies)$/i;
  const otherHeader = /^(projects?|certifications?|awards?|publications?|languages?|interests?|references?|volunteer)$/i;

  const yearRe = /\b(19|20)\d{2}\b/;
  const roleRe = /\b(engineer|developer|manager|designer|analyst|lead|architect|director|consultant|intern|scientist)\b/i;
  const bulletRe = /^[-•*]\s+/;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === name || line === headline) continue;

    if (sumHeader.test(line)) { flush(); mode = "sum"; continue; }
    if (expHeader.test(line)) { flush(); mode = "exp"; continue; }
    if (eduHeader.test(line)) { flush(); mode = "edu"; continue; }
    if (skillsHeader.test(line) || otherHeader.test(line)) { flush(); mode = null; continue; }

    if (mode === "sum") {
      summary = (summary + " " + line).trim();
      continue;
    }
    if (!mode) continue;

    const isHeading =
      bulletRe.test(line) === false &&
      (yearRe.test(line) || (roleRe.test(line) && line.length < 140));

    if (isHeading && (!current || current.bullets.length > 0 || current.heading !== line)) {
      flush();
      current = { heading: line, bullets: [] };
    } else if (current) {
      current.bullets.push(line.replace(bulletRe, ""));
    } else {
      current = { heading: line, bullets: [] };
    }
  }
  flush();

  if (experience.length === 0 && lines.length > 5) {
    // Best-effort: use middle section as a single experience block
    experience.push({ heading: "Experience", bullets: lines.slice(Math.floor(lines.length / 3), Math.floor((lines.length * 2) / 3)).slice(0, 6) });
  }
  return { summary: summary.slice(0, 600), experience, education };
}
