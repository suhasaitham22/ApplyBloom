export interface ParsedResumeProfile {
  full_name: string;
  email: string;
  phone: string;
  headline: string;
  skills: string[];
  years_experience: number;
  summary: string;
  roles: string[];
  education: string[];
  confidence: {
    overall: number;
    name: number;
    contact: number;
    skills: number;
    experience: number;
  };
}

const skillDictionary = [
  "javascript",
  "typescript",
  "python",
  "react",
  "next.js",
  "node",
  "postgres",
  "sql",
  "cloudflare",
  "supabase",
  "redis",
  "playwright",
  "docker",
  "kubernetes",
  "aws",
  "git",
  "graphql",
  "rest",
  "machine learning",
  "llm",
];

export async function parseResume(resumeText: string): Promise<ParsedResumeProfile> {
  const normalizedText = normalizeWhitespace(resumeText);
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const fullName = extractName(lines);
  const email = extractEmail(normalizedText);
  const phone = extractPhone(normalizedText);
  const skills = extractSkills(normalizedText);
  const roles = extractRoles(normalizedText);
  const education = extractEducation(normalizedText);
  const yearsExperience = extractYearsExperience(normalizedText, roles);
  const headline = extractHeadline(lines, skills, roles);
  const summary = extractSummary(normalizedText, headline, skills, yearsExperience);

  const confidence = buildConfidence({
    fullName,
    email,
    phone,
    skills,
    yearsExperience,
  });

  return {
    full_name: fullName,
    email,
    phone,
    headline,
    skills,
    years_experience: yearsExperience,
    summary,
    roles,
    education,
    confidence,
  };
}

function normalizeWhitespace(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ");
}

function extractName(lines: string[]) {
  const candidate = lines.find((line) => /^[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}$/.test(line));
  return candidate ?? "";
}

function extractEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? "";
}

function extractPhone(text: string) {
  const match = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  return match?.[0] ?? "";
}

function extractSkills(text: string) {
  const lowerText = text.toLowerCase();
  const detected = skillDictionary.filter((skill) => lowerText.includes(skill.toLowerCase()));
  return Array.from(new Set(detected));
}

function extractRoles(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.filter((line) =>
    /(engineer|developer|manager|analyst|architect|scientist|consultant|specialist|lead)/i.test(
      line,
    ),
  );
}

function extractEducation(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /(bachelor|master|phd|b\.s\.|m\.s\.|mba|computer science|electrical engineering)/i.test(line));
}

function extractYearsExperience(text: string, roles: string[]) {
  const explicit = text.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i);
  if (explicit) {
    return Number(explicit[1]);
  }

  const dateRanges = text.match(
    /(?:19|20)\d{2}\s*[-–]\s*(?:present|current|(?:19|20)\d{2})/gi,
  );

  if (!dateRanges || dateRanges.length === 0) {
    return Math.max(roles.length, 0);
  }

  return Math.max(dateRanges.length * 2, 0);
}

function extractHeadline(lines: string[], skills: string[], roles: string[]) {
  if (lines.length > 1 && lines[1]) {
    return lines[1];
  }

  if (roles.length > 0) {
    return roles[0];
  }

  if (skills.length > 0) {
    return `${skills[0]} professional`;
  }

  return "";
}

function extractSummary(text: string, headline: string, skills: string[], yearsExperience: number) {
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  if (firstSentence.length > 0 && firstSentence.length < 400) {
    return firstSentence;
  }

  const skillText = skills.length > 0 ? `Skills include ${skills.slice(0, 5).join(", ")}.` : "";
  const experienceText =
    yearsExperience > 0 ? `${yearsExperience} years of experience.` : "Experience not stated.";

  return [headline, skillText, experienceText].filter(Boolean).join(" ");
}

function buildConfidence(input: {
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  yearsExperience: number;
}) {
  const name = input.fullName ? 1 : 0;
  const contact = Number(Boolean(input.email)) * 0.6 + Number(Boolean(input.phone)) * 0.4;
  const skills = Math.min(input.skills.length / 5, 1);
  const experience = input.yearsExperience > 0 ? 1 : 0;
  const overall = Number(((name + contact + skills + experience) / 4).toFixed(2));

  return {
    overall,
    name,
    contact: Number(contact.toFixed(2)),
    skills: Number(skills.toFixed(2)),
    experience,
  };
}
