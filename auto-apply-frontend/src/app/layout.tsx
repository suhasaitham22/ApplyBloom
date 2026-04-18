import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "sonner";
import { GlobalHashAuthHandler } from "@/features/auth/components/global-hash-auth-handler";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ApplyBloom — Apply with craft, not spam.", template: "%s · ApplyBloom" },
  description: "ApplyBloom turns your resume into tailored, tracked applications with AI.",
  metadataBase: new URL("https://applybloom.example"),
  openGraph: { title: "ApplyBloom", description: "Apply with craft, not spam.", type: "website" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1a28" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${syne.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground antialiased">
        <QueryProvider>
          <GlobalHashAuthHandler />
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
