import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JobMatchCard } from "../job-match-card";

describe("JobMatchCard", () => {
  it("renders placeholder content when no job is provided", () => {
    render(<JobMatchCard />);

    expect(screen.getByText("No job match loaded.")).toBeInTheDocument();
  });

  it("renders actions when a job is provided", () => {
    render(
      <JobMatchCard
        job={{
          id: "job_123",
          title: "Backend Engineer",
          company: "Example",
          location: "Remote",
          remote: true,
          reason: "skill overlap",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Tailor resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});
