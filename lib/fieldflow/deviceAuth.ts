"use client";

import type { NexusLoginChallenge, NexusSession } from "@/lib/nexus/types";

export type FieldFlowRole = "owner" | "admin" | "manager" | "crew";

export type FieldFlowDeviceSession = NexusSession;

const SESSION_KEY = "nexus_device_session_v3";

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

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new Error(data.error || "Nexus request failed.");
  return data as T;
}

export async function identifyPin(pin: string) {
  return apiJson<NexusLoginChallenge>("/api/nexus/auth/identify", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export async function completeServerLogin(input: { challenge: string; password: string; newPassword?: string; remember: boolean }) {
  const data = await apiJson<{ session: FieldFlowDeviceSession; route: string }>("/api/nexus/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  saveDeviceSession(data.session);
  return data;
}

export async function fetchDeviceSession() {
  const data = await apiJson<{ session: FieldFlowDeviceSession | null; route: string }>("/api/nexus/session");
  if (data.session) saveDeviceSession(data.session);
  else clearDeviceSession();
  return data.session;
}

export async function logoutDeviceSession() {
  try {
    await fetch("/api/nexus/session", { method: "DELETE" });
  } finally {
    clearDeviceSession();
  }
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
