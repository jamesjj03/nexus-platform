"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, ImagePlus, LayoutDashboard, UploadCloud, Workflow } from "lucide-react";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import { uploadCompanyFile } from "@/lib/fieldflow/companyConfig";

type UploadItem = { id: string; name: string; url: string; note: string; kind: string };

export function UploadPanel({ mode = "media" }: { mode?: "media" | "crew" }) {
  const { activeCompany, companies, activeSlug, selectCompany } = useCompanies();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState(mode === "crew" ? "Job Photo" : "Company Media");
  const [status, setStatus] = useState("Ready.");

  async function handleFile(file?: File) {
    if (!file) return;
    setStatus("Uploading...");
    const result = await uploadCompanyFile(activeCompany.slug, file);
    if (!result.ok) {
      const localUrl = URL.createObjectURL(file);
      setUploads((list) => [{ id: String(Date.now()), name: file.name, url: localUrl, note, kind }, ...list]);
      setStatus(`${result.message} Showing local preview for now.`);
      return;
    }
    setUploads((list) => [{ id: String(Date.now()), name: file.name, url: result.url, note, kind }, ...list]);
    setStatus("Uploaded live.");
    setNote("");
  }

  return (
    <main className="ff-light-page">
      <div className="ff-media-shell">
        <header className="ff-media-header">
          <div className="ff-login-brand">
            <div className="ff-login-logo small">
              {activeCompany.logoUrl ? <img src={activeCompany.logoUrl} alt="Company logo" /> : <Workflow />}
            </div>
            <div>
              <p className="micro">{mode === "crew" ? "Crew Uploads" : "Media Library"}</p>
              <h1>{activeCompany.companyName}</h1>
            </div>
          </div>
          <div className="ff-media-actions">
            <select className="ff-input" value={activeSlug} onChange={(e) => selectCompany(e.target.value)}>
              {companies.map((c) => <option key={c.slug} value={c.slug}>{c.companyName}</option>)}
            </select>
            <Link href="/dashboard" className="ff-btn secondary"><LayoutDashboard size={18}/> Dashboard</Link>
          </div>
        </header>

        <section className="ff-panel">
          <div className="ff-panel-head">
            <div>
              <h3>{mode === "crew" ? "Upload field photo" : "Upload company media"}</h3>
              <p>Photos use the active company slug and Supabase Storage when connected.</p>
            </div>
          </div>
          <div className="ff-panel-body ff-upload-layout">
            <label className="ff-upload-drop light">
              <UploadCloud />
              <strong>Drop/click to upload</strong>
              <span>Job photos, issue photos, logo drafts, receipts, or general media.</span>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <div style={{display:"grid",gap:10}}>
              <label><span className="ff-admin-label dark">Type</span><select className="ff-input" value={kind} onChange={(e)=>setKind(e.target.value)}><option>Job Photo</option><option>Before Photo</option><option>After Photo</option><option>Issue Photo</option><option>Equipment Photo</option><option>Receipt</option><option>Company Media</option></select></label>
              <label><span className="ff-admin-label dark">Note</span><textarea className="ff-input" style={{minHeight:120}} value={note} onChange={(e)=>setNote(e.target.value)} placeholder="What is this photo for?" /></label>
              <div className="ff-admin-status light">{status}</div>
            </div>
          </div>
        </section>

        <section className="ff-panel">
          <div className="ff-panel-head"><div><h3>Recent uploads</h3><p>Local preview appears immediately. Live storage works after Supabase bucket setup.</p></div></div>
          <div className="ff-panel-body">
            {uploads.length === 0 ? <div className="ff-empty-media"><Camera/><strong>No uploads yet.</strong><span>Add one above.</span></div> : <div className="ff-media-grid">{uploads.map((u)=><article className="ff-media-card" key={u.id}><div className="ff-media-thumb">{u.url ? <img src={u.url} alt={u.name}/> : <ImagePlus/>}</div><div className="ff-media-card-body"><strong>{u.kind}</strong><p>{u.name}</p>{u.note?<p>{u.note}</p>:null}</div></article>)}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
