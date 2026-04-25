// Convert between StructuredResume JSON and Plate Value (array of nodes).
// Keeps JSON as the source of truth — Plate is only a rendering/editing layer.
// Every block carries a `dataPath` so we can map Plate edits back to JSON fields.

import type { Descendant } from "platejs";
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

type Mark = { bold?: true; italic?: true };

type TextNode = { text: string } & Mark;

interface PlateNode {
  type?: string;
  children: (PlateNode | TextNode)[];
  /** Path back to the JSON field, e.g. "summary", "skills", "experience[0].bullets[2]". */
  dataPath?: string;
  /** Highlight the recent AI change. */
  changed?: boolean;
}

/** Parse a JSON resume to a Plate document for editing. */
export function resumeToPlate(r: StructuredResume | null | undefined): any[] {
  if (!r) return [{ type: "p", children: [{ text: "" }] } as PlateNode];
  const out: PlateNode[] = [];

  if (r.full_name) {
    out.push({ type: "h1", children: [{ text: r.full_name }], dataPath: "full_name" });
  }
  if (r.headline) {
    out.push({ type: "h3", children: [{ text: r.headline }], dataPath: "headline" });
  }
  if (r.contact && (r.contact.email || r.contact.phone || r.contact.location)) {
    const parts = [r.contact.email, r.contact.phone, r.contact.location].filter(Boolean).join("  ·  ");
    out.push({ type: "p", children: [{ text: parts, italic: true }], dataPath: "contact" });
  }

  if (r.summary) {
    out.push({ type: "h2", children: [{ text: "Summary" }] });
    out.push({ type: "p", children: [{ text: r.summary }], dataPath: "summary" });
  }

  if (r.skills && r.skills.length > 0) {
    out.push({ type: "h2", children: [{ text: "Skills" }] });
    out.push({
      type: "p",
      children: [{ text: r.skills.join("  ·  ") }],
      dataPath: "skills",
    });
  }

  if (r.experience && r.experience.length > 0) {
    out.push({ type: "h2", children: [{ text: "Experience" }] });
    r.experience.forEach((sec, i) => {
      out.push({ type: "h3", children: [{ text: sec.heading }], dataPath: `experience[${i}].heading` });
      sec.bullets.forEach((b, j) => {
        out.push({
          type: "p",
          children: [{ text: `•  ${b}` }],
          dataPath: `experience[${i}].bullets[${j}]`,
        });
      });
    });
  }

  if (r.education && r.education.length > 0) {
    out.push({ type: "h2", children: [{ text: "Education" }] });
    r.education.forEach((sec, i) => {
      out.push({ type: "h3", children: [{ text: sec.heading }], dataPath: `education[${i}].heading` });
      sec.bullets.forEach((b, j) => {
        out.push({
          type: "p",
          children: [{ text: `•  ${b}` }],
          dataPath: `education[${i}].bullets[${j}]`,
        });
      });
    });
  }

  if (out.length === 0) out.push({ type: "p", children: [{ text: "" }] });
  return out as Descendant[];
}

function extractText(n: PlateNode | TextNode): string {
  if ("text" in n) return n.text;
  return (n.children || []).map(extractText).join("");
}

function stripBullet(s: string): string {
  return s.replace(/^•\s+/, "").trim();
}

/** Serialize Plate document back to StructuredResume. */
export function plateToResume(nodes: any[], base: StructuredResume): StructuredResume {
  const out: StructuredResume = {
    ...base,
    contact: { ...(base.contact ?? {}) },
    experience: base.experience ? JSON.parse(JSON.stringify(base.experience)) : [],
    education: base.education ? JSON.parse(JSON.stringify(base.education)) : [],
  };

  for (const rawNode of nodes) {
    const n = rawNode as PlateNode;
    const text = extractText(n).trim();
    const dp = n.dataPath;
    if (!dp) continue;

    if (dp === "full_name") out.full_name = text;
    else if (dp === "headline") out.headline = text;
    else if (dp === "summary") out.summary = text;
    else if (dp === "skills") out.skills = text.split(/\s*·\s*|,\s*/).map((s) => s.trim()).filter(Boolean);
    else if (dp === "contact") {
      // contact is display-only — skip round-trip (avoid lossy parsing).
    } else {
      const m = dp.match(/^(experience|education)\[(\d+)\]\.(heading|bullets\[(\d+)\])$/);
      if (m) {
        const section = m[1] as "experience" | "education";
        const i = Number(m[2]);
        const arr = out[section]!;
        if (!arr[i]) arr[i] = { heading: "", bullets: [] };
        if (m[3] === "heading") arr[i].heading = text;
        else {
          const j = Number(m[4]);
          arr[i].bullets[j] = stripBullet(text);
        }
      }
    }
  }
  return out;
}

/** Mark a Plate document's nodes as `changed` based on paths. */
export function markChangedPaths(doc: any[], paths: Set<string>): any[] {
  return doc.map((raw) => {
    const n = raw as PlateNode;
    if (!n.dataPath) return n as Descendant;
    const hit = Array.from(paths).some((p) => n.dataPath === p || (n.dataPath ?? "").startsWith(p));
    return hit ? ({ ...n, changed: true } as Descendant) : (n as Descendant);
  });
}
