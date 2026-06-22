"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Delete, Fingerprint, LockKeyhole, LogOut, ShieldCheck, Sparkles } from "lucide-react";
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

export default function NexusLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStep, setPasswordStep] = useState<LoginHit>(null);
  const [savedSession, setSavedSession] = useState<ReturnType<typeof getDeviceSession>>(() => getDeviceSession());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchDeviceSession().then(setSavedSession).catch(() => setSavedSession(null));
  }, []);

  useEffect(() => {
    if (savedSession?.remember) router.replace(routeForRole(savedSession.role, savedSession.slug));
  }, [savedSession, router]);

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
      setError(errorMessage(err, "That PIN does not match any person or Nexus owner access."));
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
      router.push(result.route);
    } catch (err: unknown) {
      setError(errorMessage(err, "Password does not match this person."));
      setPassword("");
    }
  }

  async function forgetDevice() {
    await logoutDeviceSession();
    setSavedSession(null);
    setError("Saved login cleared.");
  }

  const statusLabel = checking ? "Checking person PIN..." : pin ? "Checking access..." : "Waiting for your personal PIN";

  return (
    <main className="nexus-login-page">
      <div className="nexus-orb nexus-orb-a" />
      <div className="nexus-orb nexus-orb-b" />
      <div className="nexus-grid-bg" />
      <section className="nexus-login-shell">
        <article className="nexus-login-card">
          <div className="nexus-brand-plate">
            <img src="/brand/nexus-logo-primary.png" alt="Nexus" />
          </div>
          <div className="nexus-login-copy">
            <p className="nexus-eyebrow"><Sparkles size={14} /> Secure Field Command</p>
            <h1>Enter your personal PIN.</h1>
            <p>Every person gets their own PIN. Company access comes from staff roles, not one shared crew password.</p>
          </div>
          {!passwordStep ? (
            <>
              <div className="nexus-pin-status"><Fingerprint size={20} /><strong>{statusLabel}</strong></div>
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
          <label className="nexus-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Keep this device signed in</span></label>
          {error ? <p className="nexus-error">{error}</p> : null}
          {savedSession ? <button className="nexus-forget" onClick={forgetDevice}><LogOut size={15} /> Forget saved login</button> : null}
          <div className="nexus-owner-note"><ShieldCheck size={14} /> Owner PIN now validates on the server. Staff PINs route by company, role, and permissions.</div>
        </article>
      </section>
    </main>
  );
}
