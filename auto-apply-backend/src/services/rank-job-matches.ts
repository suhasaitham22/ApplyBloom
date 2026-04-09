export interface RankedJobMatch {
  job_id: string;
  score: number;
  rank: number;
  reason: string;
}

export interface CandidateProfileLike {
  headline?: string;
  skills?: string[];
  location_preferences?: string[];
  years_experience?: number;
  summary?: string;
}

export interface JobLike {
  id: string;
  title: string;
  company?: string;
  location?: string;
  remote?: boolean;
  description?: string;
  raw_payload?: Record<string, unknown>;
}

export async function rankJobMatches(
  profile: CandidateProfileLike | string,
  jobs: JobLike[],
): Promise<RankedJobMatch[]> {
  const normalizedProfile = normalizeProfile(profile);
  const scored = jobs.map((job) => scoreJob(normalizedProfile, job));

  return scored
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      job_id: item.job.id,
      score: roundScore(item.score),
      rank: index + 1,
      reason: item.reason,
    }));
}

function normalizeProfile(profile: CandidateProfileLike | string): CandidateProfileLike {
  if (typeof profile === "string") {
    return {
      headline: profile,
      skills: [],
      location_preferences: [],
      years_experience: 0,
      summary: "",
    };
  }

  return {
    headline: profile.headline ?? "",
    skills: profile.skills ?? [],
    location_preferences: profile.location_preferences ?? [],
    years_experience: profile.years_experience ?? 0,
    summary: profile.summary ?? "",
  };
}

function scoreJob(profile: CandidateProfileLike, job: JobLike) {
  const profileText = [
    profile.headline,
    profile.summary,
    ...(profile.skills ?? []),
    ...(profile.location_preferences ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const jobText = `${job.title} ${job.company ?? ""} ${job.location ?? ""} ${job.description ?? ""}`.toLowerCase();

  const skillOverlap = countOverlap(profile.skills ?? [], tokenizeJob(jobText));
  const titleOverlap = overlapScore(profile.headline ?? "", job.title);
  const locationMatch = locationScore(profile.location_preferences ?? [], job.location ?? "", job.remote ?? false);
  const experienceMatch = experienceScore(profile.years_experience ?? 0, job.description ?? "");
  const summaryMatch = lexicalSimilarity(profileText, jobText) * 0.25;

  const totalScore = skillOverlap * 0.45 + titleOverlap * 0.2 + locationMatch * 0.15 + experienceMatch * 0.1 + summaryMatch;

  return {
    job,
    score: totalScore,
    reason: buildReason({
      skillOverlap,
      titleOverlap,
      locationMatch,
      experienceMatch,
      summaryMatch,
    }),
  };
}

function tokenizeJob(text: string) {
  return text
    .split(/[^a-zA-Z0-9.+#-]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function countOverlap(profileSkills: string[], jobTokens: string[]) {
  if (profileSkills.length === 0 || jobTokens.length === 0) {
    return 0;
  }

  const jobSet = new Set(jobTokens);
  const matches = profileSkills.filter((skill) => jobSet.has(skill.toLowerCase()));

  return Math.min(matches.length / Math.max(profileSkills.length, 1), 1);
}

function overlapScore(left: string, right: string) {
  const leftTokens = new Set(tokenizeJob(left));
  const rightTokens = tokenizeJob(right);

  if (leftTokens.size === 0 || rightTokens.length === 0) {
    return 0;
  }

  const matches = rightTokens.filter((token) => leftTokens.has(token));
  return Math.min(matches.length / Math.max(rightTokens.length, 1), 1);
}

function locationScore(preferences: string[], jobLocation: string, remote: boolean) {
  if (remote && preferences.some((value) => /remote/i.test(value))) {
    return 1;
  }

  const normalizedLocation = jobLocation.toLowerCase();
  if (preferences.some((value) => normalizedLocation.includes(value.toLowerCase()))) {
    return 1;
  }

  return remote ? 0.7 : 0.2;
}

function experienceScore(yearsExperience: number, description: string) {
  const seniority = description.toLowerCase();

  if (yearsExperience >= 7 && /(senior|staff|principal|lead)/i.test(seniority)) {
    return 1;
  }

  if (yearsExperience >= 3 && /(engineer|developer|specialist|analyst)/i.test(seniority)) {
    return 0.8;
  }

  if (yearsExperience === 0) {
    return 0.3;
  }

  return 0.6;
}

function lexicalSimilarity(left: string, right: string) {
  const leftTokens = new Set(tokenizeJob(left));
  const rightTokens = new Set(tokenizeJob(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  return intersection / Math.max(Math.max(leftTokens.size, rightTokens.size), 1);
}

function buildReason(input: {
  skillOverlap: number;
  titleOverlap: number;
  locationMatch: number;
  experienceMatch: number;
  summaryMatch: number;
}) {
  const reasons: string[] = [];

  if (input.skillOverlap >= 0.5) {
    reasons.push("strong skill overlap");
  }

  if (input.titleOverlap >= 0.4) {
    reasons.push("title alignment");
  }

  if (input.locationMatch >= 0.7) {
    reasons.push("location fit");
  }

  if (input.experienceMatch >= 0.7) {
    reasons.push("experience fit");
  }

  if (input.summaryMatch >= 0.15) {
    reasons.push("summary similarity");
  }

  return reasons.length > 0 ? reasons.join(", ") : "limited match signals";
}

function roundScore(score: number) {
  return Number(Math.max(0, Math.min(score, 1)).toFixed(4));
}

