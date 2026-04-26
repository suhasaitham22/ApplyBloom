"use client";

import { useEffect, useRef, useState } from "react";
import { sessionEventsUrl } from "@/features/studio/lib/studio-client";

export interface ApplyEvent {
  id: string;
  kind: string;
  session_id: string | null;
  apply_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Subscribe to /api/v1/sessions/:sessionId/events.
 * Reconnects automatically when the CF Worker closes the stream (~25s).
 */
export function useApplyEvents(sessionId: string | null): ApplyEvent[] {
  const [events, setEvents] = useState<ApplyEvent[]>([]);
  const lastTsRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!sessionId) return;
    let es: EventSource | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const url = sessionEventsUrl(sessionId, lastTsRef.current);
      try {
        es = new EventSource(url, { withCredentials: false });
      } catch {
        setTimeout(connect, 1000);
        return;
      }
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as ApplyEvent;
          lastTsRef.current = parsed.created_at;
          setEvents((prev) => [...prev, parsed]);
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        es?.close();
        if (!closed) setTimeout(connect, 500);
      };
    };

    connect();
    return () => { closed = true; es?.close(); };
  }, [sessionId]);

  return events;
}
