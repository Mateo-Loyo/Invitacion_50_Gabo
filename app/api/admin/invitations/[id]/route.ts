import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { hasDatabase, supabaseRequest } from "@/lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "Supabase aún no está conectado." }, { status: 503 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ ok: false, error: "Invitación no válida." }, { status: 400 });

  try {
    await supabaseRequest<void>(`invitations?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      prefer: "return=minimal"
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo eliminar la invitación." }, { status: 500 });
  }
}
