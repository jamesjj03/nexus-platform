"use client";

import { supabase, hasSupabaseEnv } from "@/lib/supabase/client";

export type FieldFlowTheme = {
  primary: string;
  accent: string;
  background: string;
  panel: string;
};

export type FieldFlowAccess = {
  pinStart?: string;
  pinEnd?: string;
  companyAdminPin?: string;
  managerPin?: string;
  crewPin?: string;
  mediaPin?: string;
};

export type FieldFlowPasswords = Partial<Record<"admin" | "manager" | "crew" | "media", string>>;

export type FieldFlowPins = {
  admin: string;
  manager: string;
  crew: string;
  media: string;
  __access?: FieldFlowAccess;
  __passwords?: FieldFlowPasswords;
};

export type FieldFlowCompanyConfig = {
  slug: string;
  companyName: string;
  template: string;
  theme: FieldFlowTheme;
  modules: string[];
  labels: Record<string, string>;
  logoUrl?: string;
  pins: FieldFlowPins;
  passwords?: FieldFlowPasswords;
  access?: FieldFlowAccess;
  updatedAt?: string;
};

const COMPANY_CACHE_KEY = "ff_company_configs";
const ACTIVE_COMPANY_KEY = "ff_active_company_slug";
const COMPANY_ALIAS_KEY = "ff_company_aliases";

export const defaultCompanyConfig: FieldFlowCompanyConfig = {
  slug: "joes",
  companyName: "Joe's FieldOps",
  template: "landscaping",
  theme: {
    primary: "#14E0C9",
    accent: "#FF4FA3",
    background: "#F6F8FB",
    panel: "#ffffff",
  },
  modules: ["Jobs", "Crews", "Equipment", "Tools", "Inventory", "Issues", "Media", "Quotes", "Staff"],
  labels: { work: "Jobs", people: "Crews", assets: "Equipment" },
  pins: { admin: "5000", manager: "5001", crew: "5002", media: "5003" },
  access: { pinStart: "5000", pinEnd: "5099", companyAdminPin: "5000", managerPin: "5001", crewPin: "5002", mediaPin: "5003" },
  passwords: { admin: "joeadmin", manager: "joemanager", crew: "joecrew", media: "joemedia" },
};

export const gffCompanyConfig: FieldFlowCompanyConfig = {
  slug: "gff",
  companyName: "GFF Fiber Sales",
  template: "d2d",
  theme: {
    primary: "#14E0C9",
    accent: "#FF4FA3",
    background: "#F6F8FB",
    panel: "#ffffff",
  },
  modules: ["Leads", "Reps", "Territories", "Installs", "Follow-Ups", "Media", "Reports", "Staff"],
  labels: { work: "Leads", people: "Reps", assets: "Sales Kits" },
  pins: { admin: "6000", manager: "6001", crew: "6002", media: "6003" },
  access: { pinStart: "6000", pinEnd: "6099", companyAdminPin: "6000", managerPin: "6001", crewPin: "6002", mediaPin: "6003" },
  passwords: { admin: "gffadmin", manager: "gffmanager", crew: "gffcrew", media: "gffmedia" },
};

export const defaultCompanyConfigs: FieldFlowCompanyConfig[] = [defaultCompanyConfig, gffCompanyConfig];


export function slugifyCompanyName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "company";
}

