import { describe, expect, it, vi } from "vitest";
import { applyJobWithPlaywright, detectJobProvider } from "../apply-job-with-playwright";

vi.mock("playwright", () => {
  return {
    chromium: {
      launch: vi.fn(),
    },
  };
});

import { chromium } from "playwright";

describe("detectJobProvider", () => {
  it("detects greenhouse and lever URLs", () => {
    expect(detectJobProvider("https://boards.greenhouse.io/acme/jobs/123")).toBe("greenhouse");
    expect(detectJobProvider("https://jobs.lever.co/acme/123")).toBe("lever");
    expect(detectJobProvider("https://example.com/jobs/123")).toBe("generic");
  });
});

describe("applyJobWithPlaywright", () => {
  it("uploads the resume and submits through the detected provider", async () => {
    const uploadResume = vi.fn();
    const clickApply = vi.fn();
    const goto = vi.fn();
    const close = vi.fn();

    const fileInputSelector = createSelector(1, { setInputFiles: uploadResume });
    const applySelector = createSelector(1, { click: clickApply });
    const emptySelector = createSelector(0, {});

    const page = {
      goto,
      locator: vi.fn().mockReturnValue(fileInputSelector),
      getByLabel: vi.fn().mockReturnValue(emptySelector),
      getByRole: vi.fn().mockReturnValue(applySelector),
      getByText: vi.fn().mockReturnValue(emptySelector),
    };

    const browser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(page),
      }),
      close,
    };

    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    const result = await applyJobWithPlaywright({
      job_url: "https://boards.greenhouse.io/acme/jobs/123",
      job_title: "Backend Engineer",
      company: "Acme",
      resume_pdf_path: "C:/tmp/resume.pdf",
      candidate_answers: {},
    });

    expect(result.submitted).toBe(true);
    expect(result.provider).toBe("greenhouse");
    expect(uploadResume).toHaveBeenCalledWith("C:/tmp/resume.pdf");
    expect(clickApply).toHaveBeenCalled();
    expect(goto).toHaveBeenCalledWith("https://boards.greenhouse.io/acme/jobs/123", {
      waitUntil: "domcontentloaded",
    });
    expect(close).toHaveBeenCalled();
  });

  it("returns a failure result when no primary action is available", async () => {
    const close = vi.fn();
    const page = {
      goto: vi.fn(),
      locator: vi.fn().mockReturnValue(createSelector(0, {})),
      getByLabel: vi.fn().mockReturnValue(createSelector(0, {})),
      getByRole: vi.fn().mockReturnValue(createSelector(0, {})),
      getByText: vi.fn().mockReturnValue(createSelector(0, {})),
    };

    const browser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(page),
      }),
      close,
    };

    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    const result = await applyJobWithPlaywright({
      job_url: "https://example.com/jobs/123",
      job_title: "Backend Engineer",
      company: "Acme",
      resume_pdf_path: "C:/tmp/resume.pdf",
      candidate_answers: {},
    });

    expect(result.submitted).toBe(false);
    expect(result.error_message).toContain("No primary application action");
  });
});

function createSelector(countValue: number, methods: Record<string, ReturnType<typeof vi.fn>>) {
  return {
    count: vi.fn().mockResolvedValue(countValue),
    first: vi.fn().mockReturnValue({
      fill: methods.fill ?? vi.fn(),
      click: methods.click ?? vi.fn(),
      setInputFiles: methods.setInputFiles ?? vi.fn(),
    }),
  };
}
