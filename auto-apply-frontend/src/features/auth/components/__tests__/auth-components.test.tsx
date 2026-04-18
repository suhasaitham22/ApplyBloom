import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
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
vi.mock("@/lib/supabase/browser", () => ({
  getSupabaseBrowserClient: vi.fn(() => null),
  isSupabaseConfigured: vi.fn(() => false),
}));

// ── AuthForm ──────────────────────────────────────────────────────────
import { AuthForm } from "../auth-form";

describe("AuthForm", () => {
  it("renders login mode with email input and buttons", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("Send magic link")).toBeInTheDocument();
    expect(screen.getByText(/Continue with Google/)).toBeInTheDocument();
    expect(screen.getByText(/Sign up/)).toBeInTheDocument();
  });

  it("renders signup mode", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText("Create account")).toBeInTheDocument();
    expect(screen.getByText(/Sign in/)).toBeInTheDocument();
  });

  it("shows demo button when supabase not configured", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByText("Continue as demo user")).toBeInTheDocument();
  });

  it("handles email submit when supabase not configured", async () => {
    const { toast } = await import("sonner");
    render(<AuthForm mode="login" />);
    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "test@test.com" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("Supabase not configured"));
    });
  });

  it("Google button is disabled when not configured", () => {
    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByText(/Continue with Google/).closest("button");
    expect(googleBtn).toBeDisabled();
  });

  it("handles demo login", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });
    render(<AuthForm mode="login" />);
    fireEvent.click(screen.getByText("Continue as demo user"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/demo-login", { method: "POST" });
    });
  });

  it("handles demo login failure", async () => {
    const { toast } = await import("sonner");
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
    render(<AuthForm mode="login" />);
    fireEvent.click(screen.getByText("Continue as demo user"));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

// ── AuthShell ──────────────────────────────────────────────────────────
import { AuthShell } from "../auth-shell";

describe("AuthShell", () => {
  it("renders title, subtitle, and children", () => {
    render(
      <AuthShell title="Welcome" subtitle="Please sign in">
        <div>child content</div>
      </AuthShell>,
    );
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Please sign in")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <AuthShell title="T" subtitle="S" footer={<span>footer text</span>}>
        <div />
      </AuthShell>,
    );
    expect(screen.getByText("footer text")).toBeInTheDocument();
  });
});

// ── CallbackHashHandler ───────────────────────────────────────────────
import { CallbackHashHandler } from "../callback-hash-handler";

describe("CallbackHashHandler", () => {
  it("shows error when no supabase client", async () => {
    render(<CallbackHashHandler />);
    await waitFor(() => {
      expect(screen.getByText("Sign-in failed")).toBeInTheDocument();
      expect(screen.getByText("Supabase not configured")).toBeInTheDocument();
    });
  });
});

// ── GlobalHashAuthHandler ─────────────────────────────────────────────
import { GlobalHashAuthHandler } from "../global-hash-auth-handler";

describe("GlobalHashAuthHandler", () => {
  it("renders null (no hash)", () => {
    const { container } = render(<GlobalHashAuthHandler />);
    expect(container.innerHTML).toBe("");
  });
});
