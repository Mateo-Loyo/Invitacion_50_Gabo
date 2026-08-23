import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { hasDatabase, supabaseRequest } from "@/lib/db";

type RsvpRow = { attending: boolean; confirmed_guests: number };
type InvitationRow = {
  id: string;
  display_name: string;
  guest_limit: number;
  token: string;
  active: boolean;
  whatsapp_phone: string | null;
  rsvps: RsvpRow | RsvpRow[] | null;
};

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "Supabase aún no está conectado." }, { status: 503 });

  try {
    const invitations = await supabaseRequest<InvitationRow[]>(
      "invitations?select=id,display_name,guest_limit,token,active,whatsapp_phone,rsvps(attending,confirmed_guests)&active=eq.true&order=created_at.asc"
    );
    const rows = invitations.map(({ rsvps, ...invitation }) => {
      const rsvp = Array.isArray(rsvps) ? rsvps[0] : rsvps;
      return {
        ...invitation,
        attending: rsvp?.attending ?? null,
        confirmed_guests: rsvp?.confirmed_guests ?? null
      };
    });
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar las invitaciones." }, { status: 500 });
  }
}
