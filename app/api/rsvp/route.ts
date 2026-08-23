import { NextResponse } from "next/server";
import { hasDatabase, supabaseRequest } from "@/lib/db";

type InviteRow = { id: string; guest_limit: number };

export async function POST(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "La base de datos aún no está conectada." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
  }

  const token = String(body.token || "").trim();
  if (!token || typeof body.attending !== "boolean") {
    return NextResponse.json({ ok: false, error: "Datos de confirmación no válidos." }, { status: 400 });
  }

  const attending = body.attending;
  const confirmedGuests = attending ? Number(body.confirmedGuests) : 0;

  try {
    const invites = await supabaseRequest<InviteRow[]>(
      `invitations?select=id,guest_limit&token=eq.${encodeURIComponent(token)}&active=eq.true&limit=1`
    );
    const invite = invites[0];
    if (!invite) return NextResponse.json({ ok: false, error: "Invitación no válida." }, { status: 404 });
    if (!Number.isInteger(confirmedGuests) || confirmedGuests < 0 || confirmedGuests > invite.guest_limit || (attending && confirmedGuests < 1)) {
      return NextResponse.json({ ok: false, error: "Número de asistentes no permitido." }, { status: 400 });
    }

    await supabaseRequest<void>("rsvps?on_conflict=invite_id", {
      method: "POST",
      body: {
        invite_id: invite.id,
        attending,
        confirmed_guests: confirmedGuests,
        updated_at: new Date().toISOString()
      },
      prefer: "resolution=merge-duplicates,return=minimal"
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No fue posible guardar la confirmación." }, { status: 500 });
  }
}
