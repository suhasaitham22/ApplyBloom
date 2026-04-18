import Link from "next/link";
import Image from "next/image";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/applybloom-logo.svg" alt="" width={28} height={28} />
            <span className="font-display text-lg font-semibold tracking-tight">ApplyBloom</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            AI-assisted job applications that stay truthful, trackable, and fast.
          </p>
        </div>
        <FooterCol title="Product" links={[["How it works", "/#pipeline"], ["Tailoring", "/#tailoring"], ["Under the hood", "/#infra"]]} />
        <FooterCol title="Company" links={[["Contributing", "https://github.com/"], ["Security", "/#infra"]]} />
        <FooterCol title="Get started" links={[["Sign in", "/login"], ["Create account", "/signup"]]} />
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ApplyBloom · Apply with craft, not spam.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="hover:text-foreground transition">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
