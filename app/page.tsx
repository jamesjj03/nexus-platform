"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Delete, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import {
  completeServerLogin,
  fetchDeviceSession,
  getDeviceSession,
  identifyPin,
  logoutDeviceSession,
  routeForRole,
  type FieldFlowRole,
} from "@/lib/fieldflow/deviceAuth";
import { setActiveCompanySlug } from "@/lib/fieldflow/companyConfig";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];
const CONTINUE_GATE_KEY = "nexus_continue_gate_v1";

type LoginHit = {
  challenge: string;
  role: FieldFlowRole;
  label: string;
  slug: string;
  companyName: string;
  personId?: string;
  personName?: string;
  mustChangePassword?: boolean;
} | null;

function cleanPassword(v: string) {
  return v.trim();
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function localDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function savedSessionKey(session: ReturnType<typeof getDeviceSession>) {
  if (!session) return "";
  return [session.slug, session.role, session.personId || "owner"].join(":");
}

function canContinueAutomatically(session: ReturnType<typeof getDeviceSession>) {
  if (typeof window === "undefined" || !session?.remember) return false;
  try {
    const raw = localStorage.getItem(CONTINUE_GATE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return saved[savedSessionKey(session)] === localDayKey();
  } catch {
    return false;
  }
}

function markContinuedToday(session: ReturnType<typeof getDeviceSession>) {
  if (typeof window === "undefined" || !session?.remember) return;
  try {
    const raw = localStorage.getItem(CONTINUE_GATE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    localStorage.setItem(CONTINUE_GATE_KEY, JSON.stringify({ ...saved, [savedSessionKey(session)]: localDayKey() }));
  } catch {
    localStorage.setItem(CONTINUE_GATE_KEY, JSON.stringify({ [savedSessionKey(session)]: localDayKey() }));
  }
}

function clearContinueGate() {
  if (typeof window !== "undefined") localStorage.removeItem(CONTINUE_GATE_KEY);
}

export default function NexusLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStep, setPasswordStep] = useState<LoginHit>(null);
  const [savedSession, setSavedSession] = useState<ReturnType<typeof getDeviceSession>>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchDeviceSession().then(setSavedSession).catch(() => setSavedSession(null)).finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    if (sessionReady && canContinueAutomatically(savedSession)) {
      router.replace(routeForRole(savedSession!.role, savedSession!.slug));
    }
  }, [savedSession, sessionReady, router]);

  useEffect(() => {
    if (pin.length >= 4 && !passwordStep && !checking) {
      const timer = window.setTimeout(() => unlock(), 120);
      return () => window.clearTimeout(timer);
    }
  }, [pin, passwordStep, checking]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        press("back");
      }
      if (e.key === "Delete" || e.key === "Escape") {
        e.preventDefault();
        press("clear");
      }
      if (e.key === "Enter" && pin.length >= 4 && !passwordStep) {
        e.preventDefault();
        unlock();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pin, passwordStep]);

  function press(key: string) {
    setError("");
    if (key === "clear") return setPin("");
    if (key === "back") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length >= 6 ? p : p + key));
  }

  async function unlock() {
    setChecking(true);
    try {
      const foundHit = await identifyPin(pin);
      setError("");
      setPasswordStep(foundHit);
    } catch (err: unknown) {
      setError(errorMessage(err, "PIN does not match any known user."));
      setPin("");
    } finally {
      setChecking(false);
    }
  }

  async function submitPassword() {
    if (!passwordStep) return;
    try {
      const result = await completeServerLogin({
        challenge: passwordStep.challenge,
        password: cleanPassword(password),
        newPassword: newPassword.trim(),
        remember,
      });
      setActiveCompanySlug(result.session.slug);
      markContinuedToday(result.session);
      router.push(result.route);
    } catch (err: unknown) {
      setError(errorMessage(err, "Password does not match this person."));
      setPassword("");
    }
  }

  async function forgetDevice() {
    await logoutDeviceSession();
    clearContinueGate();
    setSavedSession(null);
    setError("Saved login cleared.");
  }

  function continueSavedSession() {
    if (!savedSession) return;
    markContinuedToday(savedSession);
    router.push(routeForRole(savedSession.role, savedSession.slug));
  }

  const showContinueGate = sessionReady && savedSession?.remember && !passwordStep;
  const statusLabel = checking ? "VERIFYING" : "ENTER PIN";
  const savedName = savedSession?.personName || (savedSession?.role === "owner" ? "Nexus Owner" : savedSession?.companyName) || "saved user";

  return (
    <main className="nexus-login-page">
      <div className="nexus-command-atmosphere" aria-hidden="true">
        <div className="nexus-scanline" />
        <div className="nexus-map-grid" />
      </div>
      <section className="nexus-login-shell">
        <div className="nexus-wordmark" aria-label="Nexus">
          <img src="/brand/nexus-wordmark-transparent.png" alt="" />
        </div>
        <article className="nexus-login-card">
          {showContinueGate ? (
            <div className="nexus-continue-panel">
              <div className="nexus-access-mark"><ShieldCheck size={22} /></div>
              <div>
                <span>Continue as</span>
                <strong>{savedName}</strong>
                <small>{savedSession.companyName || "Nexus"} / {savedSession.role}</small>
              </div>
              <button className="nexus-unlock" onClick={continueSavedSession}><LockKeyhole size={18} /> Continue <ArrowRight size={18} /></button>
              <button className="nexus-forget" onClick={forgetDevice}><LogOut size={15} /> Forget saved login</button>
            </div>
          ) : !passwordStep ? (
            <>
              <div className="nexus-pin-status"><strong>{statusLabel}</strong></div>
              <div className="nexus-pin-dots" aria-label="PIN entry">{[0, 1, 2, 3].map((i) => <span key={i} className={pin.length > i ? "on" : ""} />)}</div>
              <div className="nexus-keypad">
                {keys.map((key) => (
                  <button key={key} className={key === "clear" || key === "back" ? "utility" : ""} onClick={() => press(key)} aria-label={key}>
                    {key === "back" ? <Delete size={22} /> : key === "clear" ? "C" : key}
                  </button>
                ))}
              </div>
              <button className="nexus-unlock" onClick={unlock} disabled={checking || pin.length < 4}><LockKeyhole size={18} /> Continue <ArrowRight size={18} /></button>
            </>
          ) : (
            <>
              <div className="nexus-pin-status"><ShieldCheck size={20} /><strong>{passwordStep.label}</strong></div>
              <label className="nexus-password-field">
                <span>{passwordStep.mustChangePassword ? "Temporary password / first name" : "Password"}</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !passwordStep.mustChangePassword) submitPassword(); }} autoFocus />
              </label>
              {passwordStep.role !== "owner" && passwordStep.mustChangePassword ? (
                <label className="nexus-password-field">
                  <span>Set your new password</span>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitPassword(); }} />
                </label>
              ) : null}
              <button className="nexus-unlock" onClick={submitPassword}><LockKeyhole size={18} /> Unlock <ArrowRight size={18} /></button>
              <button className="nexus-forget" onClick={() => { setPasswordStep(null); setPassword(""); setNewPassword(""); setPin(""); }}>Back to PIN</button>
            </>
          )}
          {!showContinueGate ? <label className="nexus-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Keep this device signed in</span></label> : null}
          {error ? <p className="nexus-error">{error}</p> : null}
          {savedSession && !showContinueGate ? <button className="nexus-forget" onClick={forgetDevice}><LogOut size={15} /> Forget saved login</button> : null}
        </article>
      </section>
    </main>
  );
}
