import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionSidebar } from "../session-sidebar";
import type { ChatSession } from "@/features/studio/lib/studio-client";

function makeSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: "s1",
    user_id: "u1",
    resume_id: null,
    mode: "single",
    status: "idle",
    title: "Test Session",
    job: null,
    tailored_resume_id: null,
    application_id: null,
    locked_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const baseProps = {
  sessions: [] as ChatSession[],
  activeSessionId: null as string | null,
  onSelect: vi.fn(),
  onCreate: vi.fn(),
  onRename: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onCancel: vi.fn(),
  blockedBy: null as ChatSession | null,
  mode: "single" as const,
  onModeChange: vi.fn(),
};

describe("SessionSidebar", () => {
  it("renders empty state", () => {
    render(<SessionSidebar {...baseProps} />);
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument();
  });

  it("renders mode cards", () => {
    render(<SessionSidebar {...baseProps} />);
    expect(screen.getByText("Single")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("calls onModeChange when clicking Auto", () => {
    render(<SessionSidebar {...baseProps} />);
    fireEvent.click(screen.getByText("Auto"));
    expect(baseProps.onModeChange).toHaveBeenCalledWith("auto");
  });

  it("calls onCreate when New session clicked", () => {
    render(<SessionSidebar {...baseProps} />);
    fireEvent.click(screen.getByText("New session"));
    expect(baseProps.onCreate).toHaveBeenCalled();
  });

  it("shows blocked message when blockedBy is set", () => {
    const blocker = makeSession({ title: "Running Job", status: "running" });
    render(<SessionSidebar {...baseProps} blockedBy={blocker} />);
    expect(screen.getByText(/Running Job/)).toBeInTheDocument();
  });

  it("renders sessions grouped by status", () => {
    const running = makeSession({ id: "s1", title: "Active One", status: "running", updated_at: new Date().toISOString() });
    const today = makeSession({ id: "s2", title: "Today One", status: "completed", updated_at: new Date().toISOString() });
    render(<SessionSidebar {...baseProps} sessions={[running, today]} activeSessionId="s1" />);
    expect(screen.getByText("Active One")).toBeInTheDocument();
    expect(screen.getByText("Today One")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("renders older sessions", () => {
    const old = makeSession({ id: "s3", title: "Old One", status: "completed", updated_at: "2020-01-01T00:00:00Z" });
    render(<SessionSidebar {...baseProps} sessions={[old]} />);
    expect(screen.getByText("Old One")).toBeInTheDocument();
    expect(screen.getByText("Older")).toBeInTheDocument();
  });

  it("renders yesterday sessions", () => {
    const yesterday = new Date(Date.now() - 86400000);
    yesterday.setHours(12, 0, 0, 0);
    const s = makeSession({ id: "s4", title: "Yesterday One", status: "completed", updated_at: yesterday.toISOString() });
    render(<SessionSidebar {...baseProps} sessions={[s]} />);
    expect(screen.getByText("Yesterday One")).toBeInTheDocument();
  });

  it("calls onSelect when clicking a session", () => {
    const s = makeSession({ id: "s1", title: "Click Me" });
    render(<SessionSidebar {...baseProps} sessions={[s]} />);
    fireEvent.click(screen.getByText("Click Me"));
    expect(baseProps.onSelect).toHaveBeenCalledWith("s1");
  });

  it("shows job info on session row", () => {
    const s = makeSession({ id: "s1", title: "With Job", job: { title: "Engineer", company: "Acme" } });
    render(<SessionSidebar {...baseProps} sessions={[s]} />);
    expect(screen.getByText(/Engineer @ Acme/)).toBeInTheDocument();
  });

  it("shows auto mode icon for auto sessions", () => {
    const s = makeSession({ id: "s1", title: "Auto Session", mode: "auto" });
    render(<SessionSidebar {...baseProps} sessions={[s]} />);
    expect(screen.getByText("Auto Session")).toBeInTheDocument();
  });

  it("shows running status text for active sessions without job", () => {
    const s = makeSession({ id: "s1", title: "Running", status: "running" });
    render(<SessionSidebar {...baseProps} sessions={[s]} />);
    expect(screen.getByText("running…")).toBeInTheDocument();
  });

  it("shows 'no job attached' for idle sessions without job", () => {
    const s = makeSession({ id: "s1", title: "Idle", status: "idle" });
    render(<SessionSidebar {...baseProps} sessions={[s]} />);
    expect(screen.getByText("no job attached")).toBeInTheDocument();
  });
});
