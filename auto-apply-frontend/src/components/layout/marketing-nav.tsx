"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/85 backdrop-blur-xl shadow-sm shadow-black/5"
          : "bg-background/60 backdrop-blur-sm",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="ApplyBloom home">
          <Image src="/applybloom-logo.svg" alt="" width={28} height={28} priority />
          <span className="font-display text-lg font-semibold tracking-tight">ApplyBloom</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#pipeline" className="transition hover:text-foreground">How it works</a>
          <a href="#tailoring" className="transition hover:text-foreground">Tailoring</a>
          <a href="#infra" className="transition hover:text-foreground">Under the hood</a>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/studio">Job Studio</Link>
          </Button>
        </div>
        <button
          type="button"
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open ? (
        <div className="border-t border-border bg-background md:hidden">
          <div className="flex flex-col gap-1 p-4">
            <Link href="#pipeline" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">How it works</Link>
            <Link href="#tailoring" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Tailoring</Link>
            <Link href="#infra" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Under the hood</Link>
            <div className="my-2 h-px bg-border" />
            <Button variant="ghost" asChild className="justify-start">
              <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/studio" onClick={() => setOpen(false)}>Job Studio</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
