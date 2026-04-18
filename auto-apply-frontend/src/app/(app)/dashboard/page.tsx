import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center border-b border-border/60 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/applybloom-logo.svg" alt="" width={22} height={22} />
          <span className="font-display text-sm font-semibold tracking-tight">ApplyBloom</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/studio">Studio</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl tracking-tight">Applications</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track every application, status, and resume version.</p>
        <div className="mt-8 rounded-lg border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
          Dashboard table lands in Phase 8.
        </div>
      </main>
    </div>
  );
}
