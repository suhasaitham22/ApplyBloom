"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  listApplies, pauseApply, cancelApply,
  type ApplyRecord, type ApplyStatus,
} from "@/features/studio/lib/studio-client";
import { useApplyEvents } from "@/features/apply/hooks/use-apply-events";

const LANES: Array<{ key: ApplyStatus; label: string; accent: string }> = [
  { key: "queued", label: "Queued", accent: "bg-neutral-100 text-neutral-700" },
  { key: "running", label: "Applying", accent: "bg-amber-100 text-amber-900" },
  { key: "needs_input", label: "Needs input", accent: "bg-rose-100 text-rose-900" },
  { key: "submitted", label: "Submitted", accent: "bg-emerald-100 text-emerald-900" },
  { key: "failed", label: "Failed", accent: "bg-neutral-200 text-neutral-700" },
];

export interface ApplyKanbanProps {
  sessionId: string | null;
}

export function ApplyKanban({ sessionId }: ApplyKanbanProps) {
  const [items, setItems] = useState<ApplyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const events = useApplyEvents(sessionId);

  const refresh = async () => {
    try {
      const { items: next } = await listApplies(sessionId ? { session_id: sessionId } : undefined);
      setItems(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load applies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sessionId]);
  // Any SSE event → refresh the list (cheap, also keeps us honest about server truth)
  useEffect(() => { if (events.length > 0) refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [events.length]);

  const byStatus = useMemo(() => {
    const m = new Map<ApplyStatus, ApplyRecord[]>();
    for (const lane of LANES) m.set(lane.key, []);
    for (const it of items) {
      const arr = m.get(it.status) ?? [];
      arr.push(it);
      m.set(it.status, arr);
    }
    return m;
  }, [items]);

  async function onPause(id: string) {
    try { await pauseApply(id); await refresh(); toast.success("Paused"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Pause failed"); }
  }
  async function onCancel(id: string) {
    try { await cancelApply(id); await refresh(); toast.success("Cancelled"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Cancel failed"); }
  }

  if (loading) return <div className="p-8 text-sm text-neutral-500">Loading applies...</div>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      {LANES.map((lane) => {
        const rows = byStatus.get(lane.key) ?? [];
        return (
          <section key={lane.key} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <header className="mb-3 flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lane.accent}`}>{lane.label}</span>
              <span className="text-xs text-neutral-500">{rows.length}</span>
            </header>
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm">
                  <div className="font-medium">{r.job_title ?? r.apply_url}</div>
                  <div className="text-xs text-neutral-500">{r.company ?? r.ats_provider}</div>
                  {r.error && <div className="mt-1 text-xs text-rose-600">{r.error}</div>}
                  <div className="mt-2 flex gap-2">
                    <Link href={r.apply_url} target="_blank" className="text-xs text-neutral-700 underline">Open</Link>
                    {(r.status === "queued" || r.status === "running" || r.status === "needs_input") && (
                      <>
                        <button className="text-xs text-neutral-700 underline" onClick={() => onPause(r.id)}>Pause</button>
                        <button className="text-xs text-rose-600 underline" onClick={() => onCancel(r.id)}>Cancel</button>
                      </>
                    )}
                  </div>
                </article>
              ))}
              {rows.length === 0 && <div className="text-xs text-neutral-400">Nothing here</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
