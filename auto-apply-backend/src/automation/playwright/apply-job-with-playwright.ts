import { chromium, type Browser, type Page } from "playwright";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type JobApplicationProvider = "greenhouse" | "lever" | "generic";

export interface BrowserApplicationRequest {
  job_url: string;
  job_title: string;
  company: string;
  candidate_answers?: Record<string, string>;
  resume_pdf_path?: string;
  resume_pdf_base64?: string;
  headless?: boolean;
}

export interface BrowserApplicationResult {
  submitted: boolean;
  provider: JobApplicationProvider;
  external_reference: string | null;
  steps: string[];
  error_message: string | null;
}

export function detectJobProvider(jobUrl: string, source?: string): JobApplicationProvider {
  const normalized = `${jobUrl} ${source ?? ""}`.toLowerCase();

  if (normalized.includes("greenhouse")) {
    return "greenhouse";
  }

  if (normalized.includes("lever")) {
    return "lever";
  }

  return "generic";
}

export async function applyJobWithPlaywright(
  request: BrowserApplicationRequest,
): Promise<BrowserApplicationResult> {
  const provider = detectJobProvider(request.job_url);
  const browser = await chromium.launch({
    headless: request.headless ?? true,
  });

  let tempResumePath: string | null = null;

  try {
    const page = await createPage(browser);
    tempResumePath = await resolveResumePath(request);

    await page.goto(request.job_url, { waitUntil: "domcontentloaded" });
    const steps = [`Opened ${request.job_url}`];

    if (provider === "greenhouse") {
      await applyGreenhouseStrategy(page, tempResumePath, request.candidate_answers ?? {});
      steps.push("Used Greenhouse application strategy");
    } else if (provider === "lever") {
      await applyLeverStrategy(page, tempResumePath, request.candidate_answers ?? {});
      steps.push("Used Lever application strategy");
    } else {
      await applyGenericStrategy(page, tempResumePath, request.candidate_answers ?? {});
      steps.push("Used generic application strategy");
    }

    steps.push("Attempted submission");

    return {
      submitted: true,
      provider,
      external_reference: `${provider}:${request.company}:${request.job_title}`.toLowerCase(),
      steps,
      error_message: null,
    };
  } catch (error) {
    return {
      submitted: false,
      provider,
      external_reference: null,
      steps: [`Opened ${request.job_url}`],
      error_message: error instanceof Error ? error.message : "Browser automation failed",
    };
  } finally {
    try {
      await browser.close();
    } catch {
      // Ignore browser shutdown failures to avoid masking result handling.
    }
    if (tempResumePath) {
      await rm(tempResumePath, { force: true, recursive: true }).catch(() => undefined);
    }
  }
}

async function createPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

async function resolveResumePath(request: BrowserApplicationRequest) {
  if (request.resume_pdf_path) {
    return request.resume_pdf_path;
  }

  if (!request.resume_pdf_base64) {
    throw new Error("A resume PDF path or base64 payload is required");
  }

  const directory = await mkdtemp(join(tmpdir(), "applybloom-resume-"));
  const path = join(directory, "resume.pdf");
  await writeFile(path, Buffer.from(request.resume_pdf_base64, "base64"));
  return path;
}

async function applyGreenhouseStrategy(page: Page, resumePath: string, answers: Record<string, string>) {
  await uploadResumeIfPresent(page, resumePath);
  await fillCommonFields(page, answers);
  await clickPrimaryApplyAction(page);
}

async function applyLeverStrategy(page: Page, resumePath: string, answers: Record<string, string>) {
  await uploadResumeIfPresent(page, resumePath);
  await fillCommonFields(page, answers);
  await clickPrimaryApplyAction(page);
}

async function applyGenericStrategy(page: Page, resumePath: string, answers: Record<string, string>) {
  await uploadResumeIfPresent(page, resumePath);
  await fillCommonFields(page, answers);
  await clickPrimaryApplyAction(page);
}

async function uploadResumeIfPresent(page: Page, resumePath: string) {
  const fileInputs = page.locator('input[type="file"]');
  if ((await fileInputs.count()) === 0) {
    return;
  }

  await fileInputs.first().setInputFiles(resumePath);
}

async function fillCommonFields(page: Page, answers: Record<string, string>) {
  const labelMap: Record<string, string[]> = {
    first_name: ["First name", "First Name", "Given name"],
    last_name: ["Last name", "Last Name", "Surname"],
    email: ["Email", "Email address"],
    phone: ["Phone", "Phone number", "Mobile"],
    location: ["Location", "City"],
    linkedin: ["LinkedIn", "LinkedIn URL", "LinkedIn profile"],
    portfolio: ["Portfolio", "Website", "Personal website"],
  };

  for (const [answerKey, labels] of Object.entries(labelMap)) {
    const value = answers[answerKey];
    if (!value) {
      continue;
    }

    for (const label of labels) {
      const field = page.getByLabel(label);
      if ((await field.count()) === 0) {
        continue;
      }

      await field.first().fill(value);
      break;
    }
  }
}

async function clickPrimaryApplyAction(page: Page) {
  const selectors = [
    page.getByRole("button", { name: /apply/i }),
    page.getByRole("button", { name: /submit/i }),
    page.getByRole("button", { name: /next/i }),
    page.getByText(/apply/i),
    page.getByText(/submit/i),
  ];

  for (const selector of selectors) {
    if ((await selector.count()) === 0) {
      continue;
    }

    await selector.first().click();
    return;
  }

  throw new Error("No primary application action was found");
}
