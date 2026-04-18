import { describe, it, expect, beforeEach } from "vitest";
import { getResumeStorage } from "../resume-storage";

describe("resume-storage (memory adapter)", () => {
  const adapter = getResumeStorage({ DEMO_MODE: "true" });

  it("put stores a file and returns metadata", async () => {
    const data = new TextEncoder().encode("hello world").buffer;
    const result = await adapter.put({
      userId: "u1",
      resumeId: "r1",
      filename: "resume.pdf",
      contentType: "application/pdf",
      data: data as ArrayBuffer,
    });
    expect(result.storage_path).toBe("u1/r1/resume.pdf");
    expect(result.file_type).toBe("pdf");
    expect(result.bytes).toBe(11);
    expect(result.url).toMatch(/^data:application\/pdf;base64,/);
  });

  it("get retrieves stored file", async () => {
    const data = new TextEncoder().encode("test content").buffer;
    await adapter.put({
      userId: "u2",
      resumeId: "r2",
      filename: "doc.txt",
      contentType: "text/plain",
      data: data as ArrayBuffer,
    });
    const retrieved = await adapter.get("u2/r2/doc.txt");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.contentType).toBe("text/plain");
    expect(new TextDecoder().decode(retrieved!.data)).toBe("test content");
  });

  it("get returns null for missing file", async () => {
    expect(await adapter.get("nonexistent/path")).toBeNull();
  });

  it("delete removes file", async () => {
    const data = new TextEncoder().encode("x").buffer;
    await adapter.put({
      userId: "u3",
      resumeId: "r3",
      filename: "f.txt",
      contentType: "text/plain",
      data: data as ArrayBuffer,
    });
    expect(await adapter.delete("u3/r3/f.txt")).toBe(true);
    expect(await adapter.get("u3/r3/f.txt")).toBeNull();
  });

  it("delete returns false for missing file", async () => {
    expect(await adapter.delete("nope")).toBe(false);
  });

  it("signedUrl returns data URL", async () => {
    const data = new TextEncoder().encode("signed").buffer;
    await adapter.put({
      userId: "u4",
      resumeId: "r4",
      filename: "s.pdf",
      contentType: "application/pdf",
      data: data as ArrayBuffer,
    });
    const url = await adapter.signedUrl("u4/r4/s.pdf");
    expect(url).toMatch(/^data:/);
  });

  it("signedUrl returns null for missing file", async () => {
    expect(await adapter.signedUrl("missing")).toBeNull();
  });

  it("infers docx file type", async () => {
    const data = new TextEncoder().encode("x").buffer;
    const result = await adapter.put({
      userId: "u5",
      resumeId: "r5",
      filename: "resume.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      data: data as ArrayBuffer,
    });
    expect(result.file_type).toBe("docx");
  });

  it("infers txt file type", async () => {
    const data = new TextEncoder().encode("x").buffer;
    const result = await adapter.put({
      userId: "u6",
      resumeId: "r6",
      filename: "resume.txt",
      contentType: "text/plain",
      data: data as ArrayBuffer,
    });
    expect(result.file_type).toBe("txt");
  });

  it("infers other file type", async () => {
    const data = new TextEncoder().encode("x").buffer;
    const result = await adapter.put({
      userId: "u7",
      resumeId: "r7",
      filename: "resume.zip",
      contentType: "application/zip",
      data: data as ArrayBuffer,
    });
    expect(result.file_type).toBe("other");
  });
});

describe("getResumeStorage dispatcher", () => {
  it("returns memory adapter in DEMO_MODE", () => {
    const adapter = getResumeStorage({ DEMO_MODE: "true" });
    expect(adapter).toBeTruthy();
  });

  it("returns memory adapter when no Supabase credentials", () => {
    const adapter = getResumeStorage({});
    expect(adapter).toBeTruthy();
  });
});
