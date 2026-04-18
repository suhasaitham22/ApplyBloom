import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

beforeAll(() => {
  window.matchMedia = window.matchMedia || vi.fn().mockImplementation((q) => ({
    matches: false, media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const React = require("react");
    const { fill, priority, ...rest } = props;
    return React.createElement("img", rest);
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), message: vi.fn() },
}));

const mockSession = {
  id: "s1", user_id: "u1", resume_id: "r1", mode: "single", status: "idle",
  title: "Test Session", job: null, tailored_resume_id: null, application_id: null,
  locked_at: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
};
const mockResume = {
  id: "r1", user_id: "u1", name: "Resume", parsed: null, raw_text: "text",
  created_at: "2024-01-01T00:00:00Z", is_base: true,
};

vi.mock("@/features/studio/lib/studio-client", () => ({
  listResumes: vi.fn().mockResolvedValue({ resumes: [{ id: "r1", user_id: "u1", name: "Resume", parsed: null, raw_text: "text", created_at: "2024-01-01T00:00:00Z", is_base: true }] }),
  listSessions: vi.fn().mockResolvedValue({ sessions: [{ id: "s1", user_id: "u1", resume_id: "r1", mode: "single", status: "idle", title: "Test Session", job: null, tailored_resume_id: null, application_id: null, locked_at: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }] }),
  getSession: vi.fn().mockResolvedValue({ session: { id: "s1", user_id: "u1", resume_id: "r1", mode: "single", status: "idle", title: "Test Session", job: null, tailored_resume_id: null, application_id: null, locked_at: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }, messages: [{ id: "m1", session_id: "s1", role: "assistant", content: "Hello!", created_at: "2024-01-01T00:00:00Z" }] }),
  createSession: vi.fn().mockResolvedValue({ session: { id: "s2", user_id: "u1", resume_id: null, mode: "single", status: "idle", title: "New session", job: null, tailored_resume_id: null, application_id: null, locked_at: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } }),
  createResume: vi.fn().mockResolvedValue({ resume: { id: "r2", user_id: "u1", name: "New", parsed: null, raw_text: "new text", created_at: "2024-01-01T00:00:00Z", is_base: false } }),
  updateResume: vi.fn().mockResolvedValue({ resume: { id: "r1", user_id: "u1", name: "Updated", parsed: { full_name: "John" }, raw_text: "text", created_at: "2024-01-01T00:00:00Z", is_base: true } }),
  updateSession: vi.fn().mockResolvedValue({ session: { id: "s1", user_id: "u1", resume_id: "r1", mode: "single", status: "idle", title: "Test Session", job: null, tailored_resume_id: null, application_id: null, locked_at: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" } }),
  sendMessage: vi.fn().mockResolvedValue({ messages: [{ id: "m2", session_id: "s1", role: "user", content: "hi", created_at: "2024-01-01T00:00:00Z" }, { id: "m3", session_id: "s1", role: "assistant", content: "reply", created_at: "2024-01-01T00:00:00Z" }] }),
  applySession: vi.fn().mockResolvedValue({ submitted: true, session: { id: "s1", status: "running" } }),
  parseResume: vi.fn().mockResolvedValue({ data: { full_name: "John Doe" } }),
  pauseSessionApi: vi.fn().mockResolvedValue({ session: { id: "s1", status: "paused" } }),
  resumeSessionApi: vi.fn().mockResolvedValue({ session: { id: "s1", status: "running" } }),
  cancelSession: vi.fn().mockResolvedValue({ session: { id: "s1", status: "cancelled" } }),
}));

vi.mock("@/features/studio/lib/extract-resume-text", () => ({
  extractResumeText: vi.fn().mockResolvedValue("Extracted resume text content"),
}));

describe("StudioShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders and loads session content", async () => {
    // Fresh import to reset bootstrap flag
    vi.resetModules();
    const mod = await import("../studio-shell");
    render(<mod.StudioShell sessionId="s1" />);
    
    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders header and sidebar elements", async () => {
    vi.resetModules();
    const mod = await import("../studio-shell");
    render(<mod.StudioShell sessionId="s1" />);
    
    await waitFor(() => {
      expect(screen.getByText("Bloom")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("renders with null sessionId", async () => {
    vi.resetModules();
    const mod = await import("../studio-shell");
    render(<mod.StudioShell sessionId={null} />);
    
    await waitFor(() => {
      // Should still render — bootstrap creates a session
      expect(screen.getByText(/New session/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders resume tab", async () => {
    vi.resetModules();
    const mod = await import("../studio-shell");
    render(<mod.StudioShell sessionId="s1" />);
    
    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
