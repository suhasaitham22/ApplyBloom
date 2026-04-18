import { describe, it, expect } from "vitest";
import { structuredResumeSchema, resumeSectionSchema } from "../resume-schema";

describe("resumeSectionSchema", () => {
  it("validates a valid section", () => {
    const result = resumeSectionSchema.safeParse({
      heading: "Engineer, Acme (2022)",
      bullets: ["Led migration", "Reduced latency"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing heading", () => {
    const result = resumeSectionSchema.safeParse({ bullets: [] });
    expect(result.success).toBe(false);
  });
});

describe("structuredResumeSchema", () => {
  const valid = {
    full_name: "Jane Doe",
    headline: "Engineer",
    contact: { email: "j@x.com", phone: "555", location: "Austin" },
    summary: "Experienced engineer.",
    skills: ["TypeScript"],
    experience: [{ heading: "Eng, Acme", bullets: ["Did stuff"] }],
    education: [{ heading: "BS CS", bullets: [] }],
    confidence: 0.85,
  };

  it("validates correct input", () => {
    const result = structuredResumeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("applies defaults for missing contact fields", () => {
    const result = structuredResumeSchema.safeParse({ ...valid, contact: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contact.email).toBe("");
      expect(result.data.contact.phone).toBe("");
      expect(result.data.contact.location).toBe("");
    }
  });

  it("rejects confidence > 1", () => {
    const result = structuredResumeSchema.safeParse({ ...valid, confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects confidence < 0", () => {
    const result = structuredResumeSchema.safeParse({ ...valid, confidence: -0.1 });
    expect(result.success).toBe(false);
  });

  it("rejects missing full_name", () => {
    const { full_name, ...rest } = valid;
    const result = structuredResumeSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
