import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "lacanau_admin";

function tokenFor(code: string): string {
  return createHash("sha256").update(`lacanau:${code}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function POST(request: Request) {
  const adminCode = process.env.ADMIN_CODE;
  if (!adminCode) {
    return NextResponse.json({ ok: false, error: "ADMIN_CODE non configuré" }, { status: 500 });
  }
  const { code } = (await request.json().catch(() => ({}))) as { code?: string };
  if (!code || !safeEqual(String(code), adminCode)) {
    return NextResponse.json({ ok: false, error: "Mauvais code" }, { status: 401 });
  }
  const store = await cookies();
  store.set(COOKIE, tokenFor(adminCode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const adminCode = process.env.ADMIN_CODE;
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const ok = !!adminCode && !!token && safeEqual(token, tokenFor(adminCode));
  return NextResponse.json({ ok });
}
