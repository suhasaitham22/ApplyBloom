"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/browser";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "/studio";
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const configured = isSupabaseConfigured();
  const [demoPending, setDemoPending] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (!configured) {
      toast.info("Supabase not configured yet — use the demo account below.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`,
        },
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email for a magic link.");
    });
  }

  async function handleGoogle() {
    if (!configured) {
      toast.info("Supabase not configured yet.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`,
      },
    });
    if (error) {
      // Most common: "Unsupported provider: provider is not enabled"
      toast.error(
        error.message.toLowerCase().includes("not enabled")
          ? "Google sign-in is not set up yet. Use email magic link instead."
          : error.message,
      );
    }
  }

  async function handleDemo() {
    setDemoPending(true);
    try {
      const res = await fetch("/api/demo-login", { method: "POST" });
      if (!res.ok) throw new Error("Demo login failed");
      router.push(nextParam);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo login failed");
      setDemoPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleEmail} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="pl-9"
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {mode === "login" ? "Send magic link" : "Create account"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={!configured}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        {!configured && (
          <Button variant="secondary" className="w-full" onClick={handleDemo} disabled={demoPending}>
            {demoPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue as demo user
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>Don't have an account? <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">Sign up</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8.1z"/>
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8C3.9 20.5 7.6 23 12 23z"/>
      <path fill="#FBBC05" d="M5.8 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.1 4.9l3.7-2.8z"/>
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2C17.5 2 14.9 1 12 1 7.6 1 3.9 3.5 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/>
    </svg>
  );
}
