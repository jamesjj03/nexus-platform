import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac, createHash } from "crypto";
import { promisify } from "util";
import type { NexusLoginChallenge, NexusSession } from "@/lib/nexus/types";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function authSecret() {
  const secret = process.env.NEXUS_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "nexus-dev-auth-secret";
  throw new Error("NEXUS_AUTH_SECRET is required in production.");
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function unb64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function hmac(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

export function normalizeSecret(value: unknown) {
  return String(value ?? "").trim();
}

export function pinLookup(pin: string) {
  return hmac(`pin:${normalizeSecret(pin)}`);
}

export function sessionTokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function hashSecret(value: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = (await scrypt(normalizeSecret(value), salt, 32)) as Buffer;
  return `${HASH_PREFIX}$${salt}$${hash.toString("base64url")}`;
}

export async function verifySecret(value: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [prefix, salt, encodedHash] = stored.split("$");
  if (prefix !== HASH_PREFIX || !salt || !encodedHash) return false;
  const actual = Buffer.from(encodedHash, "base64url");
  const expected = (await scrypt(normalizeSecret(value), salt, actual.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signChallenge(payload: Omit<NexusLoginChallenge, "challenge">) {
  const body = b64url(JSON.stringify({ ...payload, iat: Date.now() }));
  return `${body}.${hmac(body)}`;
}

export function verifyChallenge(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature || hmac(body) !== signature) return null;

  try {
    const parsed = JSON.parse(unb64url(body)) as Omit<NexusLoginChallenge, "challenge"> & { iat?: number };
    if (!parsed.iat || Date.now() - parsed.iat > CHALLENGE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createRawSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function routeForSession(session: Pick<NexusSession, "role" | "slug">) {
  if (session.role === "owner") return "/admin";
  if (session.role === "admin" || session.role === "manager") return `/${session.slug}/dashboard`;
  return `/${session.slug}/crew`;
}

export function ownerPinAllowed(pin: string) {
  const configured = process.env.NEXUS_OWNER_PIN;
  if (configured) return normalizeSecret(pin) === normalizeSecret(configured);
  return process.env.NODE_ENV !== "production" && normalizeSecret(pin) === "9999";
}

export function ownerPasswordAllowed(password: string) {
  const configured = process.env.NEXUS_OWNER_PASSWORD;
  if (configured) return normalizeSecret(password) === normalizeSecret(configured);
  return process.env.NODE_ENV !== "production" && normalizeSecret(password) === "owner";
}

