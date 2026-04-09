import { describe, expect, it } from "vitest";
import { resetRuntimeStore, saveRuntimeProfile } from "@/lib/state/runtime-store";
import { handleGetJobMatchesRequest } from "../get-job-matches";

describe("handleGetJobMatchesRequest", () => {
  it("returns ranked matches for the authenticated user", async () => {
    resetRuntimeStore();
    saveRuntimeProfile({
      user_id: "user_123",
      full_name: "Jane Doe",
      headline: "Backend Engineer",
      skills: ["TypeScript", "Postgres", "Redis"],
      years_experience: 5,
      summary: "Backend engineer summary",
      updated_at: new Date().toISOString(),
    });

    const request = new Request("https://example.com/api/v1/match", {
      method: "POST",
      headers: {
        Authorization: "Bearer user_123",
      },
      body: JSON.stringify({ limit: 5 }),
    });

    const response = await handleGetJobMatchesRequest(request, {} as Env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { matches: Array<{ id: string }> };
    };
    expect(body.data.matches.length).toBeGreaterThan(0);
  });
});
