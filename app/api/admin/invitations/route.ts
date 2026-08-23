import crypto from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { db, hasDatabase } from "@/lib/db";

function normalizeWhatsApp(value: unknown) {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length === 13 && digits.startsWith("521")) digits = `52${digits.slice(3)}`;
  if (digits.length < 11 || digits.length > 15) return undefined;
  return digits;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "Supabase aún no está conectado." }, { status: 503 });
  const body = await req.json();
  const displayName = String(body.display_name || "").trim();
  const guestLimit = Number(body.guest_limit);
  const whatsappPhone = normalizeWhatsApp(body.whatsapp_phone);
  if (!displayName || !Number.isInteger(guestLimit) || guestLimit < 1 || guestLimit > 5) {
    return NextResponse.json({ ok: false, error: "Datos de invitación no válidos." }, { status: 400 });
  }
  if (whatsappPhone === undefined) {
    return NextResponse.json({ ok: false, error: "WhatsApp no válido. Para México escribe los 10 dígitos del celular." }, { status: 400 });
  }
  const token = "GB-" + crypto.randomBytes(9).toString("base64url");
  try {
    await db()`
      insert into public.invitations (display_name, guest_limit, token, whatsapp_phone)
      values (${displayName}, ${guestLimit}, ${token}, ${whatsappPhone})
    `;
    return NextResponse.json({ ok: true, token });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo crear la invitación." }, { status: 500 });
  }
}
