"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Eye, Plus, Rocket, Save, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { TemplateKey, templates } from "@/lib/v2Data";
import { FieldFlowCompanyConfig, cacheCompanies, defaultCompanyConfig, deleteCompanyConfig, resetCompanyBoard, saveCompany, slugifyCompanyName, uploadCompanyFile } from "@/lib/fieldflow/companyConfig";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import { fetchDeviceSession, logoutDeviceSession } from "@/lib/fieldflow/deviceAuth";

const steps = ["Company", "Access", "Modules", "Theme", "Media", "Publish"] as const;
const nexusTheme = { primary: "#14E0C9", accent: "#FF4FA3", background: "#F6F8FB", panel: "#ffffff" };
const templateKeys = Object.keys(templates) as TemplateKey[];

function freshCompany(): FieldFlowCompanyConfig {
  const suffix = Date.now().toString().slice(-4);
  return {
    ...defaultCompanyConfig,
    companyName: "New Company",
    slug: `new-company-${suffix}`,
    template: "general",
    theme: nexusTheme,
    modules: [...templates.general.modules],
    pins: { admin: "5000", manager: "5001", crew: "5002", media: "5003" },
    access: { pinStart: "5000", pinEnd: "5099", companyAdminPin: "5000", managerPin: "5001", crewPin: "5002", mediaPin: "5003" },
  };
}

