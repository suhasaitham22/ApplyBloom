import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Official Supabase PKCE callback per https://supabase.com/docs/guides/auth/server-side/nextjs
// Server-side code exchange — reads verifier from cookies, sets session cookies, redirects.
// If no ?code param, falls through to client-side hash handler on /auth/callback/client
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/studio";
  const nextPath = next.startsWith("/") ? next : "/studio";

  // No code means this is an implicit/hash-flow callback. Render the client page to handle it.
  if (!code) {
    return NextResponse.rewrite(new URL("/auth/callback/client" + request.nextUrl.search, request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  const response = NextResponse.redirect(`${origin}${nextPath}`);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        response.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}
