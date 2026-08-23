import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { db, hasDatabase } from "@/lib/db";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "Supabase aún no está conectado." }, { status: 503 });
  try {
    const rows = await db()<{
      id: string; display_name: string; guest_limit: number; token: string;
      active: boolean; whatsapp_phone: string | null; attending: boolean | null;
      confirmed_guests: number | null;
    }[]>`
      select i.id, i.display_name, i.guest_limit, i.token, i.active, i.whatsapp_phone,
             r.attending, r.confirmed_guests
      from public.invitations i
      left join public.rsvps r on r.invite_id = i.id
      where i.active = true
      order by i.created_at asc
    `;
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar las invitaciones." }, { status: 500 });
  }
}
