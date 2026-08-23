import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { db, hasDatabase } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "Supabase aún no está conectado." }, { status: 503 });
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "Invitación no válida." }, { status: 400 });
  try {
    await db()`delete from public.invitations where id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo eliminar la invitación." }, { status: 500 });
  }
}
