"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

// Client-side hash-token handler for admin-issued magic links (implicit flow).
// Runs when /auth/callback is hit WITHOUT ?code (so server route skipped to here).
export function CallbackHashHandler() {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<"pending" | "error">("pending");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setStatus("error");
        setError("Supabase not configured");
        return;
      }

      const next = search.get("next") ?? "/studio";
      const nextPath = next.startsWith("/") ? next : "/studio";

      // PKCE flow: code in query string
      const code = search.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          setStatus("error");
          setError(exErr.message);
          return;
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }

      // Implicit flow: tokens in hash
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (!hash || !hash.includes("access_token")) {
        setStatus("error");
        setError("No auth code or token in URL");
        return;
      }
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) {
        setStatus("error");
        setError("Missing tokens in callback");
        return;
      }
      const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (setErr) {
        setStatus("error");
        setError(setErr.message);
        return;
      }
      router.replace(nextPath);
      router.refresh();
    };
    void run();
  }, [router, search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-sm rounded-lg border border-border p-6 text-center">
        {status === "pending" ? (
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        ) : (
          <>
            <p className="text-sm font-medium text-destructive">Sign-in failed</p>
            <p className="mt-2 text-xs text-muted-foreground">{error}</p>
            <a href="/login" className="mt-4 inline-block text-sm underline">Back to login</a>
          </>
        )}
      </div>
    </div>
  );
}
