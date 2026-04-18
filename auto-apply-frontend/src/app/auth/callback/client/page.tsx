import { Suspense } from "react";
import { CallbackHashHandler } from "@/features/auth/components/callback-hash-handler";

// Client-side fallback for hash-flow callbacks (admin-issued links, legacy OAuth).
// The parent route.ts only lands here when there is NO ?code= (PKCE) in the URL.
export default function AuthCallbackClientPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Signing you in…</div>}>
      <CallbackHashHandler />
    </Suspense>
  );
}

