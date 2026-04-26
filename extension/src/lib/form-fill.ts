// Minimal CSS.escape polyfill — jsdom doesn't expose CSS in test env.
function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  // Escape special chars per CSS.escape spec (simplified — IDs only need minimal handling).
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => "\\" + ch);
}

// Shared DOM primitives used by every ATS strategy.

export function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const tag = el.tagName;
  const setter =
    tag === "TEXTAREA"
      ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
      : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function findInputByLabel(
  root: Document | HTMLElement,
  patterns: Array<string | RegExp>,
): HTMLInputElement | HTMLTextAreaElement | null {
  const labels = Array.from(root.querySelectorAll("label"));
  for (const label of labels) {
    const text = (label.textContent ?? "").trim().toLowerCase();
    const matches = patterns.some((p) =>
      typeof p === "string" ? text.includes(p.toLowerCase()) : p.test(text),
    );
    if (!matches) continue;
    const forId = label.getAttribute("for");
    if (forId) {
      const el = root.querySelector("#" + cssEscape(forId)) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) return el;
    }
    const nested = label.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
    if (nested) return nested;
  }
  return null;
}

export const LABEL_PATTERNS: Record<string, Array<string | RegExp>> = {
  legal_first_name: [/first name/i, /given name/i],
  legal_last_name: [/last name/i, /family name/i, /surname/i],
  email: [/email/i, /e-mail/i],
  phone: [/phone/i, /mobile/i, /telephone/i],
  location: [/city/i, /location/i, /current location/i],
  linkedin_url: [/linkedin/i],
  portfolio_url: [/portfolio/i, /website/i, /personal site/i],
  github_url: [/github/i],
};

export function autoFillProfile(
  doc: Document,
  profile: Partial<Record<keyof typeof LABEL_PATTERNS, string | null>>,
): string[] {
  const filled: string[] = [];
  for (const [key, patterns] of Object.entries(LABEL_PATTERNS)) {
    const value = profile[key as keyof typeof LABEL_PATTERNS];
    if (!value) continue;
    const el = findInputByLabel(doc, patterns);
    if (!el) continue;
    setValue(el, value);
    filled.push(key);
  }
  return filled;
}

export function extractUnansweredQuestions(
  doc: Document,
  skipKeys: string[] = [],
): Array<{ question_text: string; input: HTMLInputElement | HTMLTextAreaElement }> {
  const out: Array<{ question_text: string; input: HTMLInputElement | HTMLTextAreaElement }> = [];
  const labels = Array.from(doc.querySelectorAll("label"));
  for (const label of labels) {
    const text = (label.textContent ?? "").trim();
    if (!text) continue;
    const lower = text.toLowerCase();
    let skipped = false;
    for (const key of Object.keys(LABEL_PATTERNS)) {
      if (!skipKeys.includes(key)) continue;
      const patterns = LABEL_PATTERNS[key];
      if (patterns.some((p) => (typeof p === "string" ? lower.includes(p.toLowerCase()) : p.test(lower)))) {
        skipped = true; break;
      }
    }
    if (skipped) continue;
    const forId = label.getAttribute("for");
    const input = forId
      ? doc.querySelector("#" + cssEscape(forId)) as HTMLInputElement | HTMLTextAreaElement | null
      : label.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
    if (input && !input.value) {
      out.push({ question_text: text, input });
    }
  }
  return out;
}

export async function uploadResume(
  input: HTMLInputElement, signedUrl: string, filename = "resume.pdf",
): Promise<void> {
  const res = await fetch(signedUrl);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type || "application/pdf" });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
