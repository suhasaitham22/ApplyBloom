"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { supabaseBrowserClient } from "@/lib/supabase-browser-client";

type AuthMode = "sign-in" | "sign-up";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Use your ApplyBloom account to continue.");

  const hasSupabaseConfig = useMemo(
    () => Boolean(supabaseBrowserClient),
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseConfig) {
      setStatusMessage("Supabase env values are missing. Use demo mode for now.");
      return;
    }
    if (!supabaseBrowserClient) {
      setStatusMessage("Supabase client is unavailable.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(mode === "sign-in" ? "Signing in..." : "Creating account...");

    try {
      if (mode === "sign-in") {
        const { error } = await supabaseBrowserClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setStatusMessage(error.message);
          return;
        }

        setStatusMessage("Signed in. Redirecting to Job Studio...");
        router.push("/job-studio");
        router.refresh();
        return;
      }

      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/job-studio` : undefined;
      const { data, error } = await supabaseBrowserClient.auth.signUp({
        email: email.trim(),
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      if (!data.session) {
        setStatusMessage("Account created. Check your email to confirm your account.");
        return;
      }

      setStatusMessage("Account created. Redirecting to Job Studio...");
      router.push("/job-studio");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMagicLink() {
    if (!hasSupabaseConfig) {
      setStatusMessage("Supabase env values are missing. Use demo mode for now.");
      return;
    }
    if (!supabaseBrowserClient) {
      setStatusMessage("Supabase client is unavailable.");
      return;
    }

    if (!email.trim()) {
      setStatusMessage("Enter your email first.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Sending magic link...");

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/job-studio` : undefined;
      const { error } = await supabaseBrowserClient.auth.signInWithOtp({
        email: email.trim(),
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("Magic link sent. Check your inbox.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="container auth-page">
        <section className="soft-card auth-card">
          <div className="auth-brand-row">
            <div className="brand-lockup">
              <Image
                src="/applybloom-logo.svg"
                alt="ApplyBloom logo"
                width={40}
                height={40}
                className="brand-logo"
                priority
              />
              <div className="brand-copy">
                <strong>ApplyBloom</strong>
                <span>Secure account access</span>
              </div>
            </div>
            <Link href="/" className="ui-button ui-button-ghost" prefetch={false}>
              Back to Home
            </Link>
          </div>

          <div className="auth-header">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Authentication
            </div>
            <h1 className="section-title">Sign in to continue</h1>
            <p className="section-subtitle">
              Access Job Studio, applications, and workflow history from your account.
            </p>
          </div>

          <div className="auth-mode-switch">
            <button
              type="button"
              className="workflow-choice"
              data-active={mode === "sign-in"}
              onClick={() => setMode("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              className="workflow-choice"
              data-active={mode === "sign-up"}
              onClick={() => setMode("sign-up")}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field-stack">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </label>

            <div className="auth-actions">
              <button type="submit" className="ui-button ui-button-primary" disabled={isSubmitting}>
                {isSubmitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
              <button
                type="button"
                className="ui-button ui-button-secondary"
                onClick={handleMagicLink}
                disabled={isSubmitting}
              >
                Send magic link
              </button>
              <Link href="/job-studio" className="ui-button ui-button-ghost" prefetch={false}>
                Continue in demo mode
              </Link>
            </div>
          </form>

          <p className="muted-copy auth-status">{statusMessage}</p>
        </section>
      </div>
    </main>
  );
}
