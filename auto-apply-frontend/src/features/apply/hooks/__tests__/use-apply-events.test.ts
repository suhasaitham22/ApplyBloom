import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/features/studio/lib/studio-client", () => ({
  sessionEventsUrl: (sid: string, since?: string) => `http://x/api/v1/sessions/${sid}/events${since ? `?since=${since}` : ""}`,
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  close() { this.closed = true; }
  emit(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
  }
}

(globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;

import { useApplyEvents } from "../use-apply-events";

beforeEach(() => { FakeEventSource.instances.length = 0; });

describe("useApplyEvents", () => {
  it("connects when sessionId is provided", async () => {
    const { result } = renderHook(() => useApplyEvents("s1"));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(FakeEventSource.instances[0].url).toMatch(/sessions\/s1\/events/);
    expect(result.current).toEqual([]);
  });

  it("appends parsed events to state", async () => {
    const { result } = renderHook(() => useApplyEvents("s1"));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    act(() => {
      FakeEventSource.instances[0].emit({
        id: "e1", kind: "apply_queued", session_id: "s1", apply_id: null,
        payload: {}, created_at: "2025-01-01",
      });
    });
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].kind).toBe("apply_queued");
  });

  it("does nothing when sessionId is null", () => {
    renderHook(() => useApplyEvents(null));
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
