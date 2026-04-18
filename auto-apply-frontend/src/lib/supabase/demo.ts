const DEMO_COOKIE = "ab_demo_user";

export function isDemoModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function readDemoUserFromCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(/;\s*/).find((p) => p.startsWith(`${DEMO_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") || null : null;
}

export const DEMO_COOKIE_NAME = DEMO_COOKIE;
