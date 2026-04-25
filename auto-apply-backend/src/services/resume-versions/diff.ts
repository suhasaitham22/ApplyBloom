// Minimal structured-resume diff. Returns a list of field-level changes
// the UI can highlight. Not a general JSON diff — tailored to our schema.

import type { StructuredResume } from "@/services/structure-resume";

export type ResumeDiff =
  | { path: "full_name" | "headline" | "summary"; kind: "modified" | "added" | "removed"; before?: string; after?: string }
  | { path: "skills"; kind: "added" | "removed"; value: string }
  | { path: `experience[${number}].bullets[${number}]`; kind: "modified" | "added" | "removed"; heading: string; index: number; before?: string; after?: string }
  | { path: `education[${number}].bullets[${number}]`; kind: "modified" | "added" | "removed"; heading: string; index: number; before?: string; after?: string };

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export function diffResumes(before: StructuredResume | null, after: StructuredResume | null): ResumeDiff[] {
  if (!before || !after) return [];
  const out: ResumeDiff[] = [];

  for (const field of ["full_name", "headline", "summary"] as const) {
    const b = str(before[field]);
    const a = str(after[field]);
    if (b !== a) {
      if (!b && a) out.push({ path: field, kind: "added", after: a });
      else if (b && !a) out.push({ path: field, kind: "removed", before: b });
      else out.push({ path: field, kind: "modified", before: b, after: a });
    }
  }

  // Skills: set-wise added / removed
  const beforeSkills = new Set((before.skills ?? []).map((s) => s.toLowerCase()));
  const afterSkills = new Set((after.skills ?? []).map((s) => s.toLowerCase()));
  for (const s of after.skills ?? []) {
    if (!beforeSkills.has(s.toLowerCase())) out.push({ path: "skills", kind: "added", value: s });
  }
  for (const s of before.skills ?? []) {
    if (!afterSkills.has(s.toLowerCase())) out.push({ path: "skills", kind: "removed", value: s });
  }

  // Experience / Education bullets — match by heading, diff bullets positionally
  for (const section of ["experience", "education"] as const) {
    const beforeList = before[section] ?? [];
    const afterList = after[section] ?? [];
    for (let i = 0; i < afterList.length; i++) {
      const afterSec = afterList[i];
      const beforeSec = beforeList.find((s) => s.heading === afterSec.heading);
      if (!beforeSec) continue; // new section, skip for now (heuristic)
      const maxLen = Math.max(beforeSec.bullets.length, afterSec.bullets.length);
      for (let j = 0; j < maxLen; j++) {
        const b = beforeSec.bullets[j];
        const a = afterSec.bullets[j];
        if (b === a) continue;
        const path = `${section}[${i}].bullets[${j}]` as ResumeDiff["path"];
        if (!b && a) out.push({ path, kind: "added", heading: afterSec.heading, index: j, after: a } as ResumeDiff);
        else if (b && !a) out.push({ path, kind: "removed", heading: afterSec.heading, index: j, before: b } as ResumeDiff);
        else out.push({ path, kind: "modified", heading: afterSec.heading, index: j, before: b, after: a } as ResumeDiff);
      }
    }
  }

  return out;
}

export function summariseDiff(d: ResumeDiff[]): string {
  if (d.length === 0) return "No changes";
  const parts: string[] = [];
  const modifiedFields = d.filter((x) => x.path === "full_name" || x.path === "headline" || x.path === "summary").map((x) => x.path);
  if (modifiedFields.length > 0) parts.push(`updated ${modifiedFields.join(", ")}`);
  const skillsAdded = d.filter((x) => x.path === "skills" && x.kind === "added").length;
  const skillsRemoved = d.filter((x) => x.path === "skills" && x.kind === "removed").length;
  if (skillsAdded > 0) parts.push(`+${skillsAdded} skill${skillsAdded === 1 ? "" : "s"}`);
  if (skillsRemoved > 0) parts.push(`-${skillsRemoved} skill${skillsRemoved === 1 ? "" : "s"}`);
  const bullets = d.filter((x) => typeof x.path === "string" && x.path.includes("bullets"));
  if (bullets.length > 0) parts.push(`${bullets.length} bullet${bullets.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
