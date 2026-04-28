import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock("@/features/studio/lib/studio-client", () => ({
  listJobMatches: vi.fn(),
  refreshJobs: vi.fn(),
  updateJobMatchStatus: vi.fn(),
  applyFromMatch: vi.fn(),
}));

import { JobsList } from "../jobs-list";
import {
  listJobMatches, refreshJobs, updateJobMatchStatus, applyFromMatch,
} from "@/features/studio/lib/studio-client";

const mockList = vi.mocked(listJobMatches);
const mockRefresh = vi.mocked(refreshJobs);
const mockUpdate = vi.mocked(updateJobMatchStatus);
const mockApply = vi.mocked(applyFromMatch);

type JobMatchT = Parameters<typeof mockList.mockResolvedValue>[0]["items"][number];

function mk(overrides: Partial<JobMatchT> = {}): JobMatchT {
  return {
    id: "m1",
    user_id: "u",
    job_id: "j1",
    score: 0.8,
    score_breakdown: { title: 0.9 },
    status: "new",
    matched_at: "",
    created_at: "",
    updated_at: "",
    job: {
      id: "j1", source: "greenhouse", source_job_id: "g1",
      company: "Acme", title: "Staff Engineer", location: "Remote",
      description: null, apply_url: "https://boards.greenhouse.io/acme/jobs/1",
      ats_provider: "greenhouse", salary_min: 180000, salary_max: null, remote: true,
      tags: ["typescript", "react"], posted_at: null,
    },
    ...overrides,
  } as JobMatchT;
}

beforeEach(() => vi.clearAllMocks());

describe("JobsList", () => {
  it("shows empty state when no matches", async () => {
    mockList.mockResolvedValue({ items: [] });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText(/No matches yet/i)).toBeInTheDocument());
  });

  it("renders match with score, title, company, and tags", async () => {
    mockList.mockResolvedValue({ items: [mk()] });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("$180k+")).toBeInTheDocument();
    expect(screen.getAllByText("Remote").length).toBeGreaterThan(0);
  });

  it("filters by status chip", async () => {
    mockList.mockResolvedValue({
      items: [
        mk({ id: "a", status: "new", job: { ...mk().job, title: "NewJob" } }),
        mk({ id: "b", status: "saved", job: { ...mk().job, title: "SavedJob" } }),
      ],
    });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("NewJob")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(screen.queryByText("NewJob")).not.toBeInTheDocument();
    expect(screen.getByText("SavedJob")).toBeInTheDocument();
  });

  it("filters by search query", async () => {
    mockList.mockResolvedValue({
      items: [
        mk({ id: "a", job: { ...mk().job, title: "Rust Engineer", company: "R" } }),
        mk({ id: "b", job: { ...mk().job, title: "Python Dev", company: "P" } }),
      ],
    });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Rust Engineer")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Search jobs"), { target: { value: "rust" } });
    expect(screen.getByText("Rust Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Python Dev")).not.toBeInTheDocument();
  });

  it("clicking Apply invokes applyFromMatch and marks queued", async () => {
    mockList.mockResolvedValue({ items: [mk()] });
    mockApply.mockResolvedValue({ apply: {} as never });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(mockApply).toHaveBeenCalledWith("m1"));
    await waitFor(() => expect(screen.getAllByText("Queued").length).toBeGreaterThan(1));
  });

  it("clicking Save invokes updateJobMatchStatus", async () => {
    mockList.mockResolvedValue({ items: [mk()] });
    mockUpdate.mockResolvedValue({ item: {} as never });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("m1", "saved"));
  });

  it("clicking Skip invokes updateJobMatchStatus with rejected", async () => {
    mockList.mockResolvedValue({ items: [mk()] });
    mockUpdate.mockResolvedValue({ item: {} as never });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("m1", "rejected"));
  });

  it("Discover button calls refreshJobs then reloads", async () => {
    mockList.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [mk()] });
    mockRefresh.mockResolvedValue({ discovered: 5, matched: 3, skipped: false });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText(/No matches yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Discover/i }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
  });

  it("saved match shows Apply but no Save/Skip", async () => {
    mockList.mockResolvedValue({ items: [mk({ status: "saved" })] });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("queued_apply shows Queued badge", async () => {
    mockList.mockResolvedValue({ items: [mk({ status: "queued_apply" })] });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Staff Engineer")).toBeInTheDocument());
    expect(screen.getAllByText("Queued").length).toBeGreaterThan(0);
  });

  it("applied status shows Applied badge", async () => {
    mockList.mockResolvedValue({ items: [mk({ status: "applied" })] });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("Applied")).toBeInTheDocument());
  });

  it("score tone reflects score tier", async () => {
    mockList.mockResolvedValue({
      items: [
        mk({ id: "h", score: 0.85 }),
        mk({ id: "m", score: 0.6 }),
        mk({ id: "l", score: 0.3 }),
      ],
    });
    render(<JobsList />);
    await waitFor(() => expect(screen.getByText("85%")).toBeInTheDocument());
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });
});
