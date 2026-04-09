import { describe, expect, it } from "vitest";
import { rankJobMatches } from "../rank-job-matches";

describe("rankJobMatches", () => {
  it("ranks relevant jobs higher", async () => {
    const matches = await rankJobMatches(
      {
        headline: "Backend Engineer",
        skills: ["typescript", "postgres", "redis"],
        location_preferences: ["Remote"],
        years_experience: 5,
        summary: "Builds backend systems.",
      },
      [
        {
          id: "job-1",
          title: "Backend Engineer",
          company: "A",
          location: "Remote",
          remote: true,
          description: "TypeScript, Postgres, Redis, backend systems.",
        },
        {
          id: "job-2",
          title: "Designer",
          company: "B",
          location: "New York, NY",
          remote: false,
          description: "Visual design and branding.",
        },
      ],
    );

    expect(matches[0].job_id).toBe("job-1");
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
    expect(matches[0].reason).toContain("skill");
  });

  it("handles string profiles conservatively", async () => {
    const matches = await rankJobMatches("Backend Engineer", [
      {
        id: "job-1",
        title: "Backend Engineer",
        company: "A",
        location: "Remote",
        remote: true,
        description: "TypeScript backend role",
      },
    ]);

    expect(matches).toHaveLength(1);
    expect(matches[0].job_id).toBe("job-1");
  });
});

