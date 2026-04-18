"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, MoreHorizontal, FileText, Zap, Pause, Play, X, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatSession } from "@/features/studio/lib/studio-client";

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  blockedBy: ChatSession | null;    // if another session is running
  mode: "single" | "auto";
  onModeChange: (m: "single" | "auto") => void;
}

export function SessionSidebar({
  sessions, activeSessionId, onSelect, onCreate, onRename, onPause, onResume, onCancel, blockedBy,
  mode, onModeChange,
}: Props) {
  const groups = useMemo(() => groupSessions(sessions), [sessions]);

  return (
    <aside className="flex flex-col border-r border-border/60 bg-background">
      {/* Mode selector — clearer, fills full width */}
      <div className="border-b border-border/60 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">How do you want to apply?</p>
        <div className="grid grid-cols-2 gap-1.5">
          <ModeCard
            active={mode === "single"}
            icon={<FileText className="h-4 w-4" />}
            title="Single"
            description="One job at a time"
            onClick={() => onModeChange("single")}
          />
          <ModeCard
            active={mode === "auto"}
            icon={<Zap className="h-4 w-4" />}
            title="Auto"
            description="Apply in bulk"
            onClick={() => onModeChange("auto")}
          />
        </div>
      </div>

      {/* New session — big, obvious */}
      <div className="border-b border-border/60 p-3">
        <Button
          onClick={onCreate}
          disabled={!!blockedBy}
          className="w-full justify-start gap-2"
          variant={blockedBy ? "secondary" : "default"}
          title={blockedBy ? `"${blockedBy.title}" is ${blockedBy.status}. Pause or cancel it to start a new one.` : undefined}
        >
          <Plus className="h-4 w-4" />
          New session
        </Button>
        {blockedBy && (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-600">
            "{blockedBy.title}" is {blockedBy.status}. Pause or cancel to start a new one.
          </p>
        )}
      </div>

      {/* Sessions grouped by bucket */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No sessions yet — click "New session" to begin.
          </p>
        ) : (
          <>
            {groups.active.length > 0 && (
              <SessionGroup label="Active" accent>
                {groups.active.map((s) => (
                  <SessionRow key={s.id} session={s} active={s.id === activeSessionId}
                    onSelect={onSelect} onRename={onRename}
                    onPause={onPause} onResume={onResume} onCancel={onCancel}
                  />
                ))}
              </SessionGroup>
            )}
            {groups.today.length > 0 && (
              <SessionGroup label="Today">
                {groups.today.map((s) => (
                  <SessionRow key={s.id} session={s} active={s.id === activeSessionId}
                    onSelect={onSelect} onRename={onRename}
                    onPause={onPause} onResume={onResume} onCancel={onCancel}
                  />
                ))}
              </SessionGroup>
            )}
            {groups.yesterday.length > 0 && (
              <SessionGroup label="Yesterday">
                {groups.yesterday.map((s) => (
                  <SessionRow key={s.id} session={s} active={s.id === activeSessionId}
                    onSelect={onSelect} onRename={onRename}
                    onPause={onPause} onResume={onResume} onCancel={onCancel}
                  />
                ))}
              </SessionGroup>
            )}
            {groups.older.length > 0 && (
              <SessionGroup label="Older">
                {groups.older.map((s) => (
                  <SessionRow key={s.id} session={s} active={s.id === activeSessionId}
                    onSelect={onSelect} onRename={onRename}
                    onPause={onPause} onResume={onResume} onCancel={onCancel}
                  />
                ))}
              </SessionGroup>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function ModeCard({ active, icon, title, description, onClick }: { active: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-md border p-2.5 text-left transition-all ${
        active
          ? "border-[hsl(var(--brand-navy))] bg-[hsl(var(--brand-navy))] text-white shadow-sm"
          : "border-border hover:border-[hsl(var(--brand-navy)/0.4)] hover:bg-secondary/50"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-white" : ""}`}>
        {icon}{title}
      </div>
      <p className={`text-[10px] ${active ? "text-white/70" : "text-muted-foreground"}`}>{description}</p>
    </button>
  );
}

function SessionGroup({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="mb-3">
      <p className={`mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider ${accent ? "text-[hsl(var(--brand-amber))]" : "text-muted-foreground"}`}>
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SessionRow({
  session: s, active, onSelect, onRename, onPause, onResume, onCancel,
}: {
  session: ChatSession;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => setDraft(s.title), [s.title]);

  const statusDot = statusColor(s.status);
  const isActive = s.status === "running" || s.status === "collecting";
  const canPause = s.status === "running" || s.status === "collecting";
  const canResume = s.status === "paused";
  const canCancel = s.status !== "completed" && s.status !== "cancelled";

  return (
    <div
      className={`group relative flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors ${
        active
          ? "bg-[hsl(var(--brand-amber)/0.12)] border-l-2 border-[hsl(var(--brand-amber))] pl-[6px]"
          : "hover:bg-secondary/60"
      }`}
    >
      <button
        onClick={() => !editing && onSelect(s.id)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5">
          <span className={`shrink-0 inline-block h-1.5 w-1.5 rounded-full ${statusDot}`} title={s.status} />
          {s.mode === "auto" ? <Zap className="h-3 w-3 shrink-0 text-[hsl(var(--brand-amber))]" /> : <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />}
          {editing ? (
            <form
              onSubmit={(e) => { e.preventDefault(); onRename(s.id, draft); setEditing(false); }}
              className="flex-1"
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => { onRename(s.id, draft); setEditing(false); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setDraft(s.title); setEditing(false); } }}
                className="w-full bg-transparent text-sm font-medium outline-none border-b border-primary/50"
              />
            </form>
          ) : (
            <p className="truncate text-sm font-medium">{s.title}</p>
          )}
        </div>
        {!editing && s.job && (
          <p className="ml-5 truncate text-[11px] text-muted-foreground">{s.job.title} @ {s.job.company}</p>
        )}
        {!editing && !s.job && (
          <p className="ml-5 text-[11px] text-muted-foreground italic">{isActive ? "running…" : "no job attached"}</p>
        )}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary focus:opacity-100 transition-opacity"
          aria-label="Session actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-background shadow-lg">
            <MenuItem onClick={() => { setEditing(true); setMenuOpen(false); }} icon={<Edit2 className="h-3 w-3" />}>Rename</MenuItem>
            {canPause && <MenuItem onClick={() => { onPause(s.id); setMenuOpen(false); }} icon={<Pause className="h-3 w-3" />}>Pause</MenuItem>}
            {canResume && <MenuItem onClick={() => { onResume(s.id); setMenuOpen(false); }} icon={<Play className="h-3 w-3" />}>Resume</MenuItem>}
            {canCancel && <MenuItem onClick={() => { onCancel(s.id); setMenuOpen(false); }} icon={<X className="h-3 w-3" />} danger>Cancel</MenuItem>}
            {(s.status === "completed") && <MenuItem onClick={() => setMenuOpen(false)} icon={<Check className="h-3 w-3" />} disabled>Completed</MenuItem>}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ children, icon, onClick, danger, disabled }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
        disabled ? "text-muted-foreground cursor-default" :
        danger ? "text-red-600 hover:bg-red-50" :
        "hover:bg-secondary"
      }`}
    >
      {icon}{children}
    </button>
  );
}

function statusColor(status: ChatSession["status"]): string {
  switch (status) {
    case "running": return "bg-emerald-500 animate-pulse";
    case "collecting": return "bg-blue-500 animate-pulse";
    case "paused": return "bg-amber-500";
    case "completed": return "bg-muted-foreground";
    case "cancelled": return "bg-muted-foreground/50";
    case "failed": return "bg-red-500";
    case "ready": return "bg-blue-400";
    default: return "bg-muted-foreground/40";
  }
}

function groupSessions(sessions: ChatSession[]) {
  const now = Date.now();
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;

  const active: ChatSession[] = [];
  const todayList: ChatSession[] = [];
  const yesterdayList: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const s of sessions) {
    const t = new Date(s.updated_at).getTime();
    if (s.status === "running" || s.status === "collecting" || s.status === "paused") active.push(s);
    else if (t >= today) todayList.push(s);
    else if (t >= yesterday) yesterdayList.push(s);
    else older.push(s);
  }

  // Sort each bucket by most recent
  const byRecency = (a: ChatSession, b: ChatSession) => (a.updated_at < b.updated_at ? 1 : -1);
  active.sort(byRecency); todayList.sort(byRecency); yesterdayList.sort(byRecency); older.sort(byRecency);

  return { active, today: todayList, yesterday: yesterdayList, older };
}
