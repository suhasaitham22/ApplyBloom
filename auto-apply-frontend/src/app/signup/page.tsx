import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Begin your story."
      subtitle="One workspace for tailored, truthful, trackable applications."
      footer="Free to start. No credit card needed."
    >
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
