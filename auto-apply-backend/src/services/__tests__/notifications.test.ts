import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendApplicationEmail, type ApplicationEmailPayload } from "../notifications";

describe("sendApplicationEmail", () => {
  const basePayload: ApplicationEmailPayload = {
    to: "user@example.com",
    job_title: "Software Engineer",
    company: "Acme Corp",
    status: "submitted",
    apply_url: "https://example.com/job",
  };

  describe("without Resend configured", () => {
    it("returns inbox fallback", async () => {
      const result = await sendApplicationEmail(basePayload, {} as any);
      expect(result.delivered).toBe(false);
      expect(result.provider).toBe("inbox");
      expect(result.message).toContain("Resend not configured");
    });
  });

  describe("with Resend configured", () => {
    const env = { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "noreply@test.com" };

    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("sends email on success", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg_123" }),
      });

      const result = await sendApplicationEmail(basePayload, env);
      expect(result.delivered).toBe(true);
      expect(result.provider).toBe("resend");
      expect(result.provider_event_id).toBe("msg_123");
      expect(globalThis.fetch).toHaveBeenCalledOnce();

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe("https://api.resend.com/emails");
      const body = JSON.parse(opts.body);
      expect(body.to).toEqual(["user@example.com"]);
      expect(body.subject).toContain("Applied");
      expect(body.subject).toContain("Software Engineer");
    });

    it("handles HTTP error", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await sendApplicationEmail(basePayload, env);
      expect(result.delivered).toBe(false);
      expect(result.provider).toBe("resend");
      expect(result.message).toContain("500");
    });

    it("handles fetch exception", async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new Error("network"));

      const result = await sendApplicationEmail(basePayload, env);
      expect(result.delivered).toBe(false);
      expect(result.message).toContain("network");
    });

    it("sends saved_for_later subject", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg_456" }),
      });

      await sendApplicationEmail({ ...basePayload, status: "saved_for_later" }, env);
      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.subject).toContain("Saved for later");
    });

    it("handles missing apply_url", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await sendApplicationEmail({ ...basePayload, apply_url: undefined }, env);
      expect(result.delivered).toBe(true);
      expect(result.provider_event_id).toBeNull();
    });
  });
});
