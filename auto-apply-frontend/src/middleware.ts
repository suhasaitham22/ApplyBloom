import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { newRequestId } from "@/lib/telemetry/request-id";
import { DEMO_COOKIE_NAME } from "@/lib/supabase/demo";

const PROTECTED_PREFIXES = ["/studio", "/dashboard"];
const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get("x-request-id") ?? newRequestId();

  const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
  response.headers.set("x-request-id", requestId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: { id: string } | null = null;

  if (supabaseUrl && supabaseKey) {
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
    const { data } = await supabase.auth.getUser();
    if (data.user) user = { id: data.user.id };
  }

  if (!user) {
    const demoId = request.cookies.get(DEMO_COOKIE_NAME)?.value;
    if (demoId) user = { id: demoId };
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const next = request.nextUrl.searchParams.get("next") ?? "/studio";
    const url = request.nextUrl.clone();
    url.pathname = next.startsWith("/") ? next : "/studio";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