export function StudioAdmin() {
  const router = useRouter();
  const { companies, activeCompany, activeSlug, selectCompany, replaceCompanies } = useCompanies();
  const [step, setStep] = useState<(typeof steps)[number]>("Company");
  const [draft, setDraft] = useState<FieldFlowCompanyConfig>(activeCompany);
  const [status, setStatus] = useState("Nexus Studio ready.");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [confirmReset, setConfirmReset] = useState("");

  useEffect(() => { fetchDeviceSession().then((session) => { if (!session || session.role !== "owner") router.replace("/"); }).catch(() => router.replace("/")); }, [router]);

  useEffect(() => {
    const safeTemplate = templateKeys.includes(activeCompany.template as TemplateKey) ? activeCompany.template as TemplateKey : "general";
    setDraft({ ...activeCompany, template: safeTemplate, modules: activeCompany.modules?.length ? activeCompany.modules : [...templates[safeTemplate].modules], access: activeCompany.access ?? defaultCompanyConfig.access, pins: activeCompany.pins ?? defaultCompanyConfig.pins });
    setConfirmDelete("");
    setConfirmReset("");
  }, [activeCompany.slug]);

  const template = templateKeys.includes(draft.template as TemplateKey) ? draft.template as TemplateKey : "general";
  const activeTemplate = templates[template] ?? templates.general;
  const config = useMemo<FieldFlowCompanyConfig>(() => ({ ...draft, slug: slugifyCompanyName(draft.slug), template, labels: draft.labels ?? { work: "Work", people: "People", assets: "Assets" } }), [draft, template]);

  function patch<K extends keyof FieldFlowCompanyConfig>(key: K, value: FieldFlowCompanyConfig[K]) { setDraft((d) => ({ ...d, [key]: value })); }
  function applyTemplate(k: TemplateKey) { setDraft((d) => ({ ...d, template: k, modules: [...templates[k].modules] })); }
  function makeNew() { const next = freshCompany(); setDraft(next); setStep("Company"); setStatus("New company draft created. It will not exist until you Save Live."); }
  function copy() { navigator.clipboard.writeText(JSON.stringify(config, null, 2)); setStatus("Copied config."); }
  function download() { const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${config.slug}-nexus-config.json`; a.click(); URL.revokeObjectURL(url); setStatus("Exported config."); }
  async function saveLive() { setStatus("Saving live company config..."); const clean = { ...config, updatedAt: new Date().toISOString() }; const result = await saveCompany(clean); const updated = [clean, ...companies.filter((c) => c.slug !== clean.slug)]; replaceCompanies(updated); cacheCompanies(updated); selectCompany(clean.slug); setDraft(clean); setStatus(result.ok ? `Saved ${clean.companyName}.` : `Save failed: ${result.message}`); }
  async function handleLogo(file?: File) { if (!file) return; setUploading(true); setStatus("Uploading logo..."); const result = await uploadCompanyFile(config.slug, file); if (result.ok) { patch("logoUrl", result.url); setStatus("Logo uploaded. Save Live to publish it."); } else setStatus(result.message); setUploading(false); }
  async function removeCompany() { if (companies.length <= 1) return setStatus("Keep at least one company."); if (confirmDelete !== config.slug) return setStatus("Type the company slug exactly before deleting."); const updated = companies.filter((c) => c.slug !== config.slug); const result = await deleteCompanyConfig(config.slug); replaceCompanies(updated); cacheCompanies(updated); selectCompany(updated[0]?.slug || defaultCompanyConfig.slug); setStatus(result.ok ? `Deleted ${config.companyName}.` : `Delete failed: ${result.message}`); }
  async function clearBoard() { if (confirmReset !== config.slug) return setStatus("Type the company slug exactly before resetting the board."); setStatus(`Resetting ${config.companyName} board...`); const result = await resetCompanyBoard(config.slug); setConfirmReset(""); setStatus(result.ok ? `Reset ${config.companyName}. The company config stayed in place.` : `Reset failed: ${result.message}`); }

  return <main className="nexus-admin-page"><div className="nexus-admin-shell">
    <aside className="nexus-admin-side">
      <div className="nexus-admin-brand"><img src="/brand/nexus-app-icon.png" alt="Nexus"/><div><p>Nexus Owner</p><h1>Studio</h1></div></div>
      <button className="nexus-primary-btn" onClick={makeNew}><Plus size={17}/> New Company Draft</button>
      <div className="nexus-company-list">{companies.map((c)=><button key={c.slug} onClick={()=>selectCompany(c.slug)} className={activeSlug===c.slug?"active":""}><span>{c.logoUrl ? <img src={c.logoUrl} alt=""/> : <ShieldCheck size={18}/>}</span><strong>{c.companyName}</strong><small>/{c.slug}</small></button>)}</div>
      <div className="nexus-step-list">{steps.map((s)=><button key={s} onClick={()=>setStep(s)} className={step===s?"active":""}>{s}</button>)}</div>
    </aside>
    <section className="nexus-admin-main">
      <header className="nexus-admin-top"><div><p className="nexus-eyebrow">Full platform control</p><h2>Company builder</h2><p>Create companies, choose modules, theme the shell, and publish clean configs. Individual staff PINs live inside each company board.</p></div><div className="nexus-admin-actions"><Link href="/"><Eye size={16}/> Login</Link><Link href={`/${config.slug}/dashboard`}><Eye size={16}/> Manager</Link><Link href={`/${config.slug}/crew`}><Eye size={16}/> Crew</Link><button onClick={copy}><Copy size={16}/> Copy</button><button onClick={download}><Download size={16}/> Export</button><button onClick={async ()=>{ await logoutDeviceSession(); router.push("/"); }}>Logout</button><button className="save" onClick={saveLive}><Save size={16}/> Save Live</button></div></header>
      <div className="nexus-status">{status}</div>
      <div className="nexus-admin-grid"><section className="nexus-editor-card"><h3>{step}</h3>
        {step === "Company" && <div className="nexus-form-grid"><label><span>Company name</span><input value={draft.companyName} onChange={(e)=>{ const name=e.target.value; setDraft(d=>({...d, companyName:name, slug: d.slug.startsWith("new-company") ? slugifyCompanyName(name) : d.slug })); }} /></label><label><span>Company slug</span><input value={draft.slug} onChange={(e)=>patch("slug", slugifyCompanyName(e.target.value))} /></label><div className="nexus-template-grid">{templateKeys.map((k)=><button key={k} onClick={()=>applyTemplate(k)} className={template===k?"active":""}><strong>{templates[k].label}</strong><small>{templates[k].description}</small></button>)}</div><div className="nexus-danger"><strong>Reset board data</strong><p>Clears jobs, people, equipment, inventory, requests, and staff PINs. The company itself stays.</p><input value={confirmReset} onChange={(e)=>setConfirmReset(e.target.value)} placeholder={`Type ${config.slug}`} /><button onClick={clearBoard}><Trash2 size={16}/> Reset Board</button></div><div className="nexus-danger"><strong>Delete company</strong><p>Type the slug exactly, then delete. Drafts are not saved until Save Live.</p><input value={confirmDelete} onChange={(e)=>setConfirmDelete(e.target.value)} placeholder={`Type ${config.slug}`} /><button onClick={removeCompany}><Trash2 size={16}/> Delete</button></div></div>}
        {step === "Access" && <div className="nexus-form-grid"><div className="nexus-access-note"><strong>Access model upgraded.</strong><br/>There is no longer a shared crew PIN, manager PIN, or media PIN. Media is just a module. People sign in with their own personal PIN from Staff + Crews. Nexus Owner still uses the global owner PIN and creates companies. Company Admins can ordain managers and manage staff inside the company dashboard.</div><div className="nexus-template-grid"><button className="active"><strong>1. Nexus Owner</strong><small>Creates companies and controls the Studio.</small></button><button className="active"><strong>2. Company Admin</strong><small>Can create managers, crew leads, staff, departments, and permissions.</small></button><button className="active"><strong>3. Manager / Crew Lead</strong><small>Runs jobs, approvals, equipment, tools, requests, and messages.</small></button><button className="active"><strong>4. Crew</strong><small>Checks jobs, requests exact gear, uploads job photos, and sees the board.</small></button></div></div>}
        {step === "Modules" && <div className="nexus-template-grid">{activeTemplate.modules.map((m)=><button key={m} onClick={()=>patch("modules", draft.modules.includes(m) ? draft.modules.filter((x)=>x!==m) : [...draft.modules, m])} className={draft.modules.includes(m)?"active":""}><strong>{draft.modules.includes(m)?"✓ ":""}{m}</strong><small>Toggle this system for the company.</small></button>)}</div>}
        {step === "Theme" && <div className="nexus-form-grid two">{Object.entries(draft.theme ?? nexusTheme).map(([k,v])=><label key={k}><span>{k}</span><input value={String(v)} onChange={(e)=>patch("theme", { ...(draft.theme ?? nexusTheme), [k]: e.target.value })} /></label>)}<button className="nexus-primary-btn" onClick={()=>patch("theme", nexusTheme)}>Reset Nexus Theme</button></div>}
        {step === "Media" && <div className="nexus-form-grid"><label className="nexus-upload"><UploadCloud/><strong>{uploading?"Uploading...":"Upload company logo"}</strong><small>PNG/JPG/WEBP. This is company-specific, not the Nexus master mark.</small><input type="file" accept="image/*" onChange={(e)=>handleLogo(e.target.files?.[0])}/></label><label><span>Logo URL</span><input value={draft.logoUrl ?? ""} onChange={(e)=>patch("logoUrl", e.target.value)} placeholder="https://..." /></label>{draft.logoUrl ? <img className="nexus-logo-preview" src={draft.logoUrl} alt="Logo preview"/> : null}</div>}
        {step === "Publish" && <div className="nexus-publish"><img src="/brand/nexus-logo-stacked-gradient.png" alt="Nexus"/><button className="nexus-primary-btn" onClick={saveLive}><Rocket size={18}/> Save Live</button><p>This writes the company config and updates local cache so the PIN router can find it immediately.</p></div>}
      </section><section className="nexus-preview-card"><h3>Live blueprint</h3><pre>{JSON.stringify(config, null, 2)}</pre></section></div>
    </section>
  </div></main>;
}
