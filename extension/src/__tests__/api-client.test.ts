import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimNext, reportStatus, reportStep, matchQA, ApiError } from "../lib/api-client";

const cfg = { baseUrl: "http://x", token: "t", deviceId: "dev-1" };

beforeEach(() => { vi.restoreAllMocks(); });

describe("api-client", () => {
  it("claimNext posts device_id and unwraps data", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { item: null } }), { status: 200 }));
    const r = await claimNext(cfg);
    expect(r.item).toBeNull();
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("http://x/api/v1/apply/claim");
    expect(JSON.parse(call[1].body)).toEqual({ device_id: "dev-1" });
  });

  it("reportStep posts kind=step + step + note", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    await reportStep(cfg, "aid", "opened_page", "info");
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ kind: "step", step: "opened_page", note: "info" });
  });

  it("reportStatus posts arbitrary kind + extras", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { item: null } }), { status: 200 }));
    await reportStatus(cfg, "aid", "failed", { error: "boom" });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ kind: "failed", error: "boom" });
  });

  it("matchQA unwraps match envelope", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { match: { record: { id: "x", answer: "Yes" }, similarity: 1, verdict: "auto" } },
    }), { status: 200 }));
    const { match } = await matchQA(cfg, "q?");
    expect(match?.verdict).toBe("auto");
  });

  it("non-2xx throws ApiError with code", async () => {
    const mkResp = () => new Response(JSON.stringify({
      title: "Nope", detail: "bad", code: "bad_input",
    }), { status: 400 });
    global.fetch = vi.fn().mockImplementation(async () => mkResp());
    await expect(claimNext(cfg)).rejects.toBeInstanceOf(ApiError);
    try {
      await claimNext(cfg);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("bad_input");
      expect((e as ApiError).status).toBe(400);
    }
  });
});
