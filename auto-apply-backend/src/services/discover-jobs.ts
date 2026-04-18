export interface DiscoveredJob {
  id: string;
  source: string;
  source_job_id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  apply_url: string;
  posted_at: string;
  raw_payload: Record<string, unknown>;
}

export interface JobDiscoveryOptions {
  remoteOnly?: boolean;
  location?: string;
  sourceCountLimit?: number;
  greenhouseBoardTokens?: string[];
  leverCompanyTokens?: string[];
  fetchImpl?: typeof fetch;
}

interface JobSourceAdapter {
  name: string;
  search(query: string): Promise<DiscoveredJob[]>;
}

const demoCatalog: DiscoveredJob[] = [
  {
    id: "internal-001",
    source: "internal",
    source_job_id: "internal-001",
    title: "Backend Engineer",
    company: "Cloud Native Co",
    location: "Remote",
    remote: true,
    description:
      "Build backend services with TypeScript, Postgres, Redis, and cloud workflows.",
    apply_url: "https://example.com/jobs/internal-001",
    posted_at: new Date("2026-01-01T00:00:00Z").toISOString(),
    raw_payload: {},
  },
  {
    id: "internal-002",
    source: "internal",
    source_job_id: "internal-002",
    title: "Full Stack Engineer",
    company: "Applied Systems",
    location: "San Francisco, CA",
    remote: false,
    description:
      "Build product surfaces and APIs using Next.js, backend services, and automation.",
    apply_url: "https://example.com/jobs/internal-002",
    posted_at: new Date("2026-01-02T00:00:00Z").toISOString(),
    raw_payload: {},
  },
];

export async function discoverJobs(query: string, options: JobDiscoveryOptions = {}) {
  const normalizedQuery = query.trim();
  const adapters = buildJobSourceAdapters(options);
  const jobs = await runSourceAdapters(normalizedQuery, adapters);

  return dedupeJobs(
    filterJobsByUserPreferences(jobs, {
      remoteOnly: options.remoteOnly ?? false,
      location: options.location?.trim() ?? "",
    }),
  ).sort(byPostedAtDescending);
}

export function buildJobSourceAdapters(options: JobDiscoveryOptions = {}) {
  const adapters: JobSourceAdapter[] = [createInternalCatalogAdapter()];

  const greenhouseBoardTokens = normalizeTokenList(options.greenhouseBoardTokens ?? []);
  if (greenhouseBoardTokens.length > 0) {
    adapters.push(
      createGreenhouseBoardAdapter({
        boardTokens: greenhouseBoardTokens,
        fetchImpl: options.fetchImpl ?? fetch,
      }),
    );
  }

  const leverCompanyTokens = normalizeTokenList(options.leverCompanyTokens ?? []);
  if (leverCompanyTokens.length > 0) {
    adapters.push(
      createLeverBoardAdapter({
        companyTokens: leverCompanyTokens,
        fetchImpl: options.fetchImpl ?? fetch,
      }),
    );
  }

  return adapters;
}

export async function runSourceAdapters(
  query: string,
  adapters: JobSourceAdapter[],
): Promise<DiscoveredJob[]> {
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        return await adapter.search(query);
      } catch {
        return [];
      }
    }),
  );

  return results.flat();
}

export function dedupeJobs(jobs: DiscoveredJob[]) {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    const key = `${job.source}:${job.source_job_id}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createInternalCatalogAdapter(): JobSourceAdapter {
  return {
    name: "internal-catalog",
    async search(query: string) {
      const normalizedQuery = query.toLowerCase().trim();
      if (normalizedQuery.length === 0) return demoCatalog;
      // Token-based match: any token in the query that appears in the haystack scores a hit.
      const tokens = normalizedQuery
        .split(/[^a-z0-9+#.]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
      if (tokens.length === 0) return demoCatalog;
      return demoCatalog.filter((job) => {
        const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
        return tokens.some((t) => haystack.includes(t));
      });
    },
  };
}

export function createGreenhouseBoardAdapter(input: {
  boardTokens: string[];
  fetchImpl: typeof fetch;
}): JobSourceAdapter {
  return {
    name: "greenhouse",
    async search(query: string) {
      const jobs = await Promise.all(
        input.boardTokens.map(async (boardToken) => {
          const response = await input.fetchImpl(
            `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
          );

          if (!response.ok) {
            return [];
          }

          const body = (await response.json()) as { jobs?: unknown[] };
          return (body.jobs ?? [])
            .map((job) => normalizeGreenhouseJob(boardToken, job))
            .filter((job): job is DiscoveredJob => Boolean(job))
            .filter((job) => matchesQuery(job, query));
        }),
      );

      return jobs.flat();
    },
  };
}

