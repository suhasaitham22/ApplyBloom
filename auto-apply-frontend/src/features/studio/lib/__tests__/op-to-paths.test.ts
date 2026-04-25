import { describe, it, expect } from "vitest";
import { opsToChangedPaths, type ResumeOp } from "../op-to-paths";

const before = {
  experience: [
    { heading: "Acme, SWE, 2020-2024" },
    { heading: "Beta Corp, Eng, 2018-2020" },
  ],
  education: [{ heading: "BS CS, State U, 2018" }],
};

describe("opsToChangedPaths", () => {
  it("maps replace_summary", () => {
    const ops: ResumeOp[] = [{ op: "replace_summary", value: "x" }];
    expect(opsToChangedPaths(ops, before)).toEqual(["summary"]);
  });

  it("maps add_skills to single skills path", () => {
    const ops: ResumeOp[] = [{ op: "add_skills", value: ["A", "B"] }];
    expect(opsToChangedPaths(ops, before)).toEqual(["skills"]);
  });

  it("maps rewrite_bullet to precise path", () => {
    const ops: ResumeOp[] = [
      { op: "rewrite_bullet", section: "experience", heading: "Beta Corp, Eng, 2018-2020", index: 1, value: "x" },
    ];
    expect(opsToChangedPaths(ops, before)).toEqual(["experience[1].bullets[1]"]);
  });

  it("ignores bullets for unknown headings", () => {
    const ops: ResumeOp[] = [
      { op: "rewrite_bullet", section: "experience", heading: "NOPE", index: 0, value: "x" },
    ];
    expect(opsToChangedPaths(ops, before)).toEqual([]);
  });

  it("dedupes multi-op", () => {
    const ops: ResumeOp[] = [
      { op: "add_skills", value: ["A"] },
      { op: "add_skills", value: ["B"] },
      { op: "replace_summary", value: "x" },
    ];
    const out = opsToChangedPaths(ops, before);
    expect(out.sort()).toEqual(["skills", "summary"]);
  });
});
