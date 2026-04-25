// Convert between StructuredResume JSON and Plate Value.
// JSON stays the source of truth. Plate nodes carry `dataPath` so edits round-trip
// back to precise JSON fields without losing structure.
//
// Custom node types we render with purpose-built renderers (preserve ATS formatting):
//   name          — full_name (H1)
//   headline      — target role subtitle
//   contact       — email · phone · location row (single editable line)
//   section-title — "Summary" / "Skills" / "Experience" / "Education" (non-editable label)
//   summary       — summary paragraph
//   skills        — skill chips row (comma-separated on edit)
//   exp-heading   — experience / education section heading
//   bullet        — bullet point (rendered as <li> in styled <ul>)

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface StructuredResume {
  full_name?: string;
  headline?: string;
  contact?: { email?: string; phone?: string; location?: string };
  summary?: string;
  skills?: string[];
  experience?: Array<{ heading: string; bullets: string[] }>;
  education?: Array<{ heading: string; bullets: string[] }>;
  confidence?: number;
}

function text(s: string, marks?: { bold?: true; italic?: true }): any {
  return { text: s, ...(marks ?? {}) };
}

/** JSON -> Plate document with dataPaths. */
export function resumeToPlate(r: StructuredResume | null | undefined): any[] {
  if (!r) return [{ type: "p", children: [text("")] }];
  const out: any[] = [];

  if (r.full_name) {
    out.push({ type: "name", children: [text(r.full_name)], dataPath: "full_name" });
  }
  if (r.headline) {
    out.push({ type: "headline", children: [text(r.headline)], dataPath: "headline" });
  }
  if (r.contact && (r.contact.email || r.contact.phone || r.contact.location)) {
    const joined = [r.contact.email, r.contact.phone, r.contact.location].filter(Boolean).join(" · ");
    out.push({ type: "contact", children: [text(joined)], dataPath: "contact" });
  }

  if (r.summary) {
    out.push({ type: "section-title", children: [text("Summary")] });
    out.push({ type: "summary", children: [text(r.summary)], dataPath: "summary" });
  }

  if (r.skills && r.skills.length > 0) {
    out.push({ type: "section-title", children: [text("Skills")] });
    out.push({ type: "skills", children: [text(r.skills.join(", "))], dataPath: "skills" });
  }

  if (r.experience && r.experience.length > 0) {
    out.push({ type: "section-title", children: [text("Experience")] });
    r.experience.forEach((sec, i) => {
      out.push({ type: "exp-heading", children: [text(sec.heading)], dataPath: `experience[${i}].heading` });
      sec.bullets.forEach((b, j) => {
        out.push({ type: "bullet", children: [text(b)], dataPath: `experience[${i}].bullets[${j}]` });
      });
    });
  }

  if (r.education && r.education.length > 0) {
    out.push({ type: "section-title", children: [text("Education")] });
    r.education.forEach((sec, i) => {
      out.push({ type: "exp-heading", children: [text(sec.heading)], dataPath: `education[${i}].heading` });
      sec.bullets.forEach((b, j) => {
        out.push({ type: "bullet", children: [text(b)], dataPath: `education[${i}].bullets[${j}]` });
      });
    });
  }

  if (out.length === 0) out.push({ type: "p", children: [text("")] });
  return out;
}

function extractText(n: any): string {
  if (typeof n?.text === "string") return n.text;
  return (n.children ?? []).map(extractText).join("");
}

/** Plate document -> JSON. Uses `base` to fill fields we don't edit in-place. */
export function plateToResume(nodes: any[], base: StructuredResume): StructuredResume {
  const out: StructuredResume = {
    ...base,
    contact: { ...(base.contact ?? {}) },
    experience: base.experience ? JSON.parse(JSON.stringify(base.experience)) : [],
    education: base.education ? JSON.parse(JSON.stringify(base.education)) : [],
  };

  for (const n of nodes) {
    const dp = n?.dataPath as string | undefined;
    if (!dp) continue;
    const t = extractText(n).trim();

    if (dp === "full_name") out.full_name = t;
    else if (dp === "headline") out.headline = t;
    else if (dp === "summary") out.summary = t;
    else if (dp === "skills") out.skills = t.split(/\s*,\s*|\s*·\s*/).map((s) => s.trim()).filter(Boolean);
    else if (dp === "contact") {
      // Display-only. Parsing free text back into {email, phone, location} is lossy —
      // we preserve the base contact object to avoid data loss.
    } else {
      const m = dp.match(/^(experience|education)\[(\d+)\]\.(heading|bullets\[(\d+)\])$/);
      if (m) {
        const section = m[1] as "experience" | "education";
        const i = Number(m[2]);
        const arr = out[section]!;
        if (!arr[i]) arr[i] = { heading: "", bullets: [] };
        if (m[3] === "heading") arr[i].heading = t;
        else {
          const j = Number(m[4]);
          arr[i].bullets[j] = t;
        }
      }
    }
  }
  return out;
}

/** Tag nodes whose dataPath matches the given set — UI renders amber highlight. */
export function markChangedPaths(doc: any[], paths: Set<string>): any[] {
  if (paths.size === 0) return doc;
  return doc.map((n) => {
    const dp: string | undefined = n?.dataPath;
    if (!dp) return n;
    for (const p of paths) {
      if (dp === p || dp.startsWith(p + ".") || dp.startsWith(p + "[")) {
        return { ...n, changed: true };
      }
    }
    return n;
  });
}
