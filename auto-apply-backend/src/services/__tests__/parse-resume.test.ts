import { describe, expect, it } from "vitest";
import { parseResume } from "../parse-resume";

describe("parseResume", () => {
  it("extracts structured profile data from resume text", async () => {
    const resumeText = `
Jane Doe
Backend Engineer
jane@example.com | +1 (555) 123-4567

Summary
Backend engineer with 5 years of experience building TypeScript, Node, Postgres, and Cloudflare systems.

Experience
Senior Backend Engineer, Example Co, 2020 - Present
Software Engineer, Other Co, 2018 - 2020

Skills
TypeScript, Node, Postgres, Cloudflare, Supabase, Redis

Education
Bachelor of Science in Computer Science
    `;

    const profile = await parseResume(resumeText);

    expect(profile.full_name).toBe("Jane Doe");
    expect(profile.email).toBe("jane@example.com");
    expect(profile.phone).toContain("555");
    expect(profile.skills).toEqual(
      expect.arrayContaining(["typescript", "node", "postgres", "cloudflare", "supabase", "redis"]),
    );
    expect(profile.years_experience).toBe(5);
    expect(profile.roles).toEqual(
      expect.arrayContaining(["Backend Engineer", "Senior Backend Engineer, Example Co, 2020 - Present", "Software Engineer, Other Co, 2018 - 2020"]),
    );
    expect(profile.education).toEqual(
      expect.arrayContaining(["Bachelor of Science in Computer Science"]),
    );
    expect(profile.confidence.overall).toBeGreaterThan(0);
  });

  it("returns conservative defaults when data is sparse", async () => {
    const profile = await parseResume("A resume without enough structure");

    expect(profile.full_name).toBe("");
    expect(profile.email).toBe("");
    expect(profile.skills).toEqual([]);
    expect(profile.years_experience).toBe(0);
  });
});
