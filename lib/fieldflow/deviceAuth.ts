"use client";

export type FieldFlowRole = "owner" | "admin" | "manager" | "crew" | "media";

export type FieldFlowDeviceSession = {
  slug: string;
  role: FieldFlowRole;
  remember: boolean;
  signedInAt: string;
  personName?: string;
  companyName?: string;
};

const SESSION_KEY = "nexus_device_session_v2";
export const NEXUS_OWNER_PIN = "9999";

export function getDeviceSession(): FieldFlowDeviceSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDeviceSession(session: FieldFlowDeviceSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearDeviceSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function routeForRole(role: string, slug?: string) {
  const prefix = slug ? `/${slug}` : "";
  if (role === "owner") return "/admin";
  if (role === "admin") return `${prefix}/dashboard`;
  if (role === "crew") return `${prefix}/crew`;
  if (role === "media") return `${prefix}/media`;
  return `${prefix}/dashboard`;
}

export function roleLabel(role: string) {
  if (role === "owner") return "Nexus Owner";
  if (role === "admin") return "Company Admin";
  if (role === "crew") return "Crew Portal";
  if (role === "media") return "Media Library";
  if (role === "manager") return "Manager Board";
  return "Secure sign-in";
}
