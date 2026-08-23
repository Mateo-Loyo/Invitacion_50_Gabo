import { after, NextResponse } from "next/server";
import { demoInvites } from "@/lib/demoInvites";
import { hasDatabase, supabaseRequest } from "@/lib/db";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

type RsvpRow = { attending: boolean; confirmed_guests: number };
type InvitationRow = {
  id: string;
  display_name: string;
  guest_limit: number;
  opened_at: string | null;
  open_count: number;
  rsvps: RsvpRow | RsvpRow[] | null;
};

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasDatabase()) {
    const demo = demoInvites[token];
    if (!demo) return NextResponse.json({ ok: false, error: "Invitación no encontrada." }, { status: 404, headers: NO_STORE });
    return NextResponse.json(
      { ok: true, invitation: { ...demo, attending: null, confirmed_guests: null, mode: "demo" } },
      { headers: NO_STORE }
    );
  }

  try {
    const rows = await supabaseRequest<InvitationRow[]>(
      `invitations?select=id,display_name,guest_limit,opened_at,open_count,rsvps(attending,confirmed_guests)&token=eq.${encodeURIComponent(token)}&active=eq.true&limit=1`
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "Invitación no encontrada." }, { status: 404, headers: NO_STORE });

    const viewedAt = new Date().toISOString();
    after(async () => {
      try {
        await supabaseRequest<void>(`invitations?id=eq.${encodeURIComponent(row.id)}`, {
          method: "PATCH",
          body: {
            opened_at: row.opened_at || viewedAt,
            last_opened_at: viewedAt,
            open_count: row.open_count + 1
          },
          prefer: "return=minimal"
        });
      } catch {
        console.warn("[invitation:open-tracking] No se pudo registrar la apertura.");
      }
    });

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
    }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: "No fue posible abrir la invitación." }, { status: 500, headers: NO_STORE });
  }
}
