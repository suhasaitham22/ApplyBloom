"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, FileText, Zap, User, Send, Loader2, Link2, CheckCircle2, Sparkles, ArrowLeft, PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  type Resume, type ChatSession, type ChatMessage,
  listResumes, createResume, updateResume,
  listSessions, createSession, getSession, updateSession, sendMessage, applySession, parseResume,
  pauseSessionApi, resumeSessionApi, cancelSession,
} from "@/features/studio/lib/studio-client";
import { extractResumeText } from "@/features/studio/lib/extract-resume-text";
import { Upload, FileUp } from "lucide-react";
import { SessionSidebar } from "@/features/studio/components/session-sidebar";
import { ResumeVersionHistory } from "@/features/studio/components/resume-version-history";
import { ResumeEditor } from "@/features/studio/components/resume-editor";
import { opsToChangedPaths, type ResumeOp } from "@/features/studio/lib/op-to-paths";

interface Props { sessionId: string | null; }

const LAST_SESSION_KEY = "applybloom:last-session-id";

export function StudioShell({ sessionId: initialSessionId }: Props) {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<"single" | "auto">("single");
  const [loading, setLoading] = useState(true);
  const [chatDraft, setChatDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showAddResume, setShowAddResume] = useState(false);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [versionRefresh, setVersionRefresh] = useState(0);
  const [recentAiDiff, setRecentAiDiff] = useState<{ at: number } | null>(null);
  const [recentChangedPaths, setRecentChangedPaths] = useState<string[]>([]);
  const [lastDiffSummary, setLastDiffSummary] = useState<string | null>(null);
  const chatScroll = useRef<HTMLDivElement>(null);
  const bootstrapRan = useRef(false);

  // Bootstrap: load resumes & sessions, resolve target session.
  // Priority: URL param → localStorage last-viewed → most recent → create new.
  useEffect(() => {
    if (bootstrapRan.current) return;
    bootstrapRan.current = true;
    (async () => {
      try {
        const [{ resumes: rs }, { sessions: ss }] = await Promise.all([listResumes(), listSessions()]);
        setResumes(rs);
        setSessions(ss);
        setActiveResumeId(rs.find((r) => r.is_base)?.id ?? rs[0]?.id ?? null);

        let targetId: string | null = null;
        let lastId: string | null = null;
        try { lastId = typeof window !== "undefined" ? (window.localStorage?.getItem(LAST_SESSION_KEY) ?? null) : null; } catch { lastId = null; }

        if (initialSessionId && ss.some((s) => s.id === initialSessionId)) {
          targetId = initialSessionId;
        } else if (lastId && ss.some((s) => s.id === lastId)) {
          targetId = lastId;
        } else if (ss.length > 0) {
          // Most recent by updated_at
          const sorted = [...ss].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
          targetId = sorted[0].id;
        } else {
          const { session: s } = await createSession({ title: "New session", mode: "single" });
          targetId = s.id;
          setSessions([s]);
        }
        setActiveSessionId(targetId);
        if (targetId && targetId !== initialSessionId) router.replace(`/studio/${targetId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load studio");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist last-viewed session so /studio bare path opens it next time.
  useEffect(() => {
    if (!activeSessionId || typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(LAST_SESSION_KEY, activeSessionId);
    } catch { /* storage unavailable (SSR / jsdom without storage) */ }
  }, [activeSessionId]);

  // ⌘B / Ctrl+B toggles the session sidebar
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Background refresh: re-poll sessions when tab becomes visible — keeps
  // the sidebar in sync if another tab / backend cron updated status.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        refreshSessions();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch sessions list helper — called after mutations that change status/list.
  async function refreshSessions() {
    try {
      const { sessions: ss } = await listSessions();
      setSessions(ss);
    } catch { /* non-fatal */ }
  }

  // Load session detail whenever active session changes
  useEffect(() => {
    if (!activeSessionId) return;
    (async () => {
      try {
        const { session: s, messages: m } = await getSession(activeSessionId);
        setSession(s);
        setMessages(m);
        setMode(s.mode);
        // Sync active resume with this session's linked resume (backend truth)
        if (s.resume_id) setActiveResumeId(s.resume_id);
      } catch (e) {
        // Stale session id — create a fresh one so user can keep going
        toast.info("Starting a new session…");
        try {
          const { session: fresh } = await createSession({ title: "New session", mode });
          setSessions((p) => [fresh, ...p]);
          setActiveSessionId(fresh.id);
          setSession(fresh);
          setMessages([]);
          router.replace(`/studio/${fresh.id}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not start session");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScroll.current) chatScroll.current.scrollTop = chatScroll.current.scrollHeight;
  }, [messages]);

  const activeResume = useMemo(() => resumes.find((r) => r.id === activeResumeId) ?? null, [resumes, activeResumeId]);

  async function handleNewSession() {
    try {
      const { session: s } = await createSession({ title: "New session", mode, resume_id: activeResumeId });
      setSessions((p) => [s, ...p]);
      setActiveSessionId(s.id);
      // Use push so the new session is a real history entry — back button returns to prior session.
      router.push(`/studio/${s.id}`);
      setMessages([]);
      setSession(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create session");
    }
  }

  async function handleReuploadResume(file: File) {
    if (!activeSessionId) return;
    try {
      toast.message(`Extracting text from ${file.name}…`);
      const raw_text = await extractResumeText(file);
      if (!raw_text.trim()) throw new Error("No text found in file");

      // Replace the active resume if linked; otherwise create a new one
      let targetId = activeResumeId;
      if (!targetId) {
        const { resume } = await createResume(file.name.replace(/\.[^.]+$/, ""), raw_text);
        targetId = resume.id;
        setResumes((p) => [resume, ...p]);
        setActiveResumeId(resume.id);
      } else {
        const { resume } = await updateResume(targetId, { raw_text, name: file.name.replace(/\.[^.]+$/, "") });
        setResumes((p) => p.map((x) => (x.id === resume.id ? resume : x)));
      }

      toast.message("Parsing resume with AI…");
      const parsed = await parseResume(activeSessionId, raw_text);
      const structured = (parsed as { data?: unknown }).data ?? parsed;
      const { resume: updated } = await updateResume(targetId, { parsed: structured });
      setResumes((p) => p.map((x) => (x.id === updated.id ? updated : x)));

      // Link resume to session
      const { session: s } = await updateSession(activeSessionId, { resume_id: targetId });
      setSession(s);
      setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));

      toast.success(`${file.name} replaced current resume ✨`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not process file");
    }
  }

  async function handleAddResume(name: string, raw_text: string) {
    try {
      const { resume } = await createResume(name, raw_text);
      setResumes((p) => [resume, ...p]);
      setActiveResumeId(resume.id);
      setShowAddResume(false);
      toast.success(`Added "${resume.name}"`);

      // Kick off structured parsing on the active session (so chat sees structured data)
      if (raw_text.trim() && activeSessionId) {
        toast.message("Parsing resume with AI…");
        let parsedStructured: { full_name?: string; headline?: string } | null = null;
        try {
          const parsed = await parseResume(activeSessionId, raw_text);
          const structured = (parsed as { data?: unknown }).data ?? parsed;
          parsedStructured = structured as { full_name?: string; headline?: string };
          const { resume: updated } = await updateResume(resume.id, { parsed: structured });
          setResumes((p) => p.map((x) => (x.id === updated.id ? updated : x)));
          toast.success("Resume parsed ✨");
        } catch (parseErr) {
          toast.error(parseErr instanceof Error ? `Parse failed: ${parseErr.message}` : "Parse failed");
        }

        // Link resume to session + auto-rename session to parsed name (or resume name as fallback)
        try {
          const sessionTitle = parsedStructured?.full_name?.trim()
            || parsedStructured?.headline?.trim()
            || resume.name;
          const { session: s } = await updateSession(activeSessionId, {
            resume_id: resume.id,
            ...(session?.title === "New session" ? { title: sessionTitle } : {}),
          });
          setSession(s);
          setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
        } catch { /* non-fatal */ }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add resume");
    }
  }

  async function handleSendMessage() {
    if (!activeSessionId || !chatDraft.trim() || sending) return;
    setSending(true);
    const content = chatDraft.trim();
    setChatDraft("");
    try {
      // Ensure the backend session is linked to the resume the user picked.
      // Without this the AI gets NO resume context even though the UI shows one.
      if (activeResumeId && session && session.resume_id !== activeResumeId) {
        try {
          const { session: s } = await updateSession(activeSessionId, { resume_id: activeResumeId });
          setSession(s);
          setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
        } catch { /* non-fatal — backend will still try */ }
      }
      const { messages: newMsgs } = await sendMessage(activeSessionId, content);
      setMessages((p) => [...p, ...newMsgs]);

      // If any action messages came back, refresh the resume from backend
      const hasOps = newMsgs.some((m) => m.role === "action");
      if (hasOps && activeResumeId) {
        try {
          const all = await listResumes();
          setResumes(all.resumes);
        } catch { /* non-fatal */ }
        // Build changed-paths set from the action messages for precise highlighting
        const ops = newMsgs
          .filter((m) => m.role === "action" && m.action_payload)
          .map((m) => m.action_payload as ResumeOp);
        if (ops.length > 0) {
          const before = (activeResume?.parsed as { experience?: Array<{ heading: string }>; education?: Array<{ heading: string }> } | null) ?? {};
          const paths = opsToChangedPaths(ops, before);
          setRecentChangedPaths(paths);
          const summary = describeOpsShort(ops);
          setLastDiffSummary(summary);
          // Fade highlights after 6s
          setTimeout(() => setRecentChangedPaths([]), 6000);
        }
        setVersionRefresh((n) => n + 1);
        setRecentAiDiff({ at: Date.now() });
        setTimeout(() => setRecentAiDiff(null), 4000);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function handleAttachJob(job: { title: string; company: string; url: string; description: string }) {
    if (!activeSessionId) return;
    try {
      const { session: s } = await updateSession(activeSessionId, { job, status: "ready", title: `${job.title} @ ${job.company}` });
      setSession(s);
      setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
      setShowJobPanel(false);
      toast.success(`Job attached: ${job.title}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not attach job");
    }
  }

  async function handleApply() {
    if (!activeSessionId) return;
    if (!session?.job) { toast.info("Attach a job first."); return; }
    try {
      const { session: s } = await applySession(activeSessionId);
      setSession(s);
      setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
      toast.success("Application submitted (demo).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    }
  }

  async function handleModeChange(m: "single" | "auto") {
    setMode(m);
    if (!activeSessionId) return;
    try {
      const { session: s } = await updateSession(activeSessionId, { mode: m });
      setSession(s);
    } catch { /* ignore */ }
  }

  const locked = session?.status === "running" || session?.status === "completed";

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar — navy brand strip matching landing */}
      <header className="flex h-14 items-center gap-1 border-b border-[hsl(var(--brand-navy)/0.9)] bg-[hsl(var(--brand-navy))] px-3 text-white">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="mr-1 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label={sidebarOpen ? "Hide sessions" : "Show sessions"}
          title={sidebarOpen ? "Hide sessions (⌘B)" : "Show sessions (⌘B)"}
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>
        <Link href="/" className="mr-3 flex items-center gap-2">
          <Image src="/applybloom-logo.svg" alt="" width={22} height={22} />
          <span className="font-display text-sm font-semibold tracking-tight">
            Apply<span className="text-[hsl(var(--brand-amber))]">Bloom</span>
          </span>
        </Link>
        <div className="mx-1 h-5 w-px bg-white/20" />
        <div className="flex items-center gap-1 overflow-x-auto">
          {resumes.map((r) => (
            <ResumeTab key={r.id} name={r.name} active={r.id === activeResumeId} onClick={async () => {
              setActiveResumeId(r.id);
              if (activeSessionId && session && session.resume_id !== r.id) {
                try {
                  const { session: s } = await updateSession(activeSessionId, { resume_id: r.id });
                  setSession(s);
                  setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
                } catch { /* non-fatal */ }
              }
            }} />
          ))}
          <button
            onClick={() => setShowAddResume(true)}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add resume
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <div className="mx-1 h-5 w-px bg-white/20" />
          <button className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors" aria-label="User menu">
            <User className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 3-pane */}
      <div className={`grid min-h-0 flex-1 overflow-hidden ${sidebarOpen ? "grid-cols-[280px_1fr_380px]" : "grid-cols-[0px_1fr_380px]"}`}>
        <div className={sidebarOpen ? "contents" : "hidden"}>
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={(id) => { if (id === activeSessionId) return; setActiveSessionId(id); router.push(`/studio/${id}`); }}
          onCreate={handleNewSession}
          onRename={async (id, title) => {
            try {
              const { session: s } = await updateSession(id, { title: title.trim() || "Untitled session" });
              setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
              if (s.id === activeSessionId) setSession(s);
            } catch (e) { toast.error(e instanceof Error ? e.message : "Rename failed"); }
          }}
          onPause={async (id) => {
            try {
              const { session: s } = await pauseSessionApi(id);
              setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
              if (s.id === activeSessionId) setSession(s);
              toast.success("Session paused");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Pause failed"); }
          }}
          onResume={async (id) => {
            try {
              const { session: s } = await resumeSessionApi(id);
              setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
              if (s.id === activeSessionId) setSession(s);
              toast.success("Session resumed");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Resume failed"); }
          }}
          onCancel={async (id) => {
            if (!confirm("Cancel this session? You can always start a new one.")) return;
            try {
              const { session: s } = await cancelSession(id);
              setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
              if (s.id === activeSessionId) setSession(s);
              toast.message("Session cancelled");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Cancel failed"); }
          }}
          blockedBy={
            sessions.find((s) => (s.status === "running" || s.status === "collecting") && s.id !== activeSessionId) ?? null
          }
          mode={mode}
          onModeChange={handleModeChange}
        />
        </div>

        {/* Center: resume — soft neutral canvas with navy outline tint */}
        <main className="overflow-y-auto bg-[hsl(var(--brand-navy)/0.02)]">
          <div className="mx-auto max-w-3xl px-12 py-12">
            {activeResume ? (
              <div className="space-y-6">
                <div className={recentAiDiff ? "ring-2 ring-[hsl(var(--brand-amber))] rounded-lg transition-all" : ""}>
                  <ResumeEditor
                    resumeId={activeResume.id}
                    parsed={(activeResume.parsed as import("@/features/studio/lib/resume-plate").StructuredResume) ?? {}}
                    recentChangedPaths={recentChangedPaths}
                    diffSummary={lastDiffSummary}
                    readOnly={locked}
                    onSave={async (next) => {
                      const { resume } = await updateResume(activeResume.id, { parsed: next });
                      setResumes((p) => p.map((x) => (x.id === resume.id ? resume : x)));
                      setVersionRefresh((n) => n + 1); // backend writes a new version on PATCH
                    }}
                  />
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <ResumeVersionHistory
                    resumeId={activeResume.id}
                    refreshKey={versionRefresh}
                    onRestored={(r) => {
                      setResumes((p) => p.map((x) => (x.id === r.id ? r : x)));
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">No resume yet.</p>
                <Button className="mt-4" onClick={() => setShowAddResume(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add your first resume
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Right: chat + actions */}
        <aside className="flex min-h-0 h-full flex-col border-l border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="min-w-0 flex-1">
              <SessionTitleInline
                title={session?.title ?? "Chat"}
                onRename={async (t) => {
                  if (!activeSessionId || !t.trim() || t === session?.title) return;
                  try {
                    const { session: s } = await updateSession(activeSessionId, { title: t.trim() });
                    setSession(s);
                    setSessions((p) => p.map((x) => (x.id === s.id ? s : x)));
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Rename failed"); }
                }}
              />
              <p className="truncate text-xs text-muted-foreground">
                {session?.job ? `${session.job.title} @ ${session.job.company}` : "No job attached"}
              </p>
            </div>
            <Badge variant={locked ? "default" : "secondary"} className="ml-2 shrink-0">
              {session?.status ?? "idle"}
            </Badge>
          </div>

          {/* Job attach panel */}
          {showJobPanel && activeSessionId && (
            <JobAttachForm onSubmit={handleAttachJob} onCancel={() => setShowJobPanel(false)} />
          )}

          {/* Action buttons */}
          {!showJobPanel && (
            <div className="flex gap-1.5 border-b border-border/60 px-3 py-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setShowJobPanel(true)} disabled={locked}>
                <Link2 className="h-3 w-3" /> {session?.job ? "Change job" : "Attach job"}
              </Button>
              <Button size="sm" className="flex-1 gap-1.5" onClick={handleApply} disabled={!session?.job || locked}>
                {session?.status === "completed" ? <><CheckCircle2 className="h-3 w-3" /> Applied</> : <><Sparkles className="h-3 w-3" /> Apply</>}
              </Button>
            </div>
          )}

          {/* Active context strip: shows which resume + job the AI actually has in-scope.
              Truth-source = session.resume_id (backend linkage), NOT activeResumeId (UI-only). */}
          {(() => {
            const linkedResume = session?.resume_id ? resumes.find((r) => r.id === session.resume_id) ?? null : null;
            const mismatch = !!activeResume && !!session && activeResume.id !== session.resume_id;
            return (
              <div className={`flex items-center gap-2 border-b border-border/40 px-4 py-1.5 text-[11px] ${mismatch ? "bg-amber-500/10 text-amber-800" : "bg-[hsl(var(--brand-amber)/0.08)] text-muted-foreground"}`}>
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {linkedResume ? (
                    <>AI sees: <strong className="text-foreground">{linkedResume.name}</strong></>
                  ) : mismatch ? (
                    <>Not yet linked — send a message to attach <strong className="text-foreground">{activeResume?.name}</strong></>
                  ) : (
                    <span className="italic">No resume attached — AI will chat without resume context</span>
                  )}
                </span>
                {session?.job?.title && (
                  <>
                    <span className="mx-0.5">·</span>
                    <span className="truncate">target: <strong className="text-foreground">{session.job.title}</strong></span>
                  </>
                )}
              </div>
            );
          })()}

          <div ref={chatScroll} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Say hi, paste a job URL, or ask to tailor your resume.
                </p>
              </div>
            ) : messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-secondary px-3.5 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border/60 p-3"
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={async (e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (!f || !activeSessionId) return;
              await handleReuploadResume(f);
            }}
          >
            <label className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary transition-colors" title="Replace current resume (PDF / DOCX / TXT)">
              <Upload className="h-3.5 w-3.5" />
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await handleReuploadResume(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <Input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder={locked ? "Session locked" : "Message, or drop a resume here…"}
              disabled={locked || sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={locked || sending || !chatDraft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </aside>
      </div>

      {showAddResume && (
        <AddResumeModal onSubmit={handleAddResume} onCancel={() => setShowAddResume(false)} />
      )}
    </div>
  );
}

function SessionTitleInline({ title, onRename }: { title: string; onRename: (t: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  useEffect(() => setDraft(title), [title]);
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="truncate text-sm font-medium hover:underline decoration-dotted underline-offset-4"
        title="Click to rename"
      >
        {title}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); onRename(draft); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.currentTarget.blur(); }
        if (e.key === "Escape") { setDraft(title); setEditing(false); }
      }}
      className="w-full bg-transparent text-sm font-medium outline-none border-b border-primary/50 focus:border-primary"
    />
  );
}

function ResumeTab({ name, active, onClick }: { name: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-white/15 text-white font-medium"
          : "text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      <FileText className="h-3.5 w-3.5" />
      <span className="max-w-[160px] truncate">{name}</span>
    </button>
  );
}

function ModeButton({ label, active, icon, onClick }: { label: string; active?: boolean; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-[hsl(var(--brand-navy))] text-white font-medium shadow-sm"
          : "text-muted-foreground hover:bg-secondary/60"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function HistoryItem({ title, active, locked, onClick }: { title: string; active?: boolean; locked?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? "bg-[hsl(var(--brand-amber)/0.12)] text-[hsl(var(--brand-navy))] font-medium border-l-2 border-[hsl(var(--brand-amber))]"
          : "text-muted-foreground hover:bg-secondary/60"
      }`}
    >
      <span className="truncate text-left">{title}</span>
      {locked ? <span className="text-xs">🔒</span> : null}
    </button>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "action") {
    return (
      <div className="flex justify-center">
        <div className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
          ⚡ {msg.content}
        </div>
      </div>
    );
  }
  const isUser = msg.role === "user";
  const isEmpty = !msg.content || !msg.content.trim() || msg.content.trim() === "(no response)";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm bg-primary text-primary-foreground whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }
  // assistant
  return (
    <div className="flex items-start gap-2 justify-start">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--brand-navy))] ring-2 ring-[hsl(var(--brand-amber)/0.5)]">
        <Image src="/applybloom-logo.svg" alt="ApplyBloom" width={16} height={16} />
      </div>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${isEmpty ? "bg-secondary/40 italic text-muted-foreground" : "bg-secondary text-secondary-foreground"} break-words`}>
        {isEmpty ? "The model didn't return anything — try rephrasing, or check that AI is configured." : msg.content}
      </div>
    </div>
  );
}

interface StructuredResume {
  full_name?: string;
  headline?: string;
  contact?: { email?: string; phone?: string; location?: string };
  summary?: string;
  skills?: string[];
  experience?: { heading: string; bullets: string[] }[];
  education?: { heading: string; bullets: string[] }[];
  confidence?: number;
}

function ResumeView({ resume, onRename }: { resume: Resume; onRename: (name: string) => Promise<void> }) {
  const [name, setName] = useState(resume.name ?? "");
  const [view, setView] = useState<"ats" | "raw">("ats");
  useEffect(() => { setName(resume.name ?? ""); }, [resume.name]);

  const parsed = resume.parsed as StructuredResume | null;
  const hasParsed = parsed && (parsed.full_name || parsed.summary || (parsed.experience?.length ?? 0) > 0);

  return (
    <div className="rounded-lg border border-border bg-background p-10 shadow-sm">
      <div className="mb-6 flex items-start justify-between border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <input
            value={name ?? ""}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (name.trim() && name !== resume.name) onRename(name.trim()); }}
            className="w-full bg-transparent font-display text-2xl tracking-tight outline-none focus:border-b focus:border-border"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {resume.is_base ? "Base resume · " : ""}Created {new Date(resume.created_at).toLocaleDateString()}
            {hasParsed && parsed?.confidence != null ? ` · AI confidence ${Math.round(parsed.confidence * 100)}%` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasParsed && <AtsScoreBadge resume={parsed!} />}
          {hasParsed && (
            <div className="flex gap-1 rounded-md border border-border p-0.5 text-xs">
              <button onClick={() => setView("ats")} className={`rounded px-2 py-1 ${view === "ats" ? "bg-secondary font-medium" : "text-muted-foreground"}`}>ATS view</button>
              <button onClick={() => setView("raw")} className={`rounded px-2 py-1 ${view === "raw" ? "bg-secondary font-medium" : "text-muted-foreground"}`}>Raw</button>
            </div>
          )}
        </div>
      </div>

      {hasParsed && view === "ats" ? (
        <AtsResumeView r={parsed!} />
      ) : resume.raw_text ? (
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">{resume.raw_text}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">Empty resume.</p>
      )}
    </div>
  );
}

// ============================================================
// ATS-compliant resume rendering
// - Single column, no tables, no icons, no graphics
// - Standard section headers (SUMMARY / SKILLS / EXPERIENCE / EDUCATION)
// - Plain ASCII bullets (•), Arial-like font, black-on-white
// - Keywords visible as plain text (not badges) so ATS parsers read them
// - Date format: "Mmm YYYY — Mmm YYYY"
// ============================================================
function AtsResumeView({ r }: { r: StructuredResume }) {
  const contact = [r.contact?.email, r.contact?.phone, r.contact?.location].filter(Boolean).join("  |  ");
  return (
    <div className="font-serif text-[13px] leading-snug text-black bg-white" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Header — name + contact only. No columns, no logos */}
      <div className="text-center pb-3 border-b-2 border-black">
        {r.full_name && <h1 className="text-2xl font-bold tracking-normal uppercase">{r.full_name}</h1>}
        {r.headline && <p className="mt-0.5 text-sm">{r.headline}</p>}
        {contact && <p className="mt-1 text-xs">{contact}</p>}
      </div>

      {r.summary && (
        <section className="mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-0.5">Professional Summary</h2>
          <p className="mt-2 text-[13px] leading-relaxed">{r.summary}</p>
        </section>
      )}

      {r.skills && r.skills.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-0.5">Core Skills</h2>
          {/* Comma-separated keywords — ATS-friendly vs badges */}
          <p className="mt-2 text-[13px] leading-relaxed">{r.skills.join(" • ")}</p>
        </section>
      )}

      {r.experience && r.experience.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-0.5">Professional Experience</h2>
          <div className="mt-2 space-y-3">
            {r.experience.map((e, i) => (
              <div key={i}>
                <p className="font-bold text-[13px]">{e.heading}</p>
                {e.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {e.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2 text-[13px] leading-relaxed">
                        <span className="shrink-0">•</span><span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {r.education && r.education.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-0.5">Education</h2>
          <div className="mt-2 space-y-2">
            {r.education.map((e, i) => (
              <div key={i}>
                <p className="font-bold text-[13px]">{e.heading}</p>
                {e.bullets.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {e.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2 text-[13px] leading-relaxed">
                        <span className="shrink-0">•</span><span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// ATS score — checks that drive most ATS parsers
// Each signal is worth points; total caps at 100.
// ============================================================
interface AtsScore {
  score: number;
  passes: string[];
  warnings: string[];
}

function computeAtsScore(r: StructuredResume): AtsScore {
  let score = 0;
  const passes: string[] = [];
  const warnings: string[] = [];

  // 1. Contact block present (15)
  if (r.contact?.email && /^\S+@\S+\.\S+$/.test(r.contact.email)) { score += 8; passes.push("Valid email"); }
  else warnings.push("Missing or invalid email");
  if (r.contact?.phone && /\d{3,}/.test(r.contact.phone)) { score += 4; passes.push("Phone present"); }
  else warnings.push("Missing phone");
  if (r.contact?.location) { score += 3; passes.push("Location set"); }
  else warnings.push("Missing location");

  // 2. Headline / target role (8)
  if (r.headline && r.headline.length > 6) { score += 8; passes.push("Clear target role"); }
  else warnings.push("Add a professional headline (e.g. \"Senior Backend Engineer\")");

  // 3. Summary length (12)
  const s = (r.summary ?? "").trim();
  const words = s ? s.split(/\s+/).length : 0;
  if (words >= 30 && words <= 80) { score += 12; passes.push(`Summary ${words} words (ideal 30–80)`); }
  else if (words > 0) { score += 6; warnings.push(`Summary ${words} words — aim for 30–80`); }
  else warnings.push("Add a 30–80 word professional summary");

  // 4. Skills count (15)
  const skills = r.skills ?? [];
  if (skills.length >= 10) { score += 15; passes.push(`${skills.length} skills (great for keyword match)`); }
  else if (skills.length >= 6) { score += 10; passes.push(`${skills.length} skills`); warnings.push("Add more skills to boost keyword density (aim for 10+)"); }
  else if (skills.length > 0) { score += 5; warnings.push(`Only ${skills.length} skills — ATS parsers need keyword variety`); }
  else warnings.push("No skills listed");

  // 5. Experience — entries + quantified bullets (40)
  const exp = r.experience ?? [];
  if (exp.length >= 2) { score += 10; passes.push(`${exp.length} roles listed`); }
  else if (exp.length === 1) { score += 5; warnings.push("Add more work history for stronger context"); }
  else warnings.push("No experience entries");

  const allBullets = exp.flatMap((e) => e.bullets);
  if (allBullets.length >= 6) { score += 10; passes.push(`${allBullets.length} achievement bullets`); }
  else if (allBullets.length > 0) { score += 4; warnings.push("Add 3–5 bullets per role"); }

  const quantified = allBullets.filter((b) => /\d+%|\$\d+|\d+x|\d+\+?\s?(users|customers|requests|k|m|b|ms|seconds|hours)/i.test(b));
  if (allBullets.length > 0) {
    const ratio = quantified.length / allBullets.length;
    if (ratio >= 0.5) { score += 15; passes.push(`${quantified.length}/${allBullets.length} bullets have metrics`); }
    else if (ratio >= 0.25) { score += 8; warnings.push("Quantify more bullets (aim 50%+ with numbers/%/$)"); }
    else warnings.push("Add metrics to bullets (e.g. \"reduced latency 40%\", \"shipped to 200k users\")");
  }

  // Action verbs on bullets (5)
  const actionVerbs = /^(Led|Built|Shipped|Designed|Architected|Migrated|Reduced|Increased|Launched|Drove|Owned|Scaled|Automated|Implemented|Delivered|Spearheaded|Established|Developed|Created|Optimized|Streamlined)/i;
  const actionCount = allBullets.filter((b) => actionVerbs.test(b.trim())).length;
  if (allBullets.length > 0 && actionCount / allBullets.length >= 0.6) { score += 5; passes.push("Strong action verbs"); }
  else if (allBullets.length > 0) warnings.push("Start each bullet with a strong action verb (Led, Shipped, Reduced, …)");

  // 6. Education (10)
  const edu = r.education ?? [];
  if (edu.length >= 1) { score += 10; passes.push("Education listed"); }
  else warnings.push("Add an education entry");

  return { score: Math.min(100, score), passes, warnings };
}

function AtsScoreBadge({ resume }: { resume: StructuredResume }) {
  const [open, setOpen] = useState(false);
  const { score, passes, warnings } = useMemo(() => computeAtsScore(resume), [resume]);
  const color = score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 90 ? "text-emerald-700" : score >= 75 ? "text-amber-700" : "text-red-700";
  const bgColor = score >= 90 ? "bg-emerald-50 border-emerald-200" : score >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium ${bgColor} ${textColor}`}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
        ATS Score: {score}/100
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-border bg-background p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">ATS compatibility</p>
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="mb-3 h-2 rounded-full bg-secondary">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
          </div>
          {passes.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Passing</p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {passes.map((p, i) => <li key={i}>✓ {p}</li>)}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">To improve</p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {warnings.map((w, i) => <li key={i}>! {w}</li>)}
              </ul>
            </div>
          )}
          <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
            Ask chat: <span className="italic">&ldquo;improve my ATS score&rdquo;</span> to auto-fix.
          </p>
        </div>
      )}
    </div>
  );
}

function AddResumeModal({ onSubmit, onCancel }: { onSubmit: (name: string, raw: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setExtracting(true);
    setFileName(file.name);
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
    try {
      const text = await extractResumeText(file);
      if (!text.trim()) throw new Error("No text found in file");
      setRaw(text);
      toast.success(`Extracted ${text.length.toLocaleString()} characters from ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read file");
      setFileName(null);
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="mb-1 font-display text-lg">Add resume</h2>
        <p className="mb-4 text-sm text-muted-foreground">Upload a PDF / DOCX / TXT, or paste text directly. AI parses it into structured data.</p>

        <div className="space-y-3">
          <Input placeholder="Resume name (e.g. Backend_v3)" value={name} onChange={(e) => setName(e.target.value)} />

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileInput.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30"
            }`}
          >
            {extracting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Extracting text from {fileName}…</p>
              </>
            ) : fileName ? (
              <>
                <FileUp className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">Click to replace · {raw.length.toLocaleString()} chars extracted</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Drop resume here, or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF · DOCX · TXT</p>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
            </div>
          </div>

          <Textarea
            placeholder="Paste resume text here…"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSubmit(name.trim() || "Untitled resume", raw.trim())} disabled={!raw.trim() || extracting}>
            {extracting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting…</> : "Save & parse"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function JobAttachForm({ onSubmit, onCancel }: { onSubmit: (job: { title: string; company: string; url: string; description: string }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div className="border-b border-border/60 bg-secondary/30 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <Input placeholder="Job URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Textarea placeholder="Paste job description…" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSubmit({ title: title.trim(), company: company.trim(), url: url.trim(), description: description.trim() })} disabled={!title.trim() || !company.trim()}>
          Attach
        </Button>
      </div>
    </div>
  );
}


function describeOpsShort(ops: ResumeOp[]): string {
  const parts: string[] = [];
  const skillsAdded = ops.filter((o) => o.op === "add_skills").flatMap((o) => o.value);
  const skillsRemoved = ops.filter((o) => o.op === "remove_skills").flatMap((o) => o.value);
  if (skillsAdded.length > 0) parts.push(`+${skillsAdded.length} skill${skillsAdded.length === 1 ? "" : "s"} (${skillsAdded.slice(0, 3).join(", ")}${skillsAdded.length > 3 ? "…" : ""})`);
  if (skillsRemoved.length > 0) parts.push(`-${skillsRemoved.length} skill${skillsRemoved.length === 1 ? "" : "s"}`);
  if (ops.some((o) => o.op === "replace_summary")) parts.push("summary rewritten");
  if (ops.some((o) => o.op === "replace_headline")) parts.push("headline updated");
  const bullets = ops.filter((o) => o.op === "rewrite_bullet" || o.op === "add_bullet").length;
  if (bullets > 0) parts.push(`${bullets} bullet${bullets === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
