"use client";

import { useRef } from "react";
import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import { LinkPlugin } from "@platejs/link/react";
import { EquationPlugin, InlineEquationPlugin } from "@platejs/math/react";
import type { Value } from "platejs";
import { Plate, PlateContent, useEditorRef, usePlateEditor } from "platejs/react";
import { Button } from "@/components/ui/button";

export function ResumeRichTextEditor({
  initialText,
  onPlainTextChange,
}: Readonly<{
  initialText: string;
  onPlainTextChange: (value: string) => void;
}>) {
  const initialValueRef = useRef<Value>(buildInitialValue(initialText));
  const editor = usePlateEditor(
    {
      plugins: [BasicBlocksPlugin, BasicMarksPlugin, LinkPlugin, EquationPlugin, InlineEquationPlugin],
      value: initialValueRef.current,
    },
    [],
  );

  if (!editor) {
    return null;
  }

  return (
    <div className="resume-editor-shell">
      <Plate
        editor={editor}
        onValueChange={({ value }) => {
          onPlainTextChange(extractPlainText(value));
        }}
      >
        <ResumeEditorToolbar />
        <div className="resume-editor-surface">
          <PlateContent
            className="resume-editor-content"
            placeholder="Edit resume here. Use LaTeX with the equation actions for formulas."
          />
        </div>
      </Plate>
    </div>
  );
}

function ResumeEditorToolbar() {
  const editor = useEditorRef();
  const unsafeEditor = editor as any;

  function toggleMark(mark: "bold" | "italic" | "underline") {
    const transform = unsafeEditor.tf?.[mark];
    if (typeof transform?.toggle === "function") {
      transform.toggle();
    }
  }

  function insertInlineEquation() {
    const input = window.prompt("Insert inline LaTeX", "\\frac{a+b}{c}");
    if (!input) {
      return;
    }
    const insertApi = unsafeEditor.tf?.insert;
    if (typeof insertApi?.inlineEquation === "function") {
      insertApi.inlineEquation(input);
      return;
    }
    unsafeEditor.insertText(`$${input}$`);
  }

  function insertBlockEquation() {
    const input = window.prompt("Insert block LaTeX", "E = mc^2");
    if (!input) {
      return;
    }
    const insertApi = unsafeEditor.tf?.insert;
    if (typeof insertApi?.equation === "function") {
      insertApi.equation();
      unsafeEditor.insertText(input);
      return;
    }
    unsafeEditor.insertText(`\n$$${input}$$\n`);
  }

  function insertSectionTemplate() {
    unsafeEditor.insertText(
      "\n\nExperience\n- Built distributed services with strong ownership and reliability\n\nProjects\n- Delivered measurable product outcomes with clear metrics\n",
    );
  }

  return (
    <div className="resume-editor-toolbar">
      <Button variant="secondary" onClick={() => toggleMark("bold")}>
        Bold
      </Button>
      <Button variant="secondary" onClick={() => toggleMark("italic")}>
        Italic
      </Button>
      <Button variant="secondary" onClick={() => toggleMark("underline")}>
        Underline
      </Button>
      <Button variant="secondary" onClick={insertInlineEquation}>
        Inline LaTeX
      </Button>
      <Button variant="secondary" onClick={insertBlockEquation}>
        Block LaTeX
      </Button>
      <Button variant="ghost" onClick={insertSectionTemplate}>
        Insert template block
      </Button>
    </div>
  );
}

function buildInitialValue(text: string): Value {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  const nodes = lines.map((line) => ({
    type: "p",
    children: [{ text: line }],
  }));
  return nodes.length > 0 ? nodes : [{ type: "p", children: [{ text: "" }] }];
}

function extractPlainText(value: Value) {
  const lines = value
    .map((node) => collectText(node))
    .filter((line) => line.trim().length > 0);
  return lines.join("\n");
}

function collectText(node: unknown): string {
  if (!node || typeof node !== "object") {
    return "";
  }
  if ("text" in (node as { text?: unknown }) && typeof (node as { text?: unknown }).text === "string") {
    return (node as { text: string }).text;
  }
  if ("children" in (node as { children?: unknown }) && Array.isArray((node as { children?: unknown }).children)) {
    return (node as { children: unknown[] }).children.map((child) => collectText(child)).join("");
  }
  return "";
}
