import { describe, expect, it } from "vitest";
import { tailorResume } from "../tailor-resume";

describe("tailorResume", () => {
  it("reorders skills and produces a change summary", async () => {
    const tailored = await tailorResume(
      {
        headline: "Backend Engineer",
        skills: ["Redis", "TypeScript", "Postgres", "Docker"],
        years_experience: 5,
        summary: "Backend engineer with strong systems experience.",
        roles: ["Senior Backend Engineer at Example Co"],
        education: ["Bachelor of Science in Computer Science"],
      },
      {
        title: "Backend Engineer",
        company: "Example Inc",
        description: "Looking for TypeScript, Postgres, Redis, and Cloudflare expertise.",
      },
    );

    expect(tailored.headline).toBe("Backend Engineer");
    expect(tailored.skills.slice(0, 3)).toEqual(["Redis", "TypeScript", "Postgres"]);
    expect(tailored.sections[0].section_name).toBe("Experience");
    expect(tailored.change_summary.join(" ")).toContain("skills");
  });

  it("keeps output conservative when the profile is sparse", async () => {
    const tailored = await tailorResume({}, { title: "Designer" });

    expect(tailored.headline).toBe("Designer");
    expect(tailored.summary).toBe("");
    expect(tailored.skills).toEqual([]);
  });
});