export function createLeverBoardAdapter(input: {
  companyTokens: string[];
  fetchImpl: typeof fetch;
}): JobSourceAdapter {
  return {
    name: "lever",
    async search(query: string) {
      const jobs = await Promise.all(
        input.companyTokens.map(async (companyToken) => {
          const response = await input.fetchImpl(
            `https://api.lever.co/v0/postings/${encodeURIComponent(companyToken)}?mode=json`,
          );

          if (!response.ok) {
            return [];
          }

          const body = (await response.json()) as unknown[];
          return body
            .map((job) => normalizeLeverJob(companyToken, job))
            .filter((job): job is DiscoveredJob => Boolean(job))
            .filter((job) => matchesQuery(job, query));
        }),
      );

      return jobs.flat();
    },
  };
}

function normalizeGreenhouseJob(boardToken: string, job: unknown): DiscoveredJob | null {
  if (!job || typeof job !== "object") {
    return null;
  }

  const jobRecord = job as {
    id?: number | string;
    title?: string;
    location?: { name?: string };
    absolute_url?: string;
    content?: string;
    updated_at?: string;
    metadata?: Record<string, unknown>;
  };

  if (!jobRecord.id || !jobRecord.title || !jobRecord.absolute_url) {
    return null;
  }

  const location = jobRecord.location?.name ?? "";
  const description = jobRecord.content ?? "";

  return {
    id: `greenhouse:${boardToken}:${jobRecord.id}`,
    source: "greenhouse",
    source_job_id: `${jobRecord.id}`,
    title: jobRecord.title,
    company: boardToken,
    location,
    remote: /remote/i.test(`${location} ${description}`),
    description,
    apply_url: jobRecord.absolute_url,
    posted_at: jobRecord.updated_at ?? new Date().toISOString(),
    raw_payload: jobRecord.metadata ?? {},
  };
}

function normalizeLeverJob(companyToken: string, job: unknown): DiscoveredJob | null {
  if (!job || typeof job !== "object") {
    return null;
  }

  const jobRecord = job as {
    id?: string;
    text?: string;
    company?: string;
    location?: string;
    categories?: { location?: string };
    description?: string;
    hostedUrl?: string;
    createdAt?: number;
    lists?: unknown;
  };

  if (!jobRecord.id || !jobRecord.text || !jobRecord.hostedUrl) {
    return null;
  }

  const location = jobRecord.location ?? jobRecord.categories?.location ?? "";

  return {
    id: `lever:${companyToken}:${jobRecord.id}`,
    source: "lever",
    source_job_id: jobRecord.id,
    title: jobRecord.text,
    company: jobRecord.company ?? companyToken,
    location,
    remote: /remote/i.test(location),
    description: jobRecord.description ?? "",
    apply_url: jobRecord.hostedUrl,
    posted_at: jobRecord.createdAt ? new Date(jobRecord.createdAt).toISOString() : new Date().toISOString(),
    raw_payload: {},
  };
}

function filterJobsByUserPreferences(
  jobs: DiscoveredJob[],
  preferences: {
    remoteOnly: boolean;
    location: string;
  },
) {
  if (!preferences.remoteOnly && !preferences.location) {
    return jobs;
  }

  return jobs.filter((job) => {
    if (preferences.remoteOnly && !job.remote) {
      return false;
    }

    if (preferences.location) {
      const normalizedJobLocation = job.location.toLowerCase();
      const normalizedPreference = preferences.location.toLowerCase();
      return normalizedJobLocation.includes(normalizedPreference) || job.remote;
    }

    return true;
  });
}

function matchesQuery(job: DiscoveredJob, query: string) {
  const normalizedQuery = query.toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase();
  return haystack.includes(normalizedQuery);
}

function normalizeTokenList(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

function byPostedAtDescending(a: DiscoveredJob, b: DiscoveredJob) {
  return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
}
