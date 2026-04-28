// Fan out to every adapter in parallel, dedupe by apply_url.
// Failures per source are swallowed so one bad source doesn't kill discovery.

import type { JobSourceAdapter, NormalizedJob, SourceFetchOptions } from "./types";
import { greenhouseAdapter } from "./greenhouse";
import { leverAdapter } from "./lever";
import { remotiveAdapter } from "./remotive";
import { arbeitnowAdapter } from "./arbeitnow";

export const ALL_ADAPTERS: JobSourceAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  remotiveAdapter,
  arbeitnowAdapter,
];

export interface AggregateResult {
  jobs: NormalizedJob[];
  perSource: Record<string, number>;
  errors: Record<string, string>;
}

/**
 * Fetch all sources in parallel, dedupe by apply_url, return merged list.
 *
 * perSourceOpts lets callers override limits per source, e.g. fewer remotive jobs
 * (since they don't drive ATS applies).
 */
export async function aggregateJobs(
  opts: {
    perSourceOpts?: Partial<Record<string, SourceFetchOptions>>;
    adapters?: JobSourceAdapter[];
  } = {},
): Promise<AggregateResult> {
  const adapters = opts.adapters ?? ALL_ADAPTERS;
  const perSource: Record<string, number> = {};
  const errors: Record<string, string> = {};

  const results = await Promise.all(
    adapters.map(async (a) => {
      try {
        const rows = await a.fetch(opts.perSourceOpts?.[a.name]);
        perSource[a.name] = rows.length;
        return rows;
      } catch (e) {
        errors[a.name] = e instanceof Error ? e.message : String(e);
        perSource[a.name] = 0;
        return [] as NormalizedJob[];
      }
    }),
  );

  const merged: NormalizedJob[] = [];
  const seen = new Set<string>();
  for (const rows of results) {
    for (const row of rows) {
      const key = row.apply_url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
  }

  return { jobs: merged, perSource, errors };
}
