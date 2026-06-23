import { NextResponse } from "next/server";
import { identifyPinServer } from "@/lib/nexus/server/data";
import { signChallenge } from "@/lib/nexus/server/security";
import { hasSupabaseAdminEnv } from "@/lib/nexus/server/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin || "").trim();
  if (pin.length < 4) return NextResponse.json({ error: "Enter a valid PIN." }, { status: 400 });

  const hit = await identifyPinServer(pin);
  if (!hit) return NextResponse.json({ error: "PIN does not match any known user." }, { status: 401 });

  return NextResponse.json({ ...hit, challenge: signChallenge(hit) });
}
