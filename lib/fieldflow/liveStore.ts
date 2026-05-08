"use client";

import { supabase, hasSupabaseEnv } from "@/lib/supabase/client";

export type NexusBoardData = {
  jobs: any[];
  equipment: any[];
  tools: any[];
  inventory: any[];
  issues: any[];
  staff: any[];
  requests: any[];
  checkouts?: any[];
  updatedAt?: string;
  companySlug?: string;
};

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

export function saveLocalBoard(slug: string, data: NexusBoardData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(boardKey(slug), JSON.stringify({ ...data, companySlug: slug, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent("nexus-board-updated", { detail: { slug } }));
}

export async function loadLiveBoard(slug: string, fallback: NexusBoardData): Promise<NexusBoardData> {
  const local = loadLocalBoard(slug, fallback);
  if (!hasSupabaseEnv || !supabase) return local;
  const { data, error } = await supabase.from("nexus_company_data").select("data").eq("slug", slug).maybeSingle();
  if (error || !data?.data) return local;
  const liveData = data.data as NexusBoardData;
  // Old builds saved the same board everywhere. If the stored payload is not stamped
  // with this company slug, treat it as stale and reseed this company cleanly.
  if (liveData.companySlug && liveData.companySlug !== slug) return local;
  if (!liveData.companySlug) {
    saveLocalBoard(slug, fallback);
    await saveLiveBoard(slug, fallback);
    return fallback;
  }
  saveLocalBoard(slug, { ...fallback, ...liveData, companySlug: slug });
  return { ...fallback, ...liveData, companySlug: slug };
}

export async function saveLiveBoard(slug: string, data: NexusBoardData) {
  const clean = { ...data, companySlug: slug, checkouts: data.checkouts || [], updatedAt: new Date().toISOString() };
  saveLocalBoard(slug, clean);
  if (!hasSupabaseEnv || !supabase) return { ok: true, mode: "local" as const, message: "Saved locally." };
  const { error } = await supabase.from("nexus_company_data").upsert({ slug, data: clean, updated_at: clean.updatedAt }, { onConflict: "slug" });
  if (error) return { ok: false, mode: "supabase" as const, message: error.message };
  return { ok: true, mode: "supabase" as const, message: "Saved live." };
}


export function subscribeLiveBoard(slug: string, onBoard: (data: NexusBoardData) => void, onStatus?: (message: string) => void) {
  if (!hasSupabaseEnv || !supabase) {
    onStatus?.("Realtime off: Supabase env missing.");
    return () => {};
  }

  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`nexus-company-data:${slug}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "nexus_company_data", filter: `slug=eq.${slug}` },
      (payload) => {
        const next = (payload.new as any)?.data as NexusBoardData | undefined;
        if (!next || next.companySlug !== slug) return;
        saveLocalBoard(slug, next);
        onBoard({ ...next, checkouts: next.checkouts || [] });
        onStatus?.("Live update received.");
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onStatus?.("Realtime connected.");
      if (status === "CHANNEL_ERROR") onStatus?.("Realtime channel error. Check Supabase realtime/RLS.");
    });

  return () => { client.removeChannel(channel); };
}
