"use client";

// Rich-text resume editor built on PlateJS (v52).
// - JSON is the source of truth — Plate is just the view/edit layer.
// - Debounced autosave PATCHes the backend; backend auto-snapshots a version.
// - Diff summary (from last version) is pinned at the top.
// - AI edits surface as amber-highlighted blocks.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPlateEditor, Plate, PlateContent } from "platejs/react";
import { BoldPlugin, ItalicPlugin, UnderlinePlugin, H1Plugin, H2Plugin, H3Plugin } from "@platejs/basic-nodes/react";
import { Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon, Heading1, Heading2, Heading3, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { resumeToPlate, plateToResume, markChangedPaths, type StructuredResume } from "@/features/studio/lib/resume-plate";

interface Props {
  resumeId: string;
  parsed: StructuredResume;
  /** Paths the AI just changed — flash amber. */
  recentChangedPaths?: string[];
  /** Persist new JSON. Parent calls PATCH + bumps version history. */
  onSave: (next: StructuredResume) => Promise<void>;
  /** Optional diff summary pinned at top */
  diffSummary?: string | null;
  readOnly?: boolean;
}

const AUTOSAVE_MS = 900;

export function ResumeEditor({ resumeId, parsed, recentChangedPaths, onSave, diffSummary, readOnly }: Props) {
  const initialDoc = useMemo(() => resumeToPlate(parsed), [resumeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsedRef = useRef<StructuredResume>(parsed);
  parsedRef.current = parsed;

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialised = useRef<string>("");

  const editor = useMemo(
    () =>
      createPlateEditor({
        plugins: [BoldPlugin, ItalicPlugin, UnderlinePlugin, H1Plugin, H2Plugin, H3Plugin],
        value: initialDoc as any,
      }),
    [resumeId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // When the AI updates the resume, reset the editor value (with highlights).
  useEffect(() => {
    const next = recentChangedPaths && recentChangedPaths.length > 0
      ? markChangedPaths(resumeToPlate(parsed), new Set(recentChangedPaths))
      : resumeToPlate(parsed);
    editor.tf.setValue(next as any);
    lastSerialised.current = JSON.stringify(next);
  }, [parsed, recentChangedPaths, editor]);

  async function flushSave(value: any) {
    setSaveState("saving");
    try {
      const next = plateToResume(value, parsedRef.current);
      await onSave(next);
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
    } catch (e) {
      setSaveState("error");
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  function handleChange({ value }: { value: any }) {
    const ser = JSON.stringify(value);
    if (ser === lastSerialised.current) return;
    lastSerialised.current = ser;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(value), AUTOSAVE_MS);
  }

  return (
    <Plate editor={editor} onChange={handleChange} readOnly={readOnly}>
      <div className="flex flex-col rounded-lg border border-border bg-background shadow-sm">
        {/* Sticky header: diff summary pinned + toolbar + save state */}
        <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-t-lg border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          {diffSummary && (
            <div className="rounded-md border border-[hsl(var(--brand-amber)/0.5)] bg-[hsl(var(--brand-amber)/0.1)] px-3 py-1.5 text-[11px] text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Recent changes: </span>
              {diffSummary}
            </div>
          )}
          <div className="flex items-center gap-1">
            <ToolbarGroup>
              <ToolbarButton onClick={() => (editor as any).tf.toggleMark("bold")} title="Bold (⌘B)"><BoldIcon className="h-3.5 w-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => (editor as any).tf.toggleMark("italic")} title="Italic (⌘I)"><ItalicIcon className="h-3.5 w-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => (editor as any).tf.toggleMark("underline")} title="Underline (⌘U)"><UnderlineIcon className="h-3.5 w-3.5" /></ToolbarButton>
            </ToolbarGroup>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolbarGroup>
              <ToolbarButton onClick={() => (editor as any).tf.h1.toggle()} title="Heading 1"><Heading1 className="h-3.5 w-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => (editor as any).tf.h2.toggle()} title="Heading 2"><Heading2 className="h-3.5 w-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => (editor as any).tf.h3.toggle()} title="Heading 3"><Heading3 className="h-3.5 w-3.5" /></ToolbarButton>
            </ToolbarGroup>
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {saveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
              {saveState === "saved" && <><Save className="h-3 w-3 text-emerald-500" /> Saved</>}
              {saveState === "error" && <span className="text-red-500">Save failed</span>}
              {saveState === "idle" && <span className="text-muted-foreground/50">Autosave on</span>}
            </div>
          </div>
        </div>
        <div className="px-10 py-8">
          <PlateContent
            data-testid="resume-editor-content"
            className="prose prose-sm max-w-none outline-none focus:outline-none"
            placeholder="Start typing…"
            renderElement={(props: any) => <ResumeElement {...props} />}
            renderLeaf={(props: any) => <ResumeLeaf {...props} />}
          />
        </div>
      </div>
    </Plate>
  );
}

// ── Element renderer ─────────────────────────────────────────────────
function ResumeElement({ attributes, children, element }: any) {
  const changed = element?.changed;
  const hl = changed ? "bg-[hsl(var(--brand-amber)/0.18)] rounded px-1 -mx-1 transition-colors" : "";
  switch (element.type) {
    case "h1":
      return <h1 {...attributes} className={`my-2 text-2xl font-display font-semibold tracking-tight ${hl}`}>{children}</h1>;
    case "h2":
      return <h2 {...attributes} className={`mt-5 mb-2 border-b border-border/60 pb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[hsl(var(--brand-navy))] ${hl}`}>{children}</h2>;
    case "h3":
      return <h3 {...attributes} className={`mt-3 mb-1 text-sm font-semibold text-foreground ${hl}`}>{children}</h3>;
    default:
      return <p {...attributes} className={`my-1 text-sm leading-relaxed ${hl}`}>{children}</p>;
  }
}

// ── Leaf renderer (marks) ────────────────────────────────────────────
function ResumeLeaf({ attributes, children, leaf }: any) {
  let el = children;
  if (leaf.bold) el = <strong className="font-semibold">{el}</strong>;
  if (leaf.italic) el = <em className="italic">{el}</em>;
  if (leaf.underline) el = <u className="underline">{el}</u>;
  return <span {...attributes}>{el}</span>;
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:outline-none"
    >
      {children}
    </button>
  );
}
