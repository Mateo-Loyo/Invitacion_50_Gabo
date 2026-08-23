import crypto from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { hasDatabase, supabaseRequest } from "@/lib/db";

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
  }

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
    await supabaseRequest<void>("invitations", {
      method: "POST",
      body: { display_name: displayName, guest_limit: guestLimit, token, whatsapp_phone: whatsappPhone },
      prefer: "return=minimal"
    });
    return NextResponse.json({ ok: true, token });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo crear la invitación." }, { status: 500 });
  }
}
