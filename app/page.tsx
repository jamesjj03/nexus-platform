"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Delete, Fingerprint, LockKeyhole, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import { getDeviceSession, saveDeviceSession, clearDeviceSession, routeForRole, roleLabel, NEXUS_OWNER_PIN, FieldFlowRole } from "@/lib/fieldflow/deviceAuth";
import { setActiveCompanySlug } from "@/lib/fieldflow/companyConfig";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

type LoginHit = { role: FieldFlowRole; label: string; slug: string; companyName: string; personName?: string } | null;

function norm(v: unknown) { return String(v ?? "").trim(); }
function inRange(pin: string, start?: string, end?: string) {
  const n = Number(pin); const a = Number(start); const b = Number(end);
  return Number.isFinite(n) && Number.isFinite(a) && Number.isFinite(b) && n >= a && n <= b;
}

export default function NexusLogin() {
  const router = useRouter();
  const { companies, activeSlug, loading, selectCompany } = useCompanies();
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStep, setPasswordStep] = useState<LoginHit>(null);
  const [savedSession, setSavedSession] = useState<ReturnType<typeof getDeviceSession>>(null);

  useEffect(() => { setSavedSession(getDeviceSession()); }, []);
  useEffect(() => {
    if (!loading && savedSession?.remember) router.replace(routeForRole(savedSession.role, savedSession.slug));
  }, [loading, savedSession, router]);

  const hit: LoginHit = useMemo(() => {
    if (pin === NEXUS_OWNER_PIN) return { role: "owner", label: "Nexus Owner", slug: activeSlug, companyName: "Nexus" };
    if (pin.length < 4) return null;

    for (const company of companies) {
      const pins = company.pins ?? { admin: "5000", manager: "5001", crew: "5002", media: "5003" };
      const access = company.access ?? {};
      const exacts: Array<[FieldFlowRole, string | undefined]> = [
        ["admin", access.companyAdminPin ?? pins.admin],
        ["manager", access.managerPin ?? pins.manager],
        ["crew", access.crewPin ?? pins.crew],
        ["media", access.mediaPin ?? pins.media],
      ];
      const exact = exacts.find(([, value]) => norm(value) === pin);
      if (exact) return { role: exact[0], label: `${company.companyName} · ${roleLabel(exact[0])}`, slug: company.slug, companyName: company.companyName };
      if (inRange(pin, access.pinStart, access.pinEnd)) return { role: "crew", label: `${company.companyName} · Crew PIN range`, slug: company.slug, companyName: company.companyName };
    }
    return null;
  }, [pin, companies, activeSlug]);

  useEffect(() => {
    if (pin.length >= 4) {
      const timer = window.setTimeout(() => unlock(hit), 120);
      return () => window.clearTimeout(timer);
    }
  }, [pin, hit]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      if (e.key === "Backspace") { e.preventDefault(); press("back"); }
      if (e.key === "Delete" || e.key === "Escape") { e.preventDefault(); press("clear"); }
      if (e.key === "Enter" && pin.length >= 4) { e.preventDefault(); unlock(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pin, hit, remember]);

  function press(key: string) {
    setError("");
    if (key === "clear") return setPin("");
    if (key === "back") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length >= 6 ? p : p + key));
  }

  function expectedPassword(foundHit: NonNullable<LoginHit>) {
    if (foundHit.role === "owner") return "owner";
    const company = companies.find((c) => c.slug === foundHit.slug);
    const rolePasswords: any = company?.passwords ?? {};
    return rolePasswords[foundHit.role] || foundHit.role;
  }

  function completeLogin(foundHit: NonNullable<LoginHit>) {
    setActiveCompanySlug(foundHit.slug);
    selectCompany(foundHit.slug);
    saveDeviceSession({ slug: foundHit.slug, role: foundHit.role, remember, signedInAt: new Date().toISOString(), personName: foundHit.personName, companyName: foundHit.companyName });
    router.push(routeForRole(foundHit.role, foundHit.slug));
  }

  function unlock(foundHit = hit) {
    if (!foundHit) { setError("That PIN does not match any Nexus company or owner access."); setPin(""); return; }
    setError("");
    setPasswordStep(foundHit);
  }

  function submitPassword() {
    if (!passwordStep) return;
    if (password.trim() !== expectedPassword(passwordStep)) { setError("Password does not match this role."); setPassword(""); return; }
    completeLogin(passwordStep);
  }

  function forgetDevice() { clearDeviceSession(); setSavedSession(null); setError("Saved login cleared."); }

  return (
    <main className="nexus-login-page">
      <div className="nexus-orb nexus-orb-a" /><div className="nexus-orb nexus-orb-b" /><div className="nexus-grid-bg" />
      <section className="nexus-login-shell">
        <article className="nexus-login-card">
          <div className="nexus-brand-plate"><img src="/brand/nexus-logo-primary.png" alt="Nexus" /></div>
          <div className="nexus-login-copy"><p className="nexus-eyebrow"><Sparkles size={14}/> Secure Field Command</p><h1>Enter your PIN.</h1><p>Nexus recognizes the company, role, and destination automatically. No exposed boards. No dumb door buttons.</p></div>
          {!passwordStep ? <>
            <div className="nexus-pin-status"><Fingerprint size={20}/><strong>{hit ? hit.label : pin ? "Checking access..." : "Waiting for secure PIN"}</strong></div>
            <div className="nexus-pin-dots" aria-label="PIN entry">{[0,1,2,3].map((i)=><span key={i} className={pin.length>i?"on":""}/>)}</div>
            <div className="nexus-keypad">{keys.map((key)=><button key={key} className={key === "clear" || key === "back" ? "utility" : ""} onClick={()=>press(key)} aria-label={key}>{key === "back" ? <Delete size={22}/> : key === "clear" ? "C" : key}</button>)}</div>
            <button className="nexus-unlock" onClick={()=>unlock()} disabled={loading || pin.length < 4}><LockKeyhole size={18}/> Continue <ArrowRight size={18}/></button>
          </> : <>
            <div className="nexus-pin-status"><ShieldCheck size={20}/><strong>{passwordStep.label}</strong></div>
            <label className="nexus-password-field"><span>Password</span><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} onKeyDown={(e)=>{ if(e.key === "Enter") submitPassword(); }} autoFocus /></label>
            <button className="nexus-unlock" onClick={submitPassword}><LockKeyhole size={18}/> Unlock <ArrowRight size={18}/></button>
            <button className="nexus-forget" onClick={()=>{ setPasswordStep(null); setPassword(""); setPin(""); }}>Back to PIN</button>
          </>}
          <label className="nexus-remember"><input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} /><span>Keep this device signed in</span></label>
          {error ? <p className="nexus-error">{error}</p> : null}
          {savedSession ? <button className="nexus-forget" onClick={forgetDevice}><LogOut size={15}/> Forget saved login</button> : null}
          <div className="nexus-owner-note"><ShieldCheck size={14}/> Owner access routes to Nexus Studio. Company pins route to their own boards.</div>
        </article>
      </section>
    </main>
  );
}
