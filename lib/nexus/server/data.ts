import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { seedBoardForCompany } from "@/lib/fieldflow/seedBoards";
import type { NexusBoardData, NexusLoginChallenge, NexusRole } from "@/lib/nexus/types";
import { hashSecret, normalizeSecret, ownerPinAllowed, pinLookup, verifySecret } from "./security";
import { getSupabaseAdmin } from "./supabaseAdmin";

const CREDENTIAL_KEYS = new Set(["pin", "tempPin", "password", "mustChangePassword"]);
const COMPANY_CONFIGS_TABLE = "nexus_company_configs";

type FieldFlowCompanyConfig = {
  slug: string;
  companyName: string;
  template: string;
  theme: { primary: string; accent: string; background: string; panel: string };
  modules: string[];
  labels: Record<string, string>;
  logoUrl?: string;
  pins: { admin: string; manager: string; crew: string; media: string };
  passwords?: Record<string, string>;
  access?: Record<string, string>;
  updatedAt?: string;
};

type CredentialRow = {
  slug: string;
  person_id: string;
  person_name: string;
  role: NexusRole;
  access_level: string;
  permissions: unknown[];
  pin_lookup: string;
  password_hash: string;
  must_change_password: boolean;
  updated_at: string;
};

function isCredentialRow(row: CredentialRow | null): row is CredentialRow {
  return row !== null;
}

function uniqueCredentialRows(rows: CredentialRow[]) {
  return Array.from(new Map(rows.map((row) => [`${row.slug}:${row.person_id}`, row])).values());
}

const builtInSeedIds = new Set([
  "job-001", "job-002", "job-003", "job-004",
  "eq-001", "eq-002", "eq-003", "eq-004", "eq-005", "eq-006", "eq-007", "eq-008",
  "tool-001", "tool-002", "tool-003", "tool-004", "tool-005", "tool-006",
  "chad", "jeanette", "jamie", "bill", "jose", "justin", "lil-chad", "jim",
  "lead-001", "lead-002", "lead-003",
  "sales-kit-001", "sales-kit-002", "hotspot-001", "car-001",
  "tool-clipboard", "tool-battery", "tool-doorhanger",
  "sam", "jj", "zach", "dylan",
]);

function isBuiltInDemoCompany(slug: string) {
  const clean = slug.toLowerCase();
  return clean === "joes" || clean.includes("joe") || clean.includes("gff") || clean.includes("fiber") || clean.includes("sales");
}

function looksLikeBuiltInSeedBoard(board: NexusBoardData) {
  const lists = [board.jobs, board.equipment, board.tools, board.inventory, board.issues, board.staff, board.crews, board.messages, board.requests, board.checkouts];
  return lists.some((list) => (list || []).some((item: any) => builtInSeedIds.has(String(item?.id || "").toLowerCase())));
}

function emptyBoardForSlug(slug: string): NexusBoardData {
  return {
    jobs: [],
    equipment: [],
    tools: [],
    inventory: [],
    issues: [],
    staff: [],
    crews: [],
    messages: [],
    requests: [],
    checkouts: [],
    companySlug: slug,
    updatedAt: new Date().toISOString(),
  };
}

const defaultCompanyConfigs: FieldFlowCompanyConfig[] = [
  {
    slug: "joes",
    companyName: "Joe's FieldOps",
    template: "landscaping",
    theme: { primary: "#14E0C9", accent: "#FF4FA3", background: "#F6F8FB", panel: "#ffffff" },
    modules: ["Jobs", "Crews", "Equipment", "Tools", "Inventory", "Issues", "Media", "Quotes", "Staff"],
    labels: { work: "Jobs", people: "Crews", assets: "Equipment" },
    pins: { admin: "", manager: "", crew: "", media: "" },
    passwords: {},
    access: {},
  },
  {
    slug: "gff",
    companyName: "GFF Fiber Sales",
    template: "d2d",
    theme: { primary: "#14E0C9", accent: "#FF4FA3", background: "#F6F8FB", panel: "#ffffff" },
    modules: ["Leads", "Reps", "Territories", "Installs", "Follow-Ups", "Media", "Reports", "Staff"],
    labels: { work: "Leads", people: "Reps", assets: "Sales Kits" },
    pins: { admin: "", manager: "", crew: "", media: "" },
    passwords: {},
    access: {},
  },
];

function sanitizeStaffPerson(person: any) {
  const clean = { ...person };
  for (const key of CREDENTIAL_KEYS) delete clean[key];
  return clean;
}

export function sanitizeBoard(data: NexusBoardData, slug: string): NexusBoardData {
  return {
    jobs: data.jobs || [],
    equipment: data.equipment || [],
    tools: data.tools || [],
    inventory: data.inventory || [],
    issues: data.issues || [],
    staff: (data.staff || []).map(sanitizeStaffPerson),
    crews: data.crews || [],
    messages: data.messages || [],
    requests: data.requests || [],
    checkouts: data.checkouts || [],
    updatedAt: data.updatedAt || new Date().toISOString(),
    companySlug: slug,
  };
}