function fromRow(row: any): FieldFlowCompanyConfig {
  const pinMeta = row.pins ?? {};
  return {
    slug: row.slug,
    companyName: row.company_name ?? row.companyName ?? defaultCompanyConfig.companyName,
    template: row.template ?? defaultCompanyConfig.template,
    theme: row.theme ?? defaultCompanyConfig.theme,
    modules: row.modules ?? defaultCompanyConfig.modules,
    labels: row.labels ?? defaultCompanyConfig.labels,
    logoUrl: row.logo_url ?? row.logoUrl ?? undefined,
    pins: row.pins ?? defaultCompanyConfig.pins,
    passwords: row.passwords ?? row.role_passwords ?? row.rolePasswords ?? pinMeta.__passwords ?? defaultCompanyConfig.passwords,
    access: row.access ?? row.pin_range ?? row.pinRange ?? pinMeta.__access ?? defaultCompanyConfig.access,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function toRow(config: FieldFlowCompanyConfig) {
  const pinsWithMeta = {
    ...(config.pins ?? defaultCompanyConfig.pins),
    __access: config.access ?? defaultCompanyConfig.access,
    __passwords: config.passwords ?? defaultCompanyConfig.passwords,
  };
  return {
    slug: config.slug,
    company_name: config.companyName,
    template: config.template,
    theme: config.theme,
    modules: config.modules,
    labels: config.labels,
    logo_url: config.logoUrl ?? null,
    pins: pinsWithMeta,
    updated_at: new Date().toISOString(),
  };
}


export function getCompanyAliasMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COMPANY_ALIAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function rememberCompanyAlias(alias: string, slug: string) {
  if (typeof window === "undefined") return;
  const cleanAlias = slugifyCompanyName(alias);
  if (!cleanAlias || !slug) return;
  const current = getCompanyAliasMap();
  localStorage.setItem(COMPANY_ALIAS_KEY, JSON.stringify({ ...current, [cleanAlias]: slug }));
}

export function resolveCompanySlug(input: string, companies: FieldFlowCompanyConfig[]) {
  const clean = slugifyCompanyName(input);
  const aliasMap = getCompanyAliasMap();
  const direct = companies.find((c) => c.slug === clean);
  if (direct) return direct.slug;
  const byName = companies.find((c) => slugifyCompanyName(c.companyName) === clean);
  if (byName) return byName.slug;
  if (aliasMap[clean]) return aliasMap[clean];
  if (clean === "joes" || clean === "joe" || clean === "joes-fieldops" || clean === "nexus") return "joes";
  return clean;
}

function canonicalizeKnownCompany(config: FieldFlowCompanyConfig): FieldFlowCompanyConfig {
  const slug = slugifyCompanyName(config.slug || config.companyName);
  const nameSlug = slugifyCompanyName(config.companyName || "");
  const isGff = slug === "gff" || nameSlug.includes("gff") || nameSlug.includes("fiber");
  const isJoes = slug === "joes" || nameSlug.includes("joe");
  if (isGff) return { ...gffCompanyConfig, ...config, slug: "gff", companyName: config.companyName || gffCompanyConfig.companyName, template: "d2d", modules: config.modules?.length ? config.modules : gffCompanyConfig.modules, pins: gffCompanyConfig.pins, access: gffCompanyConfig.access, passwords: config.passwords ?? gffCompanyConfig.passwords };
  if (isJoes) return { ...defaultCompanyConfig, ...config, slug: "joes", companyName: config.companyName || defaultCompanyConfig.companyName, template: config.template || "landscaping", modules: config.modules?.length ? config.modules : defaultCompanyConfig.modules, pins: defaultCompanyConfig.pins, access: defaultCompanyConfig.access, passwords: config.passwords ?? defaultCompanyConfig.passwords };
  return { ...config, slug };
}

function normalizeCompanies(input: FieldFlowCompanyConfig[]): FieldFlowCompanyConfig[] {
  const bySlug = new Map<string, FieldFlowCompanyConfig>();
  for (const c of [...defaultCompanyConfigs, ...input].map(canonicalizeKnownCompany)) bySlug.set(c.slug, c);
  return Array.from(bySlug.values());
}

export function getCachedCompanies(): FieldFlowCompanyConfig[] {
  if (typeof window === "undefined") return defaultCompanyConfigs;
  try {
    const raw = localStorage.getItem(COMPANY_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeCompanies(parsed.length ? parsed : defaultCompanyConfigs);
  } catch {
    return defaultCompanyConfigs;
  }
}

export function cacheCompanies(companies: FieldFlowCompanyConfig[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPANY_CACHE_KEY, JSON.stringify(companies));
}

export function getActiveCompanySlug() {
  if (typeof window === "undefined") return defaultCompanyConfig.slug;
  return localStorage.getItem(ACTIVE_COMPANY_KEY) || defaultCompanyConfig.slug;
}

export function setActiveCompanySlug(slug: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_COMPANY_KEY, slug);
}

export function applyCompanyTheme(config: FieldFlowCompanyConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--green", config.theme.primary);
  root.style.setProperty("--green2", config.theme.primary);
  root.style.setProperty("--red", config.theme.accent);
  root.style.setProperty("--accent", config.theme.accent);
  root.style.setProperty("--bg", config.theme.background);
  root.style.setProperty("--panel", config.theme.panel);
}

export async function loadCompanies(): Promise<FieldFlowCompanyConfig[]> {
  const fallback = getCachedCompanies();
  if (!hasSupabaseEnv || !supabase) return fallback;

  const { data, error } = await supabase
    .from("company_configs")
    .select("*")
    .order("company_name", { ascending: true });

  if (error) {
    console.warn("FieldFlow company load failed:", error.message);
    return fallback;
  }

  const companies = normalizeCompanies(data?.length ? data.map(fromRow) : fallback);
  cacheCompanies(companies);
  return companies;
}

export async function saveCompany(config: FieldFlowCompanyConfig) {
  const cached = getCachedCompanies();
  const next = [config, ...cached.filter((c) => c.slug !== config.slug)];
  cacheCompanies(next);

  if (!hasSupabaseEnv || !supabase) {
    return { ok: true, mode: "local" as const, message: "Saved locally. Supabase env is not connected." };
  }

  const row = toRow(config);
  const { error } = await supabase.from("company_configs").upsert(row, { onConflict: "slug" });
  if (!error) return { ok: true, mode: "supabase" as const, message: "Saved live to Supabase." };

  // Fallback for older Supabase schemas. Keep access/password data nested inside pins so
  // we do not require separate access/passwords columns.
  const minimal = { slug: row.slug, company_name: row.company_name, template: row.template, theme: row.theme, modules: row.modules, labels: row.labels, logo_url: row.logo_url, pins: row.pins, updated_at: row.updated_at };
  const retry = await supabase.from("company_configs").upsert(minimal, { onConflict: "slug" });
  if (retry.error) return { ok: false, mode: "supabase" as const, message: retry.error.message };
  return { ok: true, mode: "supabase" as const, message: "Saved live to Supabase." };
}

export async function uploadCompanyFile(slug: string, file: File, bucket = "fieldflow-media") {
  if (!hasSupabaseEnv || !supabase) {
    return { ok: false, url: "", message: "Supabase is not connected, so uploads are local-preview only." };
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const path = `${slug}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return { ok: false, url: "", message: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, message: "Uploaded." };
}

export async function deleteCompanyConfig(slug: string) {
  const cached = getCachedCompanies();
  const next = cached.filter((c) => c.slug !== slug);
  cacheCompanies(next.length ? next : [defaultCompanyConfig]);

  if (!hasSupabaseEnv || !supabase) {
    return { ok: true, mode: "local" as const, message: "Deleted locally. Supabase env is not connected." };
  }

  const { error } = await supabase.from("company_configs").delete().eq("slug", slug);
  if (error) return { ok: false, mode: "supabase" as const, message: error.message };
  return { ok: true, mode: "supabase" as const, message: "Deleted live from Supabase." };
}
