"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Sparkles, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listResumeVersions,
  restoreResumeVersion,
  type ResumeVersion,
  type Resume,
} from "@/features/studio/lib/studio-client";

interface Props {
  resumeId: string;
  onRestored?: (resume: Resume) => void;
  /** Increment to trigger a reload — bump after every edit */
  refreshKey?: number;
}

export function ResumeVersionHistory({ resumeId, onRestored, refreshKey = 0 }: Props) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { versions: v } = await listResumeVersions(resumeId);
        if (mounted) setVersions(v);
      } catch {
        /* non-fatal */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [resumeId, refreshKey]);

  async function handleRestore(v: number) {
    if (!confirm(`Restore to version ${v}? This creates a new version — nothing is lost.`)) return;
    setRestoring(v);
    try {
      const { resume } = await restoreResumeVersion(resumeId, v);
      toast.success(`Restored to v${v}`);
      onRestored?.(resume);
      // reload list to show the new restore-version
      const { versions: vv } = await listResumeVersions(resumeId);
      setVersions(vv);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading history…
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        <History className="mx-auto mb-2 h-4 w-4" />
        No versions yet. Edits you or the AI make will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-3 w-3" /> Version history
        </p>
        <span className="text-[10px] text-muted-foreground tabular-nums">{versions.length}</span>
      </div>
      <ol className="space-y-1">
        {versions.map((v, idx) => {
          const isLatest = idx === 0;
          return (
            <li
              key={v.id}
              className={`group rounded-md border p-2 text-xs transition-colors ${
                isLatest
                  ? "border-[hsl(var(--brand-amber)/0.5)] bg-[hsl(var(--brand-amber)/0.06)]"
                  : "border-border hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="tabular-nums text-foreground">v{v.version}</span>
                    {isLatest && <span className="rounded-full bg-[hsl(var(--brand-amber))] px-1.5 py-0 text-[9px] font-semibold uppercase text-[hsl(var(--brand-navy))]">current</span>}
                    {v.created_by === "ai" ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-[hsl(var(--brand-navy))]"><Sparkles className="h-2.5 w-2.5" /> AI</span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><UserIcon className="h-2.5 w-2.5" /> You</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {v.change_summary || v.diff_summary || "snapshot"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {formatRelative(v.created_at)}
                  </p>
                </div>
                {!isLatest && (
                  <button
                    onClick={() => handleRestore(v.version)}
                    disabled={restoring === v.version}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] transition-all hover:border-[hsl(var(--brand-navy)/0.4)] disabled:opacity-50"
                    title={`Restore v${v.version}`}
                  >
                    {restoring === v.version ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RotateCcw className="h-2.5 w-2.5" />}
                    Restore
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