function toCompanyRow(config: FieldFlowCompanyConfig) {
  return {
    slug: config.slug,
    company_name: config.companyName,
    template: config.template,
    theme: config.theme,
    modules: config.modules,
    labels: config.labels,
    logo_url: config.logoUrl ?? null,
    pins: {},
    passwords: {},
    updated_at: new Date().toISOString(),
  };
}

function fromCompanyRow(row: any): FieldFlowCompanyConfig {
  return {
    slug: row.slug,
    companyName: row.company_name,
    template: row.template || "general",
    theme: row.theme || { primary: "#14E0C9", accent: "#FF4FA3", background: "#F6F8FB", panel: "#ffffff" },
    modules: row.modules || [],
    labels: row.labels || {},
    logoUrl: row.logo_url || undefined,
    pins: { admin: "", manager: "", crew: "", media: "" },
    passwords: {},
    access: {},
    updatedAt: row.updated_at,
  };
}

export async function ensureDefaultCompanies() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from(COMPANY_CONFIGS_TABLE).select("slug").limit(1);
  if (data?.length) return;
  await supabase.from(COMPANY_CONFIGS_TABLE).upsert(defaultCompanyConfigs.map(toCompanyRow), { onConflict: "slug" });
}

export async function loadCompaniesServer() {
  await ensureDefaultCompanies();
  const { data, error } = await getSupabaseAdmin().from(COMPANY_CONFIGS_TABLE).select("*").order("company_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(fromCompanyRow);
}

export async function saveCompanyServer(config: FieldFlowCompanyConfig) {
  const { error } = await getSupabaseAdmin().from(COMPANY_CONFIGS_TABLE).upsert(toCompanyRow(config), { onConflict: "slug" });
  if (error) throw new Error(error.message);
  await ensureBoardServer(config.slug);
  return fromCompanyRow(toCompanyRow(config));
}

export async function deleteCompanyServer(slug: string) {
  const supabase = getSupabaseAdmin();
  await supabase.from("nexus_staff_credentials").delete().eq("slug", slug);
  await supabase.from("nexus_company_data").delete().eq("slug", slug);
  const { error } = await supabase.from(COMPANY_CONFIGS_TABLE).delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function ensureBoardServer(slug: string) {
  const supabase = getSupabaseAdmin();
  const company = (await loadCompaniesServer()).find((item) => item.slug === slug);
  const { data, error } = await supabase.from("nexus_company_data").select("data").eq("slug", slug).maybeSingle();
  if (!error && data?.data) {
    const board = data.data as NexusBoardData;
    await ensureCredentialsForBoard(slug, seedBoardForCompany(slug, { includeCredentials: true, template: company?.template }));
    return sanitizeBoard(board, slug);
  }

  const seededWithCredentials = seedBoardForCompany(slug, { includeCredentials: true, template: company?.template });
  await ensureCredentialsForBoard(slug, seededWithCredentials);
  const clean = sanitizeBoard(seededWithCredentials, slug);
  await supabase.from("nexus_company_data").upsert({ slug, data: clean, updated_at: clean.updatedAt }, { onConflict: "slug" });
  return clean;
}

export async function resetBoardServer(slug: string) {
  const supabase = getSupabaseAdmin();
  await supabase.from("nexus_staff_credentials").delete().eq("slug", slug);
  await supabase.from("nexus_company_data").delete().eq("slug", slug);
  return ensureBoardServer(slug);
}

export async function loadBoardServer(slug: string) {
  return ensureBoardServer(slug);
}

export async function ensureCredentialsForBoard(slug: string, board: NexusBoardData) {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase.from("nexus_staff_credentials").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (count && count > 0) return;

  const rows = await Promise.all((board.staff || []).map(async (person: any): Promise<CredentialRow | null> => {
    const pin = normalizeSecret(person.pin || person.tempPin);
    if (!person.id || !pin) return null;
    const password = normalizeSecret(person.password || String(person.name || "").split(/\s+/)[0]?.toLowerCase() || "password");
    return {
      slug,
      person_id: person.id,
      person_name: person.name || person.id,
      role: roleFromStaffServer(person),
      access_level: person.accessLevel || person.role || "crew",
      permissions: person.permissions || [],
      pin_lookup: pinLookup(pin),
      password_hash: await hashSecret(password),
      must_change_password: person.mustChangePassword ?? true,
      updated_at: new Date().toISOString(),
    };
  }));

  const cleanRows = uniqueCredentialRows(rows.filter(isCredentialRow));
  if (cleanRows.length) {
    const { error } = await supabase.from("nexus_staff_credentials").upsert(cleanRows, { onConflict: "slug,person_id" });
    if (error) throw new Error(error.message);
  }
}

export async function saveBoardServer(slug: string, board: NexusBoardData) {
  const supabase = getSupabaseAdmin();
  if (!isBuiltInDemoCompany(slug) && looksLikeBuiltInSeedBoard(board)) {
    const { data } = await supabase.from("nexus_company_data").select("data").eq("slug", slug).maybeSingle();
    const current = data?.data as NexusBoardData | undefined;
    if (!current || looksLikeBuiltInSeedBoard(current)) {
      const empty = sanitizeBoard(emptyBoardForSlug(slug), slug);
      await supabase.from("nexus_staff_credentials").delete().eq("slug", slug);
      const { error } = await supabase.from("nexus_company_data").upsert({ slug, data: empty, updated_at: empty.updatedAt }, { onConflict: "slug" });
      if (error) throw new Error(error.message);
      return empty;
    }
    return sanitizeBoard(current, slug);
  }

  await upsertCredentialEdits(slug, board);
  const clean = sanitizeBoard(board, slug);
  clean.updatedAt = new Date().toISOString();
  const { error } = await supabase.from("nexus_company_data").upsert({ slug, data: clean, updated_at: clean.updatedAt }, { onConflict: "slug" });
  if (error) throw new Error(error.message);
  return clean;
}

async function upsertCredentialEdits(slug: string, board: NexusBoardData) {
  const rows = await Promise.all((board.staff || []).map(async (person: any): Promise<CredentialRow | null> => {
    if (!person.id) return null;
    const hasPin = normalizeSecret(person.pin || person.tempPin);
    const hasPassword = normalizeSecret(person.password);
    if (!hasPin && !hasPassword && person.mustChangePassword === undefined) return null;

    const current = await getSupabaseAdmin()
      .from("nexus_staff_credentials")
      .select("*")
      .eq("slug", slug)
      .eq("person_id", person.id)
      .maybeSingle();

    return {
      slug,
      person_id: person.id,
      person_name: person.name || person.id,
      role: roleFromStaffServer(person),
      access_level: person.accessLevel || person.role || "crew",
      permissions: person.permissions || [],
      pin_lookup: hasPin ? pinLookup(hasPin) : current.data?.pin_lookup,
      password_hash: hasPassword ? await hashSecret(hasPassword) : current.data?.password_hash,
      must_change_password: person.mustChangePassword ?? current.data?.must_change_password ?? false,
      updated_at: new Date().toISOString(),
    };
  }));

  const cleanRows = uniqueCredentialRows(rows.filter(isCredentialRow).filter((row) => row.pin_lookup && row.password_hash));
  if (cleanRows.length) {
    const { error } = await getSupabaseAdmin().from("nexus_staff_credentials").upsert(cleanRows, { onConflict: "slug,person_id" });
    if (error) throw new Error(error.message);
  }
}

export async function identifyPinServer(pin: string, slug?: string): Promise<Omit<NexusLoginChallenge, "challenge"> | null> {
  const scopeSlug = normalizeSecret(slug);
  if ((!scopeSlug || scopeSlug === "owner") && ownerPinAllowed(pin)) {
    return { label: "Nexus Owner", slug: "owner", companyName: "Nexus", role: "owner" };
  }

  await loadCompaniesServer();
  const companies = await loadCompaniesServer();
  const targetCompanies = scopeSlug ? companies.filter((company) => company.slug === scopeSlug) : companies;
  for (const company of targetCompanies) await ensureBoardServer(company.slug);

  let query = getSupabaseAdmin()
    .from("nexus_staff_credentials")
    .select("*")
    .eq("pin_lookup", pinLookup(pin));

  if (scopeSlug) query = query.eq("slug", scopeSlug);

  const { data, error } = await query.limit(2);

  if (error || !data?.length || data.length > 1) return null;
  const credential = data[0];
  const company = companies.find((item) => item.slug === credential.slug);
  const role = credential.role as NexusRole;
  return {
    label: `${company?.companyName || credential.slug} - ${credential.person_name} - ${roleLabelServer(role)}`,
    slug: credential.slug,
    companyName: company?.companyName || credential.slug,
    role,
    personId: credential.person_id,
    personName: credential.person_name,
    mustChangePassword: credential.must_change_password,
  };
}

export async function verifyStaffPassword(slug: string, personId: string, password: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("nexus_staff_credentials")
    .select("*")
    .eq("slug", slug)
    .eq("person_id", personId)
    .maybeSingle();
  if (error || !data) return null;
  const ok = await verifySecret(password, data.password_hash);
  return ok ? data : null;
}

export async function updateStaffPassword(slug: string, personId: string, password: string) {
  const { error } = await getSupabaseAdmin()
    .from("nexus_staff_credentials")
    .update({ password_hash: await hashSecret(password), must_change_password: false, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .eq("person_id", personId);
  if (error) throw new Error(error.message);
}

function roleFromStaffServer(person: any): NexusRole {
  const level = String(person?.accessLevel || person?.role || "").toLowerCase();
  if (level.includes("company_admin") || level.includes("company admin") || level.includes("owner")) return "admin";
  if (level.includes("manager") || level.includes("lead") || (person?.permissions || []).includes("approve_requests")) return "manager";
  return "crew";
}

function roleLabelServer(role: NexusRole) {
  if (role === "owner") return "Nexus Owner";
  if (role === "admin") return "Company Admin";
  if (role === "manager") return "Manager";
  return "Crew";
}
