import { NextResponse } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/supabase/demo";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const id = `demo_${Math.random().toString(36).slice(2, 10)}`;
  res.cookies.set({
    name: DEMO_COOKIE_NAME,
    value: id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: DEMO_COOKIE_NAME, value: "", maxAge: 0, path: "/" });
  return res;
}
