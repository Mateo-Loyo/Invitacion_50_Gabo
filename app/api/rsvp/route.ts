import { NextResponse } from "next/server";
import { db, hasDatabase } from "@/lib/db";

export async function POST(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "La base de datos aún no está conectada." }, { status: 503 });
  const body = await req.json();
  const token = String(body.token || "");
  const attending = Boolean(body.attending);
  const confirmedGuests = Number(body.confirmedGuests || 0);
  try {
    const sql = db();
    const invites = await sql<{ id: string; guest_limit: number }[]>`
      select id, guest_limit from public.invitations
      where token = ${token} and active = true limit 1
    `;
    const invite = invites[0];
    if (!invite) return NextResponse.json({ ok: false, error: "Invitación no válida." }, { status: 404 });
    const finalGuests = attending ? confirmedGuests : 0;
    if (!Number.isInteger(finalGuests) || finalGuests < 0 || finalGuests > invite.guest_limit || (attending && finalGuests < 1)) {
      return NextResponse.json({ ok: false, error: "Número de asistentes no permitido." }, { status: 400 });
    }
    await sql`
      insert into public.rsvps (invite_id, attending, confirmed_guests, updated_at)
      values (${invite.id}, ${attending}, ${finalGuests}, now())
      on conflict (invite_id) do update
      set attending = excluded.attending,
          confirmed_guests = excluded.confirmed_guests,
          updated_at = excluded.updated_at
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No fue posible guardar la confirmación." }, { status: 500 });
  }
}
