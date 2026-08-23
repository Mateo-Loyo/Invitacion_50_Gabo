import { NextResponse } from "next/server";
import { hasDatabase, supabaseRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(
      { ok: false, database: "not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await supabaseRequest<unknown[]>("invitations?select=id&limit=1");
    return NextResponse.json(
      { ok: true, database: "connected", connection: "supabase_secret_key" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
