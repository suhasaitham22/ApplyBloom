"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
import { answerPendingQA, type QAPendingItem } from "@/features/studio/lib/studio-client";

export interface QAAnswerCardProps {
  item: QAPendingItem;
  onAnswered?: () => void;
}

export function QAAnswerCard({ item, onAnswered }: QAAnswerCardProps) {
  const [answer, setAnswer] = useState(item.suggested_answer ?? "");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!answer.trim()) return;
    setSending(true);
    try {
      await answerPendingQA(item.id, answer);
      toast.success("Answer saved + applied");
      onAnswered?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to answer");
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="rounded-lg border border-rose-200 bg-rose-50/40 p-4 text-sm">
      <header className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-rose-700">Needs your answer</span>
        {item.suggested_verdict === "suggest" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-rose-700">
            <Sparkles className="h-3 w-3" /> Suggestion
          </span>
        )}
      </header>
      <div className="mb-2 text-neutral-900">{item.question_text}</div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Your answer..."
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={sending || !answer.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          <Send className="h-3 w-3" />
          {sending ? "Saving..." : "Submit answer"}
        </button>
      </div>
    </article>
  );
}
