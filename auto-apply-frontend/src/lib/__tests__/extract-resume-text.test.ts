import { describe, it, expect, vi } from "vitest";

vi.mock("mammoth", () => ({
  extractRawText: vi.fn().mockResolvedValue({ value: "DOCX content" }),
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  version: "4.0.0",
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: "PDF" }, { str: "text" }],
        }),
      }),
    }),
  }),
}));

import { extractResumeText } from "../extract-resume-text";

function makeFile(content: string | ArrayBuffer, name: string, type: string) {
  const blob = typeof content === "string" ? new Blob([content], { type }) : new Blob([content], { type });
  return Object.assign(blob, {
    name,
    lastModified: Date.now(),
    webkitRelativePath: "",
    text: () => Promise.resolve(typeof content === "string" ? content : ""),
    arrayBuffer: () => Promise.resolve(typeof content === "string" ? new TextEncoder().encode(content).buffer : content),
  }) as unknown as File;
}

describe("extractResumeText (lib)", () => {
  it("handles .txt files", async () => {
    const file = makeFile("hello", "test.txt", "text/plain");
    expect(await extractResumeText(file)).toBe("hello");
  });

  it("handles .docx files", async () => {
    const file = makeFile(new ArrayBuffer(10), "test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(await extractResumeText(file)).toBe("DOCX content");
  });

  it("handles .pdf files", async () => {
    const file = makeFile(new ArrayBuffer(10), "test.pdf", "application/pdf");
    const result = await extractResumeText(file);
    expect(result).toContain("PDF");
  });

  it("throws on unsupported file type", async () => {
    const file = makeFile("data", "test.zip", "application/zip");
    await expect(extractResumeText(file)).rejects.toThrow(/Unsupported/);
  });
});
