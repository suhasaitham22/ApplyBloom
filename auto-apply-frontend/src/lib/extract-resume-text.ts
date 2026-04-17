"use client";

// Client-side resume text extraction. Supports PDF, DOCX, TXT.
// Keeps heavy libs off the backend (which runs on Cloudflare Workers).

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type === "text/plain") {
    return await file.text();
  }
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjs as unknown as { version: string }).version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    return pages.join("\n\n");
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}
