import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "../app-shell";

describe("AppShell", () => {
  it("renders the application shell", () => {
    render(
      <AppShell title="Dashboard">
        <div>Child content</div>
      </AppShell>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});

