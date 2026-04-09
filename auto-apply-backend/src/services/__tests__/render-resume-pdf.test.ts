import { describe, expect, it } from "vitest";
import { renderResumePdf } from "../render-resume-pdf";

describe("renderResumePdf", () => {
  it("renders a base64 encoded pdf payload", async () => {
    const rendered = await renderResumePdf({
      headline: "Backend Engineer",
      summary: "Backend engineer summary",
      skills: ["TypeScript", "Postgres"],
      sections: [
        { section_name: "Experience", lines: ["Worked on APIs"] },
        { section_name: "Education", lines: ["BS Computer Science"] },
      ],
      change_summary: [],
    });

    expect(rendered.file_name).toBe("tailored-resume.pdf");
    expect(rendered.content_type).toBe("application/pdf");
    expect(rendered.base64_pdf.length).toBeGreaterThan(0);
    expect(atob(rendered.base64_pdf).startsWith("%PDF-1.4")).toBe(true);
  });
});
