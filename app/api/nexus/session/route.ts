import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionFromRequest, revokeSessionFromRequest } from "@/lib/nexus/server/session";
import { routeForSession } from "@/lib/nexus/server/security";
import { hasSupabaseAdminEnv } from "@/lib/nexus/server/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ session: null });
  const session = await getSessionFromRequest(request);
  return NextResponse.json({ session, route: session ? routeForSession(session) : "/" });
}

export async function DELETE(request: Request) {
  if (hasSupabaseAdminEnv()) await revokeSessionFromRequest(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

