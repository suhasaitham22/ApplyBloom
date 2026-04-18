// Zod schema for structured resumes — used for AI SDK generateObject + runtime validation.
import { z } from "zod";

export const resumeSectionSchema = z.object({
  heading: z.string().describe("Role heading with company and dates, e.g. 'Senior Engineer, Acme Corp (2022 — Present)'"),
  bullets: z.array(z.string()).describe("Achievement bullets — start with strong action verbs, include metrics"),
});

export const structuredResumeSchema = z.object({
  full_name: z.string().describe("Candidate's full legal name"),
  headline: z.string().describe("Target role (e.g. 'Senior Backend Engineer')"),
  contact: z.object({
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default("").describe("City, state (or 'Remote')"),
  }),
  summary: z.string().describe("30–80 word professional summary"),
  skills: z.array(z.string()).describe("10+ individual skill keywords (technologies, methodologies)"),
  experience: z.array(resumeSectionSchema),
  education: z.array(resumeSectionSchema),
  confidence: z.number().min(0).max(1).describe("0–1 parse confidence"),
});

export type StructuredResumeSchema = z.infer<typeof structuredResumeSchema>;
