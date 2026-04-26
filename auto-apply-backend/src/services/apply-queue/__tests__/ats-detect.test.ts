import { describe, it, expect } from "vitest";
import { detectAtsProvider, extractJobKey } from "../ats-detect";

describe("ats-detect", () => {
  it("detects greenhouse", () => {
    expect(detectAtsProvider("https://boards.greenhouse.io/stripe/jobs/12345")).toBe("greenhouse");
    expect(detectAtsProvider("https://stripe.greenhouse.io/jobs/12345")).toBe("greenhouse");
  });
  it("detects lever", () => {
    expect(detectAtsProvider("https://jobs.lever.co/figma/abc-def")).toBe("lever");
  });
  it("detects ashby", () => {
    expect(detectAtsProvider("https://jobs.ashbyhq.com/vercel/abc-123")).toBe("ashby");
    expect(detectAtsProvider("https://vercel.ashbyhq.com/jobs/abc-123")).toBe("ashby");
  });
  it("falls back to generic", () => {
    expect(detectAtsProvider("https://example.com/careers/apply")).toBe("generic");
    expect(detectAtsProvider("not a url")).toBe("generic");
    expect(detectAtsProvider("")).toBe("generic");
  });

  it("extractJobKey greenhouse /jobs/:id", () => {
    expect(extractJobKey("https://boards.greenhouse.io/stripe/jobs/12345", "greenhouse")).toBe("greenhouse:12345");
  });
  it("extractJobKey greenhouse embed token", () => {
    expect(extractJobKey("https://boards.greenhouse.io/embed/job_app?for=stripe&token=AB12", "greenhouse")).toBe("greenhouse:AB12");
  });
  it("extractJobKey lever", () => {
    expect(extractJobKey("https://jobs.lever.co/figma/abc-def", "lever")).toBe("lever:figma:abc-def");
  });
  it("extractJobKey ashby", () => {
    expect(extractJobKey("https://jobs.ashbyhq.com/vercel/abc-123", "ashby")).toBe("ashby:vercel:abc-123");
  });
  it("extractJobKey falls back to url", () => {
    expect(extractJobKey("https://example.com/x", "generic")).toBe("url:https://example.com/x");
  });
});
