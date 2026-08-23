import { NextResponse } from "next/server";
import { demoInvites } from "@/lib/demoInvites";
import { hasDatabase, supabaseRequest } from "@/lib/db";

type RsvpRow = { attending: boolean; confirmed_guests: number };
type InvitationRow = {
  display_name: string;
  guest_limit: number;
  rsvps: RsvpRow | RsvpRow[] | null;
};

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasDatabase()) {
    const demo = demoInvites[token];
    if (!demo) return NextResponse.json({ ok: false, error: "Invitación no encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, invitation: { ...demo, attending: null, confirmed_guests: null, mode: "demo" } });
  }

  try {
    const rows = await supabaseRequest<InvitationRow[]>(
      `invitations?select=display_name,guest_limit,rsvps(attending,confirmed_guests)&token=eq.${encodeURIComponent(token)}&active=eq.true&limit=1`
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "Invitación no encontrada." }, { status: 404 });
    const rsvp = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    return NextResponse.json({
      ok: true,
      invitation: {
        display_name: row.display_name,
        guest_limit: row.guest_limit,
        attending: rsvp?.attending ?? null,
        confirmed_guests: rsvp?.confirmed_guests ?? null,
        mode: "live"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "No fue posible abrir la invitación." }, { status: 500 });
  }
}
