import { describe, it, expect } from "vitest";
import { diffResumes, summariseDiff } from "../diff";
import type { StructuredResume } from "@/services/structure-resume";

const base: StructuredResume = {
  full_name: "Alice",
  headline: "Backend Engineer",
  contact: { email: "", phone: "", location: "" },
  summary: "Seasoned engineer.",
  skills: ["TypeScript", "PostgreSQL"],
  experience: [{ heading: "Acme, SWE, 2020-2024", bullets: ["Led API migration", "Built CI/CD"] }],
  education: [],
  confidence: 0.9,
};

describe("diffResumes", () => {
  it("no changes → empty list", () => {
    expect(diffResumes(base, { ...base })).toEqual([]);
  });

  it("modified summary", () => {
    const after = { ...base, summary: "Updated summary" };
    const d = diffResumes(base, after);
    expect(d).toEqual([{ path: "summary", kind: "modified", before: "Seasoned engineer.", after: "Updated summary" }]);
  });

  it("added + removed skills", () => {
    const after = { ...base, skills: ["TypeScript", "Python", "AWS"] };
    const d = diffResumes(base, after);
    expect(d.filter((x) => x.path === "skills" && x.kind === "added").length).toBe(2);
    expect(d.filter((x) => x.path === "skills" && x.kind === "removed").length).toBe(1);
  });

  it("modified bullet in experience", () => {
    const after: StructuredResume = {
      ...base,
      experience: [{ heading: "Acme, SWE, 2020-2024", bullets: ["Led API migration 2x faster", "Built CI/CD"] }],
    };
    const d = diffResumes(base, after);
    expect(d.length).toBe(1);
    expect(d[0]).toMatchObject({ kind: "modified", heading: "Acme, SWE, 2020-2024", index: 0 });
  });

  it("added bullet at end", () => {
    const after: StructuredResume = {
      ...base,
      experience: [{ heading: "Acme, SWE, 2020-2024", bullets: ["Led API migration", "Built CI/CD", "Reduced p95 latency"] }],
    };
    const d = diffResumes(base, after);
    expect(d[0].kind).toBe("added");
  });

  it("modified headline", () => {
    const after = { ...base, headline: "Staff Engineer" };
    const d = diffResumes(base, after);
    expect(d[0].path).toBe("headline");
  });

  it("summarise multi-change", () => {
    const after: StructuredResume = {
      ...base,
      summary: "New summary",
      skills: ["TypeScript", "PostgreSQL", "Rust", "K8s"],
      experience: [{ heading: "Acme, SWE, 2020-2024", bullets: ["Stronger bullet", "Built CI/CD"] }],
    };
    const d = diffResumes(base, after);
    const sum = summariseDiff(d);
    expect(sum).toMatch(/summary/);
    expect(sum).toMatch(/\+2 skills/);
    expect(sum).toMatch(/1 bullet/);
  });

  it("handles nulls gracefully", () => {
    expect(diffResumes(null, base)).toEqual([]);
    expect(diffResumes(base, null)).toEqual([]);
  });
});
