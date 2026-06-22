import { NextResponse } from "next/server";
import { loadCompaniesServer, saveCompanyServer } from "@/lib/nexus/server/data";
import { canManageStudio, getSessionFromRequest } from "@/lib/nexus/server/session";
import { hasSupabaseAdminEnv } from "@/lib/nexus/server/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ companies: [], mode: "unconfigured" });
  }
  return NextResponse.json({ companies: await loadCompaniesServer(), mode: "supabase" });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!canManageStudio(session)) return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const config = await request.json();
  return NextResponse.json({ company: await saveCompanyServer(config) });
}

