"use client";

import type { NexusBoardData } from "@/lib/nexus/types";

export type { NexusBoardData };

const prefix = "nexus_company_board_v1";
export const boardKey = (slug: string) => `${prefix}:${slug}`;

export function loadLocalBoard(slug: string, fallback: NexusBoardData): NexusBoardData {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(boardKey(slug));
    if (!raw) return { ...fallback, companySlug: slug };
    const parsed = JSON.parse(raw);
    if (parsed.companySlug && parsed.companySlug !== slug) return { ...fallback, companySlug: slug };
    if (!parsed.companySlug) return { ...fallback, companySlug: slug };
    return { ...fallback, ...parsed, companySlug: slug };
  } catch {
    return fallback;
  }
}

export function saveLocalBoard(slug: string, data: NexusBoardData, options: { broadcast?: boolean } = {}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(boardKey(slug), JSON.stringify({ ...data, companySlug: slug, updatedAt: new Date().toISOString() }));
  if (options.broadcast !== false) window.dispatchEvent(new CustomEvent("nexus-board-updated", { detail: { slug } }));
}

export async function loadLiveBoard(slug: string, fallback: NexusBoardData): Promise<NexusBoardData> {
  const local = loadLocalBoard(slug, fallback);
  try {
    const res = await fetch(`/api/nexus/boards/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) return { ...fallback, companySlug: slug };
    if (!res.ok) return local;
    const data = await res.json();
    const liveData = data.board as NexusBoardData;
    const clean = { ...fallback, ...liveData, companySlug: slug };
    saveLocalBoard(slug, clean, { broadcast: false });
    return clean;
  } catch {
    return local;
  }
}

export async function saveLiveBoard(slug: string, data: NexusBoardData) {
  const clean = { ...data, companySlug: slug, crews: data.crews || [], messages: data.messages || [], checkouts: data.checkouts || [], updatedAt: new Date().toISOString() };
  saveLocalBoard(slug, clean);
  try {
    const res = await fetch(`/api/nexus/boards/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board: clean }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, mode: "supabase" as const, message: body.error || "Live save failed." };
    if (body.board) saveLocalBoard(slug, body.board);
    return { ok: true, mode: "supabase" as const, message: "Saved live." };
  } catch (error: unknown) {
    return { ok: false, mode: "supabase" as const, message: error instanceof Error ? error.message : "Live save failed." };
  }
}

export function subscribeLiveBoard(slug: string, onBoard: (data: NexusBoardData) => void, onStatus?: (message: string) => void) {
  if (typeof window === "undefined") return () => {};
  onStatus?.("Live sync connected through Nexus API.");

  async function refresh() {
    try {
      const res = await fetch(`/api/nexus/boards/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.board || data.board.companySlug !== slug) return;
      saveLocalBoard(slug, data.board, { broadcast: false });
      onBoard(data.board);
      onStatus?.("Live update received.");
    } catch {
      onStatus?.("Live refresh paused.");
    }
  }

  const onLocalUpdate = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.slug !== slug) return;
    const raw = localStorage.getItem(boardKey(slug));
    if (raw) onBoard(JSON.parse(raw));
  };

  window.addEventListener("nexus-board-updated", onLocalUpdate);
  const timer = window.setInterval(refresh, 6000);
  return () => {
    window.removeEventListener("nexus-board-updated", onLocalUpdate);
    window.clearInterval(timer);
  };
}
