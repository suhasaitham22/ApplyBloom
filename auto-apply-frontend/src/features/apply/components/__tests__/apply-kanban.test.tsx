import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("next/link", () => ({ default: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a> }));
vi.mock("@/features/apply/hooks/use-apply-events", () => ({ useApplyEvents: () => [] }));

vi.mock("@/features/studio/lib/studio-client", () => ({
  listApplies: vi.fn(),
  pauseApply: vi.fn(),
  cancelApply: vi.fn(),
}));

import { ApplyKanban } from "../apply-kanban";
import { listApplies } from "@/features/studio/lib/studio-client";

const mockList = vi.mocked(listApplies);

function mk(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1", user_id: "u", session_id: null, job_key: "k", ats_provider: "greenhouse",
    apply_url: "https://boards.greenhouse.io/x/jobs/1", job_title: "SWE", company: "Co",
    resume_id: null, credential_id: null, dry_run: false, status: "queued",
    priority: 0, error: null, screenshot_urls: [], attempt_log: [],
    claimed_by: null, claimed_at: null, started_at: null, finished_at: null,
    created_at: "", updated_at: "",
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("ApplyKanban", () => {
  it("renders all 5 lanes", async () => {
    mockList.mockResolvedValue({ items: [] });
    render(<ApplyKanban sessionId={null} />);
    await waitFor(() => expect(screen.getByText("Queued")).toBeInTheDocument());
    expect(screen.getByText("Applying")).toBeInTheDocument();
    expect(screen.getByText("Needs input")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("groups applies into their status lanes", async () => {
    mockList.mockResolvedValue({ items: [
      mk({ id: "1", status: "queued", job_title: "J1" }),
      mk({ id: "2", status: "submitted", job_title: "J2" }),
    ] as unknown as Parameters<typeof mockList.mockResolvedValue>[0]["items"] });
    render(<ApplyKanban sessionId={null} />);
    await waitFor(() => expect(screen.getByText("J1")).toBeInTheDocument());
    expect(screen.getByText("J2")).toBeInTheDocument();
  });

  it("shows error when an apply has one", async () => {
    mockList.mockResolvedValue({ items: [
      mk({ id: "1", status: "failed", error: "boom", job_title: "J1" }),
    ] as unknown as Parameters<typeof mockList.mockResolvedValue>[0]["items"] });
    render(<ApplyKanban sessionId={null} />);
    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
  });
});
