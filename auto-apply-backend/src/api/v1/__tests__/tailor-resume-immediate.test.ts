import { describe, expect, it } from "vitest";
import { resetRuntimeStore } from "@/lib/state/runtime-store";
import { handleTailorResumeRequest } from "../tailor-resume";

describe("handleTailorResumeRequest", () => {
  it("returns a tailored resume in demo mode", async () => {
    resetRuntimeStore();

    const request = new Request("https://example.com/api/v1/resume/tailor", {
      method: "POST",
      headers: { Authorization: "Bearer user_123" },
      body: JSON.stringify({
        resume: {
          full_name: "Jane Doe",
          headline: "Backend Engineer",
          contact: { email: "j@d.com", phone: "", location: "" },
          summary: "5 years of TypeScript and Postgres.",
          skills: ["TypeScript", "Postgres", "Redis"],
          experience: [{ heading: "Senior Engineer, Acme (2022-Present)", bullets: ["Built systems"] }],
          education: [{ heading: "BS CS", bullets: [] }],
          confidence: 0.9,
        },
        job: {
          title: "Senior Backend Engineer",
          company: "Widgets",
          description: "We need someone strong in TypeScript and Postgres.",
        },
      }),
    });

    const response = await handleTailorResumeRequest(request, { API_VERSION: "v1" } as Env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { tailored: { headline: string; skills: string[] }; demo_mode: boolean };
    };
    expect(body.data.tailored.headline.length).toBeGreaterThan(0);
    expect(Array.isArray(body.data.tailored.skills)).toBe(true);
  });
});
