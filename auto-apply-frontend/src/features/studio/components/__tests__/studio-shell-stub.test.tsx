import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import { StudioShellStub } from "../studio-shell-stub";

describe("StudioShellStub", () => {
  it("renders without session", () => {
    render(<StudioShellStub sessionId={null} />);
    expect(screen.getByText(/No session selected/)).toBeInTheDocument();
  });

  it("renders with session id", () => {
    render(<StudioShellStub sessionId="abc123" />);
    expect(screen.getByText(/Session: abc123/)).toBeInTheDocument();
  });

  it("renders mode buttons", () => {
    render(<StudioShellStub sessionId={null} />);
    expect(screen.getByText("Single apply")).toBeInTheDocument();
    expect(screen.getByText("Auto apply")).toBeInTheDocument();
  });

  it("renders resume tabs", () => {
    render(<StudioShellStub sessionId={null} />);
    expect(screen.getByText("Resume_2026.pdf")).toBeInTheDocument();
    expect(screen.getByText("Backend_v3.pdf")).toBeInTheDocument();
  });

  it("renders history items", () => {
    render(<StudioShellStub sessionId={null} />);
    expect(screen.getAllByText(/UX Designer/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PM @ Stripe/).length).toBeGreaterThan(0);
  });

  it("renders chat placeholder", () => {
    render(<StudioShellStub sessionId={null} />);
    expect(screen.getByText(/Chat, tailoring, and apply actions/)).toBeInTheDocument();
  });
});
