// Maps a list of ResumeOps (returned by the AI) to the set of JSON paths that
// changed. The editor highlights those paths.

export type ResumeOp =
  | { op: "replace_summary"; value: string }
  | { op: "replace_headline"; value: string }
  | { op: "set_skills"; value: string[] }
  | { op: "add_skills"; value: string[] }
  | { op: "remove_skills"; value: string[] }
  | { op: "rewrite_bullet"; section: "experience" | "education"; heading: string; index: number; value: string }
  | { op: "add_bullet"; section: "experience" | "education"; heading: string; value: string };

/**
 * Given the *previous* resume state and a list of ops, compute the set of dataPaths
 * that the editor should highlight. We use the `before` resume to resolve the heading
 * index for bullet ops.
 */
export function opsToChangedPaths(
  ops: ResumeOp[],
  before: { experience?: Array<{ heading: string }>; education?: Array<{ heading: string }> },
): string[] {
  const paths = new Set<string>();
  for (const op of ops) {
    switch (op.op) {
      case "replace_summary":  paths.add("summary");  break;
      case "replace_headline": paths.add("headline"); break;
      case "set_skills":
      case "add_skills":
      case "remove_skills":    paths.add("skills");   break;
      case "rewrite_bullet":
      case "add_bullet": {
        const list = op.section === "experience" ? before.experience ?? [] : before.education ?? [];
        const i = list.findIndex((s) => s.heading === op.heading);
        if (i >= 0) {
          if (op.op === "rewrite_bullet") paths.add(`${op.section}[${i}].bullets[${op.index}]`);
          else paths.add(`${op.section}[${i}]`); // add_bullet — flag whole section
        }
        break;
      }
    }
  }
  return Array.from(paths);
}
