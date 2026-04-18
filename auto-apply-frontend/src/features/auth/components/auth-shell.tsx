import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 lg:min-h-0">
        <Link href="/" className="flex items-center gap-2" aria-label="ApplyBloom home">
          <Image src="/applybloom-logo.svg" alt="" width={28} height={28} />
          <span className="font-display text-lg font-semibold tracking-tight">ApplyBloom</span>
        </Link>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-3xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <div className="text-xs text-muted-foreground">{footer}</div>
      </div>
      {/* Right: aurora + tagline */}
      <div className="relative hidden overflow-hidden bg-[#0d1a28] text-white lg:block">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
               style={{ background: "radial-gradient(closest-side, rgba(47,124,255,0.35), transparent 70%)" }} />
          <div className="absolute right-0 bottom-0 h-[30rem] w-[30rem] translate-x-1/3 translate-y-1/3 rounded-full blur-3xl"
               style={{ background: "radial-gradient(closest-side, rgba(244,162,27,0.28), transparent 70%)" }} />
        </div>
        <div className="relative flex h-full flex-col justify-center p-16">
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">ApplyBloom</p>
          <h2 className="mt-4 font-display text-5xl leading-[1] tracking-tight">
            Apply with{" "}
            <span className="relative inline-block px-2">
              <span className="absolute inset-0 rounded-md" style={{ background: "#f4a21b" }} aria-hidden />
              <span className="relative italic" style={{ color: "#2f7cff" }}>craft</span>
            </span>
            , not spam.
          </h2>
          <p className="mt-6 max-w-md text-white/70">
            A studio for tailored, truthful, trackable applications. Welcome back in.
          </p>
        </div>
      </div>
    </div>
  );
}
