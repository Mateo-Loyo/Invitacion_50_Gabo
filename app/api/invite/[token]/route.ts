import { NextResponse } from "next/server";
import { demoInvites } from "@/lib/demoInvites";
import { db, hasDatabase } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasDatabase()) {
    const demo = demoInvites[token];
    if (!demo) return NextResponse.json({ ok: false, error: "Invitación no encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, invitation: { ...demo, attending: null, confirmed_guests: null, mode: "demo" } });
  }
  try {
    const sql = db();
    const rows = await sql<{
      display_name: string;
      guest_limit: number;
      attending: boolean | null;
      confirmed_guests: number | null;
    }[]>`
      select i.display_name, i.guest_limit, r.attending, r.confirmed_guests
      from public.invitations i
      left join public.rsvps r on r.invite_id = i.id
      where i.token = ${token} and i.active = true
      limit 1
    `;
    const invitation = rows[0];
    if (!invitation) return NextResponse.json({ ok: false, error: "Invitación no encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, invitation: { ...invitation, mode: "live" } });
  } catch {
    return NextResponse.json({ ok: false, error: "No fue posible abrir la invitación." }, { status: 500 });
  }
}
