import { describe, it, expect, vi } from "vitest";

vi.mock("mammoth/mammoth.browser", () => ({
  extractRawText: vi.fn().mockResolvedValue({ value: "  Extracted DOCX text  " }),
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: "Page" }, { str: "content" }],
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

describe("extractResumeText", () => {
  it("handles .txt files by type", async () => {
    const file = makeFile("hello world", "resume.txt", "text/plain");
    const result = await extractResumeText(file);
    expect(result).toBe("hello world");
  });

  it("handles .txt files by extension", async () => {
    const file = makeFile("content", "notes.txt", "");
    const result = await extractResumeText(file);
    expect(result).toBe("content");
  });

  it("handles .docx files by type", async () => {
    const file = makeFile(new ArrayBuffer(10), "resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    const result = await extractResumeText(file);
    expect(result).toBe("Extracted DOCX text");
  });

  it("handles .docx by extension", async () => {
    const file = makeFile(new ArrayBuffer(5), "resume.docx", "");
    const result = await extractResumeText(file);
    expect(result).toBe("Extracted DOCX text");
  });

  it("handles .pdf files by type", async () => {
    const file = makeFile(new ArrayBuffer(10), "resume.pdf", "application/pdf");
    const result = await extractResumeText(file);
    expect(result).toContain("Page content");
  });

  it("handles .pdf by extension", async () => {
    const file = makeFile(new ArrayBuffer(5), "resume.pdf", "");
    const result = await extractResumeText(file);
    expect(result).toContain("Page content");
  });

  it("throws for unsupported file type", async () => {
    const file = makeFile("data", "resume.xyz", "application/octet-stream");
    await expect(extractResumeText(file)).rejects.toThrow(/Unsupported file type/);
  });
});
