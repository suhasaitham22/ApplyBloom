import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

vi.mock("@/features/studio/lib/studio-client", () => ({
  listResumeVersions: vi.fn(),
  restoreResumeVersion: vi.fn(),
}));

import { ResumeVersionHistory } from "../resume-version-history";
import { listResumeVersions, restoreResumeVersion } from "@/features/studio/lib/studio-client";

const mockList = vi.mocked(listResumeVersions);
const mockRestore = vi.mocked(restoreResumeVersion);

function makeVersion(v: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `vid-${v}`,
    resume_id: "r1",
    user_id: "u1",
    version: v,
    parsed: { a: v },
    raw_text: null,
    created_at: new Date().toISOString(),
    created_by: "ai" as const,
    change_summary: `change ${v}`,
    ops: null,
    message_id: null,
    ...overrides,
  };
}

describe("ResumeVersionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading then empty state", async () => {
    mockList.mockResolvedValue({ versions: [] });
    render(<ResumeVersionHistory resumeId="r1" />);
    await waitFor(() => expect(screen.getByText(/No versions yet/)).toBeInTheDocument());
  });

  it("renders versions newest-first with 'current' badge on v.0 index", async () => {
    mockList.mockResolvedValue({
      versions: [makeVersion(3, { created_by: "ai", change_summary: "AI rewrote summary" }), makeVersion(2, { created_by: "user" }), makeVersion(1, { created_by: "import" })],
    });
    render(<ResumeVersionHistory resumeId="r1" />);
    await waitFor(() => expect(screen.getByText("v3")).toBeInTheDocument());
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("current")).toBeInTheDocument();
    expect(screen.getByText("AI rewrote summary")).toBeInTheDocument();
  });

  it("Restore button calls restoreResumeVersion + onRestored callback", async () => {
    mockList.mockResolvedValue({ versions: [makeVersion(2), makeVersion(1)] });
    mockRestore.mockResolvedValue({
      resume: { id: "r1", user_id: "u1", name: "r", parsed: null, raw_text: null, created_at: "", is_base: false },
      version: makeVersion(3),
      diff: [],
    });
    // reload after restore
    mockList.mockResolvedValueOnce({ versions: [makeVersion(2), makeVersion(1)] });

    const onRestored = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ResumeVersionHistory resumeId="r1" onRestored={onRestored} />);
    await waitFor(() => expect(screen.getByText("v1")).toBeInTheDocument());

    const restoreButtons = screen.getAllByText("Restore");
    fireEvent.click(restoreButtons[0]);
    await waitFor(() => expect(mockRestore).toHaveBeenCalledWith("r1", 1));
    await waitFor(() => expect(onRestored).toHaveBeenCalled());
  });

  it("current version has no Restore button", async () => {
    mockList.mockResolvedValue({ versions: [makeVersion(2), makeVersion(1)] });
    render(<ResumeVersionHistory resumeId="r1" />);
    await waitFor(() => expect(screen.getByText("v2")).toBeInTheDocument());
    const buttons = screen.getAllByText("Restore");
    // only 1 Restore (for v1, not v2 which is current)
    expect(buttons.length).toBe(1);
  });

  it("reloads when refreshKey changes", async () => {
    mockList.mockResolvedValue({ versions: [] });
    const { rerender } = render(<ResumeVersionHistory resumeId="r1" refreshKey={0} />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    rerender(<ResumeVersionHistory resumeId="r1" refreshKey={1} />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });
});
