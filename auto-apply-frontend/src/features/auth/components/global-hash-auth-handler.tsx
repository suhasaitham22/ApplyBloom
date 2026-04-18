"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

// Top-level hash-token handler. Runs on every page load and checks
// window.location.hash for Supabase implicit-flow tokens. If present,
// exchanges them for a session and redirects to /studio.
// This covers admin-issued magic links that redirect to the site root.
export function GlobalHashAuthHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.error("[auth] supabase client not configured");
      return;
    }

    (async () => {
      console.info("[auth] hash detected, calling setSession");
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error("[auth] setSession failed", error);
        return;
      }
      console.info("[auth] session established", { user_id: data.session?.user?.id });
      // Verify cookies are really set before navigating
      const { data: check } = await supabase.auth.getSession();
      console.info("[auth] verification getSession after set:", { has_session: !!check.session });
      // Clear the hash
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      // Hard reload /studio so middleware + fresh client pick up cookies
      window.location.href = "/studio";
    })();
  }, [router]);

  return null;
}
