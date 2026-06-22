import { NextResponse } from "next/server";
import { updateStaffPassword, verifyStaffPassword } from "@/lib/nexus/server/data";
import { createSessionCookie, setSessionCookie } from "@/lib/nexus/server/session";
import { normalizeSecret, ownerPasswordAllowed, routeForSession, verifyChallenge } from "@/lib/nexus/server/security";
import { hasSupabaseAdminEnv } from "@/lib/nexus/server/supabaseAdmin";
import type { NexusSession } from "@/lib/nexus/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Supabase server env is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const challenge = verifyChallenge(String(body.challenge || ""));
  const password = normalizeSecret(body.password);
  const newPassword = normalizeSecret(body.newPassword);
  const remember = body.remember !== false;

  if (!challenge) return NextResponse.json({ error: "Login challenge expired. Enter your PIN again." }, { status: 401 });

  if (challenge.role === "owner") {
    if (!ownerPasswordAllowed(password)) return NextResponse.json({ error: "Password does not match Nexus Owner." }, { status: 401 });
  } else {
    if (!challenge.personId) return NextResponse.json({ error: "Staff login is missing a person id." }, { status: 400 });
    const credential = await verifyStaffPassword(challenge.slug, challenge.personId, password);
    if (!credential) return NextResponse.json({ error: "Password does not match this person." }, { status: 401 });
    if (credential.must_change_password) {
      if (newPassword.length < 4) return NextResponse.json({ error: "Set a real password with at least 4 characters." }, { status: 400 });
      await updateStaffPassword(challenge.slug, challenge.personId, newPassword);
    }
  }

  const session: NexusSession = {
    slug: challenge.role === "owner" ? "owner" : challenge.slug,
    role: challenge.role,
    remember,
    signedInAt: new Date().toISOString(),
    personId: challenge.personId,
    personName: challenge.personName,
    companyName: challenge.companyName,
  };

  const { token, expiresAt } = await createSessionCookie(session);
  const response = NextResponse.json({ session, route: routeForSession(session) });
  setSessionCookie(response, token, expiresAt);
  return response;
}

