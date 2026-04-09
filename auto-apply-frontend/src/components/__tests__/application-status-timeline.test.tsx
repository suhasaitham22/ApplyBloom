import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicationStatusTimeline } from "../application-status-timeline";

describe("ApplicationStatusTimeline", () => {
  it("renders the empty state", () => {
    render(<ApplicationStatusTimeline />);

    expect(screen.getByText("No applications yet.")).toBeInTheDocument();
  });
});
