import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumeUploadForm } from "../resume-upload-form";

describe("ResumeUploadForm", () => {
  it("renders the upload form", () => {
    render(<ResumeUploadForm />);

    expect(screen.getByLabelText("Resume")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload resume" })).toBeInTheDocument();
  });
});

