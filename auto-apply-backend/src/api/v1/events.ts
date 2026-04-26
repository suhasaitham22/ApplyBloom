// Server-Sent Events stream for chat + dashboard live updates.
//
// GET /api/v1/sessions/:id/events            — session scope
// GET /api/v1/apply/:id/events               — apply scope
//
// Request lifecycle:
//   1. Client connects with `Accept: text/event-stream` (fetch EventSource polyfill)
//   2. Server replays events since `?since=<iso>` (if provided), then holds open
//      for ~25s polling session_events every 1s for new rows
//   3. Client reconnects (EventSource auto-reconnects) passing last event timestamp
//
// We cap at 25s to stay well under CF Workers' 30s wall-clock limit.

import { problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import { listEventsSince, type SessionEvent } from "@/services/session-events/store";

const STREAM_WALL_MS = 25_000;
const POLL_INTERVAL_MS = 1_000;

export type EventsRoute =
  | { kind: "session"; method: "GET"; id: string }
  | { kind: "apply"; method: "GET"; id: string };

function sseFormat(event: SessionEvent): string {
  return [
    `id: ${event.created_at}`,
    `event: ${event.kind}`,
    `data: ${JSON.stringify(event)}`,
    "", "",
  ].join("\n");
}

export async function handleEventsRequest(
  request: Request, env: Env, route: EventsRoute,
): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  const url = new URL(request.url);
  const since0 = url.searchParams.get("since") ?? undefined;
  const filter = route.kind === "session"
    ? { session_id: route.id, since: since0 }
    : { apply_id: route.id, since: since0 };

  const deadline = Date.now() + STREAM_WALL_MS;
  let lastTs: string | undefined = since0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const write = (s: string) => controller.enqueue(enc.encode(s));

      // Initial retry hint so EventSource reconnects quickly after close.
      write(`retry: 500\n\n`);

      try {
        while (Date.now() < deadline) {
          const events = await listEventsSince(env, userId, { ...filter, since: lastTs, limit: 100 });
          for (const e of events) {
            write(sseFormat(e));
            lastTs = e.created_at;
          }
          // Keep-alive ping so intermediaries don't close the connection.
          write(`: keep-alive\n\n`);
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          if (request.signal.aborted) break;
        }
      } catch (err) {
        write(`event: error\ndata: ${JSON.stringify({ message: err instanceof Error ? err.message : String(err) })}\n\n`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
