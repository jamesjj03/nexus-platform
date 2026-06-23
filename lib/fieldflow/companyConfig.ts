"use client";

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
  pins: { admin: "", manager: "", crew: "", media: "" },
  access: {},
  passwords: {},
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
  pins: { admin: "", manager: "", crew: "", media: "" },
  access: {},
  passwords: {},
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
  try {
    const res = await fetch("/api/nexus/companies", { cache: "no-store" });
    if (!res.ok) return fallback;
    const data = await res.json();
    const companies = normalizeCompanies(data.companies?.length ? data.companies : fallback);
    cacheCompanies(companies);
    return companies;
  } catch (error: unknown) {
    console.warn("Nexus company load failed:", error instanceof Error ? error.message : "Unknown error");
    return fallback;
  }
}

export async function saveCompany(config: FieldFlowCompanyConfig) {
  const cached = getCachedCompanies();
  const next = [config, ...cached.filter((c) => c.slug !== config.slug)];
  cacheCompanies(next);
  try {
    const res = await fetch("/api/nexus/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, mode: "supabase" as const, message: data.error || "Save failed." };
    return { ok: true, mode: "supabase" as const, message: "Saved live to Supabase." };
  } catch (error: unknown) {
    return { ok: false, mode: "supabase" as const, message: error instanceof Error ? error.message : "Save failed." };
  }
}

export async function uploadCompanyFile(slug: string, file: File, bucket = "fieldflow-media") {
  const form = new FormData();
  form.set("slug", slug);
  form.set("bucket", bucket);
  form.set("file", file);
  try {
    const res = await fetch("/api/nexus/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, url: "", message: data.error || "Upload failed." };
    return { ok: true, url: data.url, message: "Uploaded." };
  } catch (error: unknown) {
    return { ok: false, url: "", message: error instanceof Error ? error.message : "Upload failed." };
  }
}

export async function deleteCompanyConfig(slug: string) {
  const cached = getCachedCompanies();
  const next = cached.filter((c) => c.slug !== slug);
  cacheCompanies(next.length ? next : [defaultCompanyConfig]);

  try {
    const res = await fetch(`/api/nexus/companies/${encodeURIComponent(slug)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, mode: "supabase" as const, message: data.error || "Delete failed." };
    return { ok: true, mode: "supabase" as const, message: "Deleted live from Supabase." };
  } catch (error: unknown) {
    return { ok: false, mode: "supabase" as const, message: error instanceof Error ? error.message : "Delete failed." };
  }
}

export async function resetCompanyBoard(slug: string) {
  if (typeof window !== "undefined") {
    localStorage.removeItem(`nexus_company_board_v1:${slug}`);
  }

  try {
    const res = await fetch(`/api/nexus/boards/${encodeURIComponent(slug)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, mode: "supabase" as const, message: data.error || "Reset failed." };
    return { ok: true, mode: "supabase" as const, message: "Company board reset." };
  } catch (error: unknown) {
    return { ok: false, mode: "supabase" as const, message: error instanceof Error ? error.message : "Reset failed." };
  }
}
