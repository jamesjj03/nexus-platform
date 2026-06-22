import "server-only";

import { NextResponse } from "next/server";
import type { NexusSession } from "@/lib/nexus/types";
import { createRawSessionToken, sessionTokenHash } from "./security";
import { getSupabaseAdmin } from "./supabaseAdmin";

export const SESSION_COOKIE = "nexus_session";

export async function createSessionCookie(session: NexusSession) {
  const token = createRawSessionToken();
  const expiresAt = new Date(Date.now() + (session.remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 12));

  await getSupabaseAdmin().from("nexus_sessions").insert({
    token_hash: sessionTokenHash(token),
    slug: session.slug,
    role: session.role,
    person_id: session.personId ?? null,
    payload: session,
    expires_at: expiresAt.toISOString(),
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionFromRequest(request: Request): Promise<NexusSession | null> {
  const rawCookie = request.headers.get("cookie") || "";
  const match = rawCookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = match?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("nexus_sessions")
    .select("payload, expires_at")
    .eq("token_hash", sessionTokenHash(decodeURIComponent(token)))
    .maybeSingle();

  if (error || !data?.payload) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload as NexusSession;
}

export async function revokeSessionFromRequest(request: Request) {
  const rawCookie = request.headers.get("cookie") || "";
  const match = rawCookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = match?.slice(SESSION_COOKIE.length + 1);
  if (!token) return;
  await getSupabaseAdmin().from("nexus_sessions").delete().eq("token_hash", sessionTokenHash(decodeURIComponent(token)));
}

export function canReadCompany(session: NexusSession | null, slug: string) {
  return Boolean(session && (session.role === "owner" || session.slug === slug));
}

export function canManageCompany(session: NexusSession | null, slug: string) {
  return Boolean(session && (session.role === "owner" || (session.slug === slug && ["admin", "manager"].includes(session.role))));
}

export function canManageStudio(session: NexusSession | null) {
  return Boolean(session && session.role === "owner");
}

