export interface TailoredResumeSection {
  section_name: string;
  lines: string[];
}

export interface TailoredResumeDocument {
  headline: string;
  summary: string;
  skills: string[];
  sections: TailoredResumeSection[];
  change_summary: string[];
}

interface ProfileLike {
  full_name?: string;
  headline?: string;
  skills?: string[];
  years_experience?: number;
  summary?: string;
  roles?: string[];
  education?: string[];
}

interface JobLike {
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  remote?: boolean;
}

export async function tailorResume(
  profile: ProfileLike,
  job: JobLike,
): Promise<TailoredResumeDocument> {
  const targetHeadline = buildHeadline(profile, job);
  const targetSummary = buildSummary(profile, job);
  const targetSkills = prioritizeSkills(profile.skills ?? [], job.description ?? "");
  const sections = buildSections(profile, job);
  const changeSummary = buildChangeSummary(profile, job, targetSkills, targetHeadline);

  return {
    headline: targetHeadline,
    summary: targetSummary,
    skills: targetSkills,
    sections,
    change_summary: changeSummary,
  };
}

function buildHeadline(profile: ProfileLike, job: JobLike) {
  return job.title ?? profile.headline ?? "Professional Profile";
}

function buildSummary(profile: ProfileLike, job: JobLike) {
  const baseSummary = profile.summary?.trim() ?? "";
  const jobFocus = job.description ? summarizeJobFocus(job.description) : "";
  const experience = profile.years_experience ? `${profile.years_experience} years of experience.` : "";

  return [baseSummary, jobFocus, experience].filter(Boolean).join(" ");
}

function prioritizeSkills(skills: string[], jobDescription: string) {
  const jobTokens = new Set(
    jobDescription
      .toLowerCase()
      .split(/[^a-zA-Z0-9.+#-]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );

  const relevant = skills.filter((skill) => jobTokens.has(skill.toLowerCase()));
  const remaining = skills.filter((skill) => !jobTokens.has(skill.toLowerCase()));

  return [...relevant, ...remaining];
}

function buildSections(profile: ProfileLike, job: JobLike): TailoredResumeSection[] {
  const roleLines = (profile.roles ?? []).map((role) => simplifyRoleLine(role, job));
  const educationLines = profile.education ?? [];

  return [
    {
      section_name: "Experience",
      lines: roleLines,
    },
    {
      section_name: "Education",
      lines: educationLines,
    },
  ];
}

function simplifyRoleLine(role: string, job: JobLike) {
  if (!job.title) {
    return role;
  }

  if (/engineer|developer|architect/i.test(job.title)) {
    return role;
  }

  return role;
}

function summarizeJobFocus(description: string) {
  const keywords = [
    "backend",
    "frontend",
    "automation",
    "typescript",
    "python",
    "postgres",
    "redis",
    "cloudflare",
    "supabase",
    "playwright",
  ];

  const matches = keywords.filter((keyword) => description.toLowerCase().includes(keyword));
  if (matches.length === 0) {
    return "";
  }

  return `Targeting ${matches.slice(0, 4).join(", ")} work.`;
}

function buildChangeSummary(
  profile: ProfileLike,
  job: JobLike,
  skills: string[],
  headline: string,
) {
  const changes: string[] = [];

  if (headline && headline !== profile.headline) {
    changes.push(`Headline aligned to ${headline}`);
  }

  if (skills.length > 0) {
    changes.push(`Reordered skills to emphasize ${skills.slice(0, 3).join(", ")}`);
  }

  if (job.title) {
    changes.push(`Focused resume on ${job.title} responsibilities`);
  }

  return changes;
}

