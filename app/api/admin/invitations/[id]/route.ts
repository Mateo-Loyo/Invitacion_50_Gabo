import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { hasDatabase, supabaseRequest } from "@/lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeWhatsApp(value: unknown) {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length === 13 && digits.startsWith("521")) digits = `52${digits.slice(3)}`;
  if (digits.length < 11 || digits.length > 15) return undefined;
  return digits;
}

type AuthorizationResult =
  | { id: string; error?: never }
  | { error: NextResponse; id?: never };

async function authorizeAndGetId(params: Promise<{ id: string }>): Promise<AuthorizationResult> {
  if (!(await isAdmin())) return { error: NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 }) };
  if (!hasDatabase()) return { error: NextResponse.json({ ok: false, error: "Supabase aún no está conectado." }, { status: 503 }) };
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return { error: NextResponse.json({ ok: false, error: "Invitación no válida." }, { status: 400 }) };
  return { id };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAndGetId(params);
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const editsGuestData = "display_name" in body || "guest_limit" in body || "whatsapp_phone" in body;

  if (editsGuestData) {
    const displayName = String(body.display_name || "").trim();
    const guestLimit = Number(body.guest_limit);
    const whatsappPhone = normalizeWhatsApp(body.whatsapp_phone);
    if (!displayName || !Number.isInteger(guestLimit) || guestLimit < 1 || guestLimit > 5) {
      return NextResponse.json({ ok: false, error: "Datos de invitación no válidos." }, { status: 400 });
    }
    if (whatsappPhone === undefined) {
      return NextResponse.json({ ok: false, error: "WhatsApp no válido. Para México escribe los 10 dígitos." }, { status: 400 });
    }

    const rsvps = await supabaseRequest<{ confirmed_guests: number }[]>(
      `rsvps?select=confirmed_guests&invite_id=eq.${encodeURIComponent(auth.id)}&limit=1`
    );
    const currentConfirmed = rsvps[0]?.confirmed_guests || 0;
    if (currentConfirmed > guestLimit) {
      return NextResponse.json(
        { ok: false, error: `No puedes reducir a ${guestLimit}: ya hay ${currentConfirmed} personas confirmadas.` },
        { status: 400 }
      );
    }

    update.display_name = displayName;
    update.guest_limit = guestLimit;
    update.whatsapp_phone = whatsappPhone;
  }

  if ("active" in body) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ ok: false, error: "Estado de invitación no válido." }, { status: 400 });
    }
    update.active = body.active;
  }

  if (body.mark_sent === true) update.sent_at = new Date().toISOString();
  if (body.mark_sent === false) update.sent_at = null;
  if (body.mark_reminder === true) update.reminder_sent_at = new Date().toISOString();
  if (body.mark_reminder === false) update.reminder_sent_at = null;

  try {
    await supabaseRequest<void>(`invitations?id=eq.${encodeURIComponent(auth.id)}`, {
      method: "PATCH",
      body: update,
      prefer: "return=minimal"
    });
    return NextResponse.json({
      ok: true,
      sent_at: update.sent_at ?? undefined,
      reminder_sent_at: update.reminder_sent_at ?? undefined
    });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo actualizar la invitación." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAndGetId(params);
  if (auth.error) return auth.error;

  try {
    await supabaseRequest<void>(`invitations?id=eq.${encodeURIComponent(auth.id)}`, {
      method: "PATCH",
      body: { active: false, updated_at: new Date().toISOString() },
      prefer: "return=minimal"
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo desactivar la invitación." }, { status: 500 });
  }
}
