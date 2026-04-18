"use client";

// Extract plain text from a PDF / DOCX / TXT file, fully client-side.
// PDF: pdfjs-dist. DOCX: mammoth. TXT: FileReader.

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "text/plain" || name.endsWith(".txt")) {
    return await file.text();
  }
  if (name.endsWith(".docx") || type.includes("officedocument.wordprocessingml")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return (result.value ?? "").trim();
  }
  if (name.endsWith(".pdf") || type === "application/pdf") {
    // pdfjs-dist (v5) — use legacy build to avoid worker setup hassle
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Disable worker for simplicity — runs on main thread (fine for <= 20-page resumes)
    pdfjs.GlobalWorkerOptions.workerSrc = "";
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({
      data: buf,
      useSystemFonts: true,
    }).promise;
    const lines: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .filter(Boolean)
        .join(" ");
      lines.push(text);
    }
    return lines.join("\n\n").replace(/\s+\n/g, "\n").trim();
  }
  throw new Error(`Unsupported file type: ${type || name}`);
}
