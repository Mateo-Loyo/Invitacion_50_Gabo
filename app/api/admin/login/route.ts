import { NextResponse } from "next/server";
import { adminCookieName, adminCookieValue } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  const sessionValue = adminCookieValue();
  if (!expected || !sessionValue) {
    return NextResponse.json({ ok: false, error: "El panel aún no está configurado." }, { status: 503 });
  }

  const { password } = await req.json();
  if (String(password || "") !== expected) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName, sessionValue, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return res;
}

