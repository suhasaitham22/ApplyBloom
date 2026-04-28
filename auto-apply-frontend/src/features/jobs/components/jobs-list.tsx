"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listJobMatches, refreshJobs, updateJobMatchStatus, applyFromMatch,
  type JobMatch, type JobMatchStatus,
} from "@/features/studio/lib/studio-client";

const FILTERS: Array<{ key: JobMatchStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "queued_apply", label: "Queued" },
  { key: "applied", label: "Applied" },
  { key: "rejected", label: "Rejected" },
];

function scorePct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function scoreTone(score: number): string {
  if (score >= 0.7) return "bg-emerald-100 text-emerald-900";
  if (score >= 0.5) return "bg-amber-100 text-amber-900";
  return "bg-neutral-100 text-neutral-700";
}

export function JobsList() {
  const [items, setItems] = useState<JobMatch[]>([]);
  const [filter, setFilter] = useState<JobMatchStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const { items: next } = await listJobMatches({ limit: 200 });
      setItems(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (!q) return true;
      const blob = `${m.job.title} ${m.job.company ?? ""} ${m.job.location ?? ""} ${m.job.tags.join(" ")}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, filter, query]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const res = await refreshJobs();
      toast.success(`Found ${res.discovered} jobs, ${res.matched} matches`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function onStatus(id: string, status: JobMatchStatus) {
    try {
      await updateJobMatchStatus(id, status);
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function onApply(id: string) {
    try {
      await applyFromMatch(id);
      toast.success("Queued for apply");
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, status: "queued_apply" } : m)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Search jobs"
          className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Search title, company, skill…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs ${
                filter === f.key ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="ml-auto rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-400 disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Discover new jobs"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-md border border-neutral-200 bg-white p-6 text-sm text-neutral-500">Loading matches…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          No matches yet. Click <span className="font-medium">Discover new jobs</span> to fetch from sources.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => (
            <li key={m.id} className="rounded-md border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreTone(m.score)}`}>
                  {scorePct(m.score)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="truncate text-sm font-semibold text-neutral-900">{m.job.title}</h3>
                    <span className="text-xs text-neutral-500">{m.job.company ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-neutral-500">
                    {m.job.location && <span>{m.job.location}</span>}
                    {m.job.remote && <span className="text-emerald-700">Remote</span>}
                    {m.job.salary_min != null && (
                      <span>${Math.round(m.job.salary_min / 1000)}k+</span>
                    )}
                    <span className="text-neutral-400">· {m.job.source}</span>
                  </div>
                  {m.job.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.job.tags.slice(0, 6).map((t) => (
                        <span key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {m.status === "new" && (
                    <>
                      <button
                        type="button"
                        onClick={() => onApply(m.id)}
                        className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                      >
                        Apply
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onStatus(m.id, "saved")}
                          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatus(m.id, "rejected")}
                          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
                        >
                          Skip
                        </button>
                      </div>
                    </>
                  )}
                  {m.status === "saved" && (
                    <button
                      type="button"
                      onClick={() => onApply(m.id)}
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                    >
                      Apply
                    </button>
                  )}
                  {m.status === "queued_apply" && (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900">Queued</span>
                  )}
                  {m.status === "applied" && (
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-900">Applied</span>
                  )}
                  {m.status === "rejected" && (
                    <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-500">Skipped</span>
                  )}
                  <a
                    href={m.job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center text-[11px] text-neutral-500 underline hover:text-neutral-800"
                  >
                    View posting
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
