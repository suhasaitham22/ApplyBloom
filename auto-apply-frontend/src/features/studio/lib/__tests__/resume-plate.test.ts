import { describe, it, expect } from "vitest";
import { resumeToPlate, plateToResume, markChangedPaths, type StructuredResume } from "../resume-plate";

const resume: StructuredResume = {
  full_name: "Alice Smith",
  headline: "Senior Backend Engineer",
  contact: { email: "alice@ex.com", phone: "555-1234", location: "Austin" },
  summary: "Seasoned engineer with 8 years shipping production systems.",
  skills: ["TypeScript", "Go", "Postgres"],
  experience: [
    { heading: "Acme, SWE, 2020-2024", bullets: ["Led API migration", "Built CI/CD pipeline"] },
  ],
  education: [
    { heading: "BS CS, State U, 2018", bullets: ["GPA 3.8"] },
  ],
};

describe("resumeToPlate", () => {
  it("returns a non-empty document for a full resume", () => {
    const doc = resumeToPlate(resume);
    expect(doc.length).toBeGreaterThan(5);
  });

  it("returns a single empty paragraph for null", () => {
    const doc = resumeToPlate(null);
    expect(doc.length).toBe(1);
    expect((doc[0] as { children: { text: string }[] }).children[0].text).toBe("");
  });

  it("carries dataPath on editable fields", () => {
    const doc = resumeToPlate(resume);
    const paths = doc.map((n: { dataPath?: string }) => n.dataPath).filter(Boolean);
    expect(paths).toContain("full_name");
    expect(paths).toContain("headline");
    expect(paths).toContain("summary");
    expect(paths).toContain("skills");
    expect(paths).toContain("experience[0].heading");
    expect(paths).toContain("experience[0].bullets[0]");
    expect(paths).toContain("experience[0].bullets[1]");
    expect(paths).toContain("education[0].bullets[0]");
  });

  it("labels skills with separator-joined text", () => {
    const doc = resumeToPlate(resume);
    const skillsNode = doc.find((n: { dataPath?: string }) => n.dataPath === "skills");
    expect(skillsNode).toBeDefined();
    expect((skillsNode as { children: { text: string }[] }).children[0].text).toContain("TypeScript");
    expect((skillsNode as { children: { text: string }[] }).children[0].text).toContain("Postgres");
  });
});

describe("plateToResume round-trip", () => {
  it("round-trips without semantic loss", () => {
    const doc = resumeToPlate(resume);
    const back = plateToResume(doc, resume);
    expect(back.full_name).toBe(resume.full_name);
    expect(back.headline).toBe(resume.headline);
    expect(back.summary).toBe(resume.summary);
    expect(back.skills).toEqual(resume.skills);
    expect(back.experience).toEqual(resume.experience);
    expect(back.education).toEqual(resume.education);
  });

  it("captures edits to summary text", () => {
    const doc = resumeToPlate(resume);
    // simulate a typed edit
    const summaryNode = doc.find((n: { dataPath?: string }) => n.dataPath === "summary");
    (summaryNode as { children: { text: string }[] }).children[0].text = "New summary text";
    const back = plateToResume(doc, resume);
    expect(back.summary).toBe("New summary text");
    expect(back.skills).toEqual(resume.skills); // other fields untouched
  });

  it("captures edits to a bullet", () => {
    const doc = resumeToPlate(resume);
    const bulletNode = doc.find((n: { dataPath?: string }) => n.dataPath === "experience[0].bullets[1]");
    (bulletNode as { children: { text: string }[] }).children[0].text = "•  Rewrote CI/CD 3x faster";
    const back = plateToResume(doc, resume);
    expect(back.experience![0].bullets[1]).toBe("Rewrote CI/CD 3x faster");
    expect(back.experience![0].bullets[0]).toBe("Led API migration");
  });

  it("parses skills back from joined string", () => {
    const doc = resumeToPlate(resume);
    const skillsNode = doc.find((n: { dataPath?: string }) => n.dataPath === "skills");
    (skillsNode as { children: { text: string }[] }).children[0].text = "Python · Kubernetes · AWS";
    const back = plateToResume(doc, resume);
    expect(back.skills).toEqual(["Python", "Kubernetes", "AWS"]);
  });
});

describe("markChangedPaths", () => {
  it("flags nodes whose dataPath matches", () => {
    const doc = resumeToPlate(resume);
    const marked = markChangedPaths(doc, new Set(["summary", "skills"]));
    const changed = marked.filter((n: { changed?: boolean }) => n.changed);
    expect(changed.length).toBe(2);
  });

  it("does not flag unrelated nodes", () => {
    const doc = resumeToPlate(resume);
    const marked = markChangedPaths(doc, new Set(["summary"]));
    const headlineNode = marked.find((n: { dataPath?: string }) => n.dataPath === "headline");
    expect((headlineNode as { changed?: boolean }).changed).toBeFalsy();
  });

  it("supports prefix matching (experience → all sub-nodes)", () => {
    const doc = resumeToPlate(resume);
    const marked = markChangedPaths(doc, new Set(["experience[0]"]));
    const hits = marked.filter((n: { changed?: boolean; dataPath?: string }) => n.changed);
    // heading + 2 bullets = 3
    expect(hits.length).toBeGreaterThanOrEqual(3);
  });
});
