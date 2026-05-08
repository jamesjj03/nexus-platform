"use client";

export type FieldFlowRole = "owner" | "admin" | "manager" | "crew";

export type FieldFlowDeviceSession = {
  slug: string;
  role: FieldFlowRole;
  remember: boolean;
  signedInAt: string;
  personId?: string;
  personName?: string;
  companyName?: string;
  accessLevel?: string;
  permissions?: string[];
};

const SESSION_KEY = "nexus_device_session_v3";
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

export function roleFromStaff(person: any): FieldFlowRole {
  const level = String(person?.accessLevel || person?.role || "").toLowerCase();
  if (level.includes("company_admin") || level.includes("company admin") || level.includes("owner")) return "admin";
  if (level.includes("manager") || level.includes("lead") || (person?.permissions || []).includes("approve_requests")) return "manager";
  return "crew";
}

export function routeForRole(role: string, slug?: string) {
  const prefix = slug ? `/${slug}` : "";
  if (role === "owner") return "/admin";
  if (role === "admin" || role === "manager") return `${prefix}/dashboard`;
  return `${prefix}/crew`;
}

export function roleLabel(role: string) {
  if (role === "owner") return "Nexus Owner";
  if (role === "admin") return "Company Admin";
  if (role === "manager") return "Manager";
  if (role === "crew") return "Crew";
  return "Secure sign-in";
}

export function defaultFirstPassword(name: string) {
  return String(name || "").trim().split(/\s+/)[0]?.toLowerCase() || "password";
}
