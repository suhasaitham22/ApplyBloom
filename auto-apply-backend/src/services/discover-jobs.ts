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

interface JobSourceAdapter {
  name: string;
  search(query: string): Promise<DiscoveredJob[]>;
}

const defaultCatalog: DiscoveredJob[] = [
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

const defaultAdapters: JobSourceAdapter[] = [
  {
    name: "internal-catalog",
    async search(query: string) {
      const normalizedQuery = query.toLowerCase();
      return defaultCatalog.filter((job) => {
        const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
        return haystack.includes(normalizedQuery) || normalizedQuery.length === 0;
      });
    },
  },
];

export async function discoverJobs(query: string): Promise<DiscoveredJob[]> {
  const normalizedQuery = query.trim();
  const jobs = await runSourceAdapters(normalizedQuery, defaultAdapters);
  return dedupeJobs(jobs).sort(byPostedAtDescending);
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

function byPostedAtDescending(a: DiscoveredJob, b: DiscoveredJob) {
  return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
}
