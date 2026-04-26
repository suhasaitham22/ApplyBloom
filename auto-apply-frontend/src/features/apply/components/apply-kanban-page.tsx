"use client";

import { useSearchParams } from "next/navigation";
import { ApplyKanban } from "./apply-kanban";

export function ApplyKanbanPage() {
  const sp = useSearchParams();
  const sessionId = sp.get("session_id");
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Applications</h1>
      <ApplyKanban sessionId={sessionId} />
    </div>
  );
}
