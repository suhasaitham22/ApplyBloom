"use client";

// Resume editor (PlateJS v52) with structured ATS rendering + explicit save.
// JSON is source of truth; Plate renders + handles text editing only.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPlateEditor, Plate, PlateContent } from "platejs/react";
import { BoldPlugin, ItalicPlugin, UnderlinePlugin } from "@platejs/basic-nodes/react";
import { Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon, Save, Loader2, Keyboard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { resumeToPlate, plateToResume, markChangedPaths, type StructuredResume } from "@/features/studio/lib/resume-plate";

interface Props {
  resumeId: string;
  parsed: StructuredResume;
  recentChangedPaths?: string[];
  onSave: (next: StructuredResume) => Promise<void>;
  diffSummary?: string | null;
  readOnly?: boolean;
}

export function ResumeEditor({ resumeId, parsed, recentChangedPaths, onSave, diffSummary, readOnly }: Props) {
  const initialDoc = useMemo(() => resumeToPlate(parsed), [resumeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsedRef = useRef<StructuredResume>(parsed);
  parsedRef.current = parsed;

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const currentValue = useRef<any[]>(initialDoc);

  const editor = useMemo(
    () =>
      createPlateEditor({
        plugins: [BoldPlugin, ItalicPlugin, UnderlinePlugin],
        value: initialDoc,
      }),
    [resumeId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // When AI updates the resume from outside, reset editor — but only if user has NO unsaved changes.
  useEffect(() => {
    if (dirty) {
      // AI edit arrived while user has unsaved local changes. Warn, but don't clobber.
      toast.info("AI updated the resume. Save or discard your local edits to see the change.", { duration: 5000 });
      return;
    }
    const next = recentChangedPaths && recentChangedPaths.length > 0
      ? markChangedPaths(resumeToPlate(parsed), new Set(recentChangedPaths))
      : resumeToPlate(parsed);
    editor.tf.setValue(next);
    currentValue.current = next;
  }, [parsed, recentChangedPaths, editor, dirty]);

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const next = plateToResume(currentValue.current, parsedRef.current);
      await onSave(next);
      setDirty(false);
      setLastSavedAt(Date.now());
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!dirty) return;
    if (!confirm("Discard your unsaved changes?")) return;
    editor.tf.setValue(resumeToPlate(parsedRef.current));
    currentValue.current = resumeToPlate(parsedRef.current);
    setDirty(false);
  }

  // ⌘S / Ctrl+S — save. Also warn before unload if dirty.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    }
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange({ value }: { value: any }) {
    currentValue.current = value;
    const initialStr = JSON.stringify(resumeToPlate(parsedRef.current));
    const currentStr = JSON.stringify(value);
    // Strip `changed` marker for comparison (it's a UI-only flag)
    const normalizedCurrent = currentStr.replace(/"changed":true,?/g, "");
    const normalizedInitial = initialStr.replace(/"changed":true,?/g, "");
    setDirty(normalizedCurrent !== normalizedInitial);
  }

  return (
    <Plate editor={editor} onChange={handleChange} readOnly={readOnly}>
      <div className="flex flex-col rounded-lg border border-border bg-background shadow-sm">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-t-lg border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          {diffSummary && (
            <div className="rounded-md border border-[hsl(var(--brand-amber)/0.5)] bg-[hsl(var(--brand-amber)/0.1)] px-3 py-1.5 text-[11px] text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Recent changes: </span>
              {diffSummary}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <ToolbarGroup>
              <ToolbarButton onClick={() => (editor as any).tf.toggleMark("bold")} title="Bold (⌘B)"><BoldIcon className="h-3.5 w-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => (editor as any).tf.toggleMark("italic")} title="Italic (⌘I)"><ItalicIcon className="h-3.5 w-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => (editor as any).tf.toggleMark("underline")} title="Underline (⌘U)"><UnderlineIcon className="h-3.5 w-3.5" /></ToolbarButton>
            </ToolbarGroup>

            <div className="ml-auto flex items-center gap-2">
              {/* Save state indicator */}
              {dirty ? (
                <span className="flex items-center gap-1 text-[11px] text-amber-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              ) : lastSavedAt ? (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Saved {relativeAgo(lastSavedAt)}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Keyboard className="h-3 w-3" /> ⌘S to save
                </span>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleDiscard}
                disabled={!dirty || saving || readOnly}
                className="h-7 text-xs"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!dirty || saving || readOnly}
                className="h-7 gap-1.5 text-xs"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Editor body */}
        <div className="px-10 py-8">
          <PlateContent
            data-testid="resume-editor-content"
            className="outline-none focus:outline-none"
            placeholder="Start typing…"
            renderElement={(p: any) => <ResumeElement {...p} />}
            renderLeaf={(p: any) => <ResumeLeaf {...p} />}
          />
        </div>
      </div>
    </Plate>
  );
}

// ── Custom element renderers preserving ATS formatting ────────────────
function ResumeElement({ attributes, children, element }: any) {
  const changed = element?.changed;
  const hl = changed ? "bg-[hsl(var(--brand-amber)/0.18)] rounded px-1 -mx-1 transition-colors" : "";
  switch (element.type) {
    case "name":
      return <h1 {...attributes} className={`mb-0.5 font-display text-3xl font-semibold tracking-tight ${hl}`}>{children}</h1>;
    case "headline":
      return <p {...attributes} className={`mb-2 text-base text-muted-foreground ${hl}`}>{children}</p>;
    case "contact":
      return <p {...attributes} className={`mb-6 border-b border-border pb-3 text-xs text-muted-foreground ${hl}`}>{children}</p>;
    case "section-title":
      return <h2 {...attributes} contentEditable={false} suppressContentEditableWarning className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-navy))]">{children}</h2>;
    case "summary":
      return <p {...attributes} className={`mb-4 text-sm leading-relaxed text-foreground ${hl}`}>{children}</p>;
    case "skills":
      return <SkillsLine attributes={attributes} className={hl}>{children}</SkillsLine>;
    case "exp-heading":
      return <h3 {...attributes} className={`mt-4 mb-1 text-sm font-semibold text-foreground ${hl}`}>{children}</h3>;
    case "bullet":
      return (
        <div {...attributes} className={`flex items-start gap-2 py-0.5 text-sm leading-relaxed ${hl}`}>
          <span contentEditable={false} className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-foreground/60" />
          <span className="flex-1">{children}</span>
        </div>
      );
    default:
      return <p {...attributes} className={`my-1 text-sm ${hl}`}>{children}</p>;
  }
}

function SkillsLine({ attributes, children, className }: any) {
  // Text edit of the skills line is a plain comma-separated string, but we render
  // it visually as chip-like spans using leading-loose + bg. Keeping single-line
  // text to simplify the edit model.
  return (
    <div {...attributes} className={`mb-4 flex flex-wrap gap-1.5 text-sm leading-loose text-foreground ${className ?? ""}`}>
      {children}
    </div>
  );
}

function ResumeLeaf({ attributes, children, leaf }: any) {
  let el = children;
  if (leaf.bold) el = <strong className="font-semibold">{el}</strong>;
  if (leaf.italic) el = <em className="italic">{el}</em>;
  if (leaf.underline) el = <u className="underline">{el}</u>;
  return <span {...attributes}>{el}</span>;
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">{children}</div>;
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:outline-none"
    >
      {children}
    </button>
  );
}

function relativeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return "a while ago";
}
