import { describe, expect, it } from "vitest";
import { listRuntimeNotifications, resetRuntimeStore } from "@/lib/state/runtime-store";
import { enqueueApplyJob } from "../enqueue-apply-job";

describe("enqueueApplyJob immediate processing", () => {
  it("records a notification when demo queue processing is enabled", async () => {
    resetRuntimeStore();

    await enqueueApplyJob(
      {
        user_id: "user_123",
        job_id: "job_123",
        resume_artifact_id: "resume_123",
        apply_mode: "manual_review",
        request_id: "req_123",
      },
      {
        API_VERSION: "v1",
        DEV_IMMEDIATE_QUEUE_PROCESSING: "true",
      } as Env,
    );

    expect(listRuntimeNotifications("user_123").length).toBeGreaterThan(0);
  });
});

