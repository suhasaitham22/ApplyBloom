"use client";
import Image from "next/image";
import Link from "next/link";
import { Plus, MessageSquare, FileText, Zap, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  sessionId: string | null;
}

export function StudioShellStub({ sessionId }: Props) {
  return (
    <div className="flex h-screen flex-col">
      {/* Top bar: resume tabs */}
      <header className="flex h-14 items-center gap-1 border-b border-border/60 bg-background px-3">
        <Link href="/" className="mr-3 flex items-center gap-2">
          <Image src="/applybloom-logo.svg" alt="" width={22} height={22} />
          <span className="font-display text-sm font-semibold tracking-tight">ApplyBloom</span>
        </Link>
        <div className="mx-2 h-5 w-px bg-border" />
        <div className="flex items-center gap-1 overflow-x-auto">
          <ResumeTab name="Resume_2026.pdf" active />
          <ResumeTab name="Backend_v3.pdf" />
          <Button variant="ghost" size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add resume
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="User menu">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* 3-pane */}
      <div className="grid flex-1 grid-cols-[260px_1fr_380px] overflow-hidden">
        {/* Left: mode + history */}
        <aside className="flex flex-col border-r border-border/60 bg-background">
          <div className="border-b border-border/60 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Mode</p>
            <div className="space-y-1.5">
              <ModeButton label="Single apply" active icon={<FileText className="h-3.5 w-3.5" />} />
              <ModeButton label="Auto apply" icon={<Zap className="h-3.5 w-3.5" />} />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 pb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">History</p>
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
              <Plus className="h-3 w-3" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <HistoryGroup label="Today">
              <HistoryItem title="UX Designer @ Netflix" active />
              <HistoryItem title="PM @ Stripe" />
            </HistoryGroup>
            <HistoryGroup label="Yesterday">
              <HistoryItem title="Backend Eng @ Figma" locked />
            </HistoryGroup>
          </div>
        </aside>

        {/* Center: resume */}
        <main className="overflow-y-auto bg-[#fafafa]">
          <div className="mx-auto max-w-3xl px-12 py-12">
            <div className="rounded-lg border border-border bg-background p-12 shadow-sm">
              <div className="mb-8 border-b border-border pb-6">
                <h1 className="font-display text-3xl tracking-tight">Your Name</h1>
                <p className="mt-1 text-sm text-muted-foreground">Senior Product Designer · you@email.com · City</p>
              </div>
              <section className="mb-8">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experience</h2>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium">Product Designer · Acme Inc.</p>
                    <p className="text-xs text-muted-foreground">2023 — present</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                      <li>Led the redesign of the core dashboard, lifting weekly active use 22%.</li>
                      <li>Built a component library adopted across 4 product teams.</li>
                    </ul>
                  </div>
                </div>
              </section>
              <div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Resume editor coming in Phase 3. {sessionId ? `Session: ${sessionId}` : "No session selected."}
              </div>
            </div>
          </div>
        </main>

        {/* Right: chat */}
        <aside className="flex flex-col border-l border-border/60 bg-background">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Chat</p>
              <p className="text-xs text-muted-foreground">UX Designer @ Netflix</p>
            </div>
            <Badge variant="secondary">idle</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-4 text-sm text-muted-foreground">
                Chat, tailoring, and apply actions land here in Phase 4.
              </p>
            </div>
          </div>
          <div className="border-t border-border/60 p-3">
            <div className="rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              Paste a job or drop a file…
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ResumeTab({ name, active }: { name: string; active?: boolean }) {
  return (
    <button
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
      }`}
    >
      <FileText className="h-3.5 w-3.5" />
      {name}
    </button>
  );
}

function ModeButton({ label, active, icon }: { label: string; active?: boolean; icon: React.ReactNode }) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
        active ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function HistoryGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function HistoryItem({ title, active, locked }: { title: string; active?: boolean; locked?: boolean }) {
  return (
    <button
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
      }`}
    >
      <span className="truncate">{title}</span>
      {locked ? <span className="text-xs">🔒</span> : null}
    </button>
  );
}
