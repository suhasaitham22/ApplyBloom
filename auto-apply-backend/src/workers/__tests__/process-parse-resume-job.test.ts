import { describe, expect, it, vi } from "vitest";
import { processParseResumeJob } from "../process-parse-resume-job";

vi.mock("@/services/parse-resume", () => ({
  parseResume: vi.fn().mockResolvedValue({ skills: ["Python"] }),
}));

vi.mock("@/services/store-application-event", () => ({
  storeApplicationEvent: vi.fn().mockResolvedValue(undefined),
}));

describe("processParseResumeJob", () => {
  it("returns parsed profile data", async () => {
    await expect(
      processParseResumeJob({
        user_id: "user_123",
        artifact_id: "artifact_123",
        request_id: "req_123",
      }),
    ).resolves.toEqual({ skills: ["Python"] });
  });
});
