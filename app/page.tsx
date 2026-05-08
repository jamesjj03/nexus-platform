"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Delete, Fingerprint, LockKeyhole, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import { getDeviceSession, saveDeviceSession, clearDeviceSession, routeForRole, roleLabel, NEXUS_OWNER_PIN, FieldFlowRole, roleFromStaff, defaultFirstPassword } from "@/lib/fieldflow/deviceAuth";
import { setActiveCompanySlug } from "@/lib/fieldflow/companyConfig";
import { loadLiveBoard, saveLiveBoard, type NexusBoardData } from "@/lib/fieldflow/liveStore";
import { seedBoardForCompany } from "@/lib/fieldflow/seedBoards";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

type LoginHit = { role: FieldFlowRole; label: string; slug: string; companyName: string; personId?: string; personName?: string; person?: any; board?: NexusBoardData } | null;

function norm(v: unknown) { return String(v ?? "").trim(); }
function staffPin(person: any) { return norm(person?.pin || person?.tempPin); }
function cleanPassword(v: string) { return v.trim(); }

export default function NexusLogin() {
  const router = useRouter();
  const { companies, activeSlug, loading, selectCompany } = useCompanies();
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStep, setPasswordStep] = useState<LoginHit>(null);
  const [savedSession, setSavedSession] = useState<ReturnType<typeof getDeviceSession>>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => { setSavedSession(getDeviceSession()); }, []);
  useEffect(() => {
    if (!loading && savedSession?.remember) router.replace(routeForRole(savedSession.role, savedSession.slug));
  }, [loading, savedSession, router]);

  async function findHit(pinValue: string): Promise<LoginHit> {
    if (pinValue === NEXUS_OWNER_PIN) return { role: "owner", label: "Nexus Owner", slug: activeSlug, companyName: "Nexus" };
    if (pinValue.length < 4) return null;

    for (const company of companies) {
      const fallback = seedBoardForCompany(company.slug);
      const board = await loadLiveBoard(company.slug, fallback);
      const person = (board.staff || []).find((p: any) => staffPin(p) === pinValue);
      if (person) {
        const role = roleFromStaff(person);
        return { role, label: `${company.companyName} · ${person.name} · ${roleLabel(role)}`, slug: company.slug, companyName: company.companyName, personId: person.id, personName: person.name, person, board };
      }
    }
    return null;
  }

  useEffect(() => {
    if (pin.length >= 4) {
      const timer = window.setTimeout(() => unlock(), 120);
      return () => window.clearTimeout(timer);
    }
  }, [pin]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      if (e.key === "Backspace") { e.preventDefault(); press("back"); }
      if (e.key === "Delete" || e.key === "Escape") { e.preventDefault(); press("clear"); }
      if (e.key === "Enter" && pin.length >= 4 && !passwordStep) { e.preventDefault(); unlock(); }
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

  function expectedPassword(foundHit: NonNullable<LoginHit>) {
    if (foundHit.role === "owner") return "owner";
    return foundHit.person?.password || defaultFirstPassword(foundHit.personName || "");
  }

  async function completeLogin(foundHit: NonNullable<LoginHit>, updatedBoard?: NexusBoardData) {
    if (updatedBoard) await saveLiveBoard(foundHit.slug, updatedBoard);
    setActiveCompanySlug(foundHit.slug);
    selectCompany(foundHit.slug);
    saveDeviceSession({ slug: foundHit.slug, role: foundHit.role, remember, signedInAt: new Date().toISOString(), personId: foundHit.personId, personName: foundHit.personName, companyName: foundHit.companyName, accessLevel: foundHit.person?.accessLevel, permissions: foundHit.person?.permissions || [] });
    router.push(routeForRole(foundHit.role, foundHit.slug));
  }

  async function unlock() {
    setChecking(true);
    const foundHit = await findHit(pin);
    setChecking(false);
    if (!foundHit) { setError("That PIN does not match any person or Nexus owner access."); setPin(""); return; }
    setError("");
    setPasswordStep(foundHit);
  }

  async function submitPassword() {
    if (!passwordStep) return;
    if (cleanPassword(password) !== expectedPassword(passwordStep)) { setError("Password does not match this person."); setPassword(""); return; }

    if (passwordStep.role !== "owner" && passwordStep.person?.mustChangePassword) {
      if (newPassword.trim().length < 4) { setError("Set a real password with at least 4 characters."); return; }
      const board = passwordStep.board || seedBoardForCompany(passwordStep.slug);
      const nextBoard = { ...board, staff: (board.staff || []).map((p: any) => p.id === passwordStep.personId ? { ...p, password: newPassword.trim(), mustChangePassword: false, tempPin: p.pin || p.tempPin } : p) };
      await completeLogin({ ...passwordStep, person: { ...passwordStep.person, password: newPassword.trim(), mustChangePassword: false } }, nextBoard);
      return;
    }

    await completeLogin(passwordStep);
  }

  function forgetDevice() { clearDeviceSession(); setSavedSession(null); setError("Saved login cleared."); }
  const statusLabel = checking ? "Checking person PIN..." : pin ? "Checking access..." : "Waiting for your personal PIN";

  return (
    <main className="nexus-login-page">
      <div className="nexus-orb nexus-orb-a" /><div className="nexus-orb nexus-orb-b" /><div className="nexus-grid-bg" />
      <section className="nexus-login-shell">
        <article className="nexus-login-card">
          <div className="nexus-brand-plate"><img src="/brand/nexus-logo-primary.png" alt="Nexus" /></div>
          <div className="nexus-login-copy"><p className="nexus-eyebrow"><Sparkles size={14}/> Secure Field Command</p><h1>Enter your personal PIN.</h1><p>Every person gets their own PIN. Company access comes from staff roles, not one shared crew password.</p></div>
          {!passwordStep ? <>
            <div className="nexus-pin-status"><Fingerprint size={20}/><strong>{statusLabel}</strong></div>
            <div className="nexus-pin-dots" aria-label="PIN entry">{[0,1,2,3].map((i)=><span key={i} className={pin.length>i?"on":""}/>)}</div>
            <div className="nexus-keypad">{keys.map((key)=><button key={key} className={key === "clear" || key === "back" ? "utility" : ""} onClick={()=>press(key)} aria-label={key}>{key === "back" ? <Delete size={22}/> : key === "clear" ? "C" : key}</button>)}</div>
            <button className="nexus-unlock" onClick={unlock} disabled={loading || checking || pin.length < 4}><LockKeyhole size={18}/> Continue <ArrowRight size={18}/></button>
          </> : <>
            <div className="nexus-pin-status"><ShieldCheck size={20}/><strong>{passwordStep.label}</strong></div>
            <label className="nexus-password-field"><span>{passwordStep.person?.mustChangePassword ? "Temporary password / first name" : "Password"}</span><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} onKeyDown={(e)=>{ if(e.key === "Enter" && !passwordStep.person?.mustChangePassword) submitPassword(); }} autoFocus /></label>
            {passwordStep.role !== "owner" && passwordStep.person?.mustChangePassword ? <label className="nexus-password-field"><span>Set your new password</span><input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} onKeyDown={(e)=>{ if(e.key === "Enter") submitPassword(); }} /></label> : null}
            <button className="nexus-unlock" onClick={submitPassword}><LockKeyhole size={18}/> Unlock <ArrowRight size={18}/></button>
            <button className="nexus-forget" onClick={()=>{ setPasswordStep(null); setPassword(""); setNewPassword(""); setPin(""); }}>Back to PIN</button>
          </>}
          <label className="nexus-remember"><input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} /><span>Keep this device signed in</span></label>
          {error ? <p className="nexus-error">{error}</p> : null}
          {savedSession ? <button className="nexus-forget" onClick={forgetDevice}><LogOut size={15}/> Forget saved login</button> : null}
          <div className="nexus-owner-note"><ShieldCheck size={14}/> Owner PIN stays global. Staff PINs route each person by company, role, and permissions.</div>
        </article>
      </section>
    </main>
  );
}
