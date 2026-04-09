import type { TailoredResumeDocument } from "@/services/tailor-resume";

export interface RenderedResumePdf {
  file_name: string;
  content_type: "application/pdf";
  base64_pdf: string;
}

export async function renderResumePdf(resumeJson: TailoredResumeDocument): Promise<RenderedResumePdf> {
  const lines = [
    resumeJson.headline,
    "",
    resumeJson.summary,
    "",
    `Skills: ${resumeJson.skills.join(", ")}`,
    "",
    ...resumeJson.sections.flatMap((section) => [
      section.section_name,
      ...section.lines,
      "",
    ]),
  ].filter((line) => line !== undefined);

  const pdf = buildMinimalPdf(lines.map(escapePdfText));

  return {
    file_name: "tailored-resume.pdf",
    content_type: "application/pdf",
    base64_pdf: encodeBase64(pdf),
  };
}

function buildMinimalPdf(lines: string[]) {
  const textStream = [
    "BT",
    "/F1 12 Tf",
    "72 720 Td",
    ...lines.flatMap((line, index) => {
      const prefix = index === 0 ? "" : "0 -16 Td";
      const text = `(${line}) Tj`;
      return prefix ? [prefix, text] : [text];
    }),
    "ET",
  ].join("\n");

  const objectBodies = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    `5 0 obj << /Length ${textStream.length} >> stream\n${textStream}\nendstream endobj\n`,
  ];

  const header = "%PDF-1.4\n";
  const offsets: number[] = [0];
  let cursor = header.length;
  const objectStrings: string[] = [];

  for (const body of objectBodies) {
    offsets.push(cursor);
    objectStrings.push(body);
    cursor += body.length;
  }

  const xrefStart = header.length + objectStrings.join("").length;
  const xrefEntries = offsets
    .map((offset, index) =>
      index === 0
        ? "0000000000 65535 f \n"
        : `${offset.toString().padStart(10, "0")} 00000 n \n`,
    )
    .join("");

  return [
    header,
    ...objectStrings,
    "xref\n",
    `0 ${offsets.length}\n`,
    xrefEntries,
    `trailer << /Root 1 0 R /Size ${offsets.length} >>\n`,
    "startxref\n",
    `${xrefStart}\n`,
    "%%EOF",
  ].join("");
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    const triplet = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[triplet & 63] : "=";
  }

  return output;
}
