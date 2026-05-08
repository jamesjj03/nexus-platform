"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ClipboardList, Hand, LayoutDashboard, LogOut, Package, Search, Send, Truck, UploadCloud, Workflow, Wrench } from "lucide-react";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import { uploadCompanyFile } from "@/lib/fieldflow/companyConfig";
import { clearDeviceSession, getDeviceSession } from "@/lib/fieldflow/deviceAuth";
import { inventoryCategories } from "@/lib/v2Additions";
import { loadLiveBoard, saveLiveBoard, type NexusBoardData } from "@/lib/fieldflow/liveStore";
import { seedBoardForCompany } from "@/lib/fieldflow/seedBoards";

type UploadItem = { id: string; name: string; url: string; kind: string; note: string };
type RequestItem = { id: string; kind: string; item: string; requestedBy: string; crew: string; status: "Pending" | "Approved" | "Denied" | "Completed"; note: string; createdAt: string };
const REQUESTS_KEY = "ff_requests_v1";

function tone(v: string) { if (["Available", "Good", "Resolved", "Approved", "Completed"].includes(v)) return "green"; if (["Needs Service", "Low", "Open", "High", "Denied"].includes(v)) return "red"; if (["Active", "In Use", "Pending"].includes(v)) return "blue"; if (["Medium", "Scheduled"].includes(v)) return "gold"; return ""; }
function Pill({ children, t = "" }: { children: React.ReactNode; t?: string }) { return <span className={`ff-pill ${t}`}>{children}</span>; }
function readRequests(slug: string): RequestItem[] { try { return JSON.parse(localStorage.getItem(`${REQUESTS_KEY}:${slug}`) || "[]"); } catch { return []; } }
function writeRequests(slug: string, next: RequestItem[]) { localStorage.setItem(`${REQUESTS_KEY}:${slug}`, JSON.stringify(next)); window.dispatchEvent(new Event("ff-requests-updated")); }

export function CrewPortal({ companySlug }: { companySlug?: string }) {
  const router = useRouter();
  const { activeCompany, loading, selectCompany } = useCompanies();
  const [tab, setTab] = useState<"today" | "equipment" | "tools" | "inventory" | "request" | "upload">("today");
  const [search, setSearch] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("All");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("Job Photo");
  const [status, setStatus] = useState("Ready.");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [requestKind, setRequestKind] = useState("Equipment");
  const [requestItem, setRequestItem] = useState("");
  const [requestBy, setRequestBy] = useState("Crew member");
  const [requestCrew, setRequestCrew] = useState("Crew A");
  const [requestNote, setRequestNote] = useState("");
  const fallbackBoard = useMemo<NexusBoardData>(() => seedBoardForCompany(activeCompany.slug), [activeCompany.slug]);
  const [board, setBoard] = useState<NexusBoardData>(fallbackBoard);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  useEffect(() => {
    const session = getDeviceSession();
    if (!session) router.replace("/");
    if (companySlug && session && session.role !== "owner" && session.slug !== companySlug) router.replace("/");
  }, [router, companySlug]);

  useEffect(() => {
    if (!loading && companySlug && activeCompany.slug !== companySlug) selectCompany(companySlug);
  }, [loading, companySlug, activeCompany.slug, selectCompany]);

  useEffect(() => {
    let live = true;
    loadLiveBoard(activeCompany.slug, fallbackBoard).then((data) => {
      if (!live) return;
      setBoard(data);
      setRequests(data.requests?.length ? data.requests as RequestItem[] : readRequests(activeCompany.slug));
    });
    return () => { live = false; };
  }, [activeCompany.slug, fallbackBoard]);

  const q = search.toLowerCase();
  const pass = (x: any) => !q || JSON.stringify(x).toLowerCase().includes(q);
  const filteredJobs = (board.jobs || []).filter(pass);
  const filteredEquipment = (board.equipment || []).filter(pass);
  const filteredTools = (board.tools || []).filter(pass);
  const filteredInventory = (board.inventory || []).filter((i: any) => inventoryCategory === "All" || i.category === inventoryCategory).filter(pass);

  async function handleFile(file?: File) {
    if (!file) return;
    setStatus("Uploading...");
    const result = await uploadCompanyFile(activeCompany.slug, file);
    const url = result.ok ? result.url : URL.createObjectURL(file);
    setUploads((list) => [{ id: String(Date.now()), name: file.name, url, kind, note }, ...list]);
    setStatus(result.ok ? "Uploaded live." : `${result.message} Local preview is showing.`);
    if (result.ok) setNote("");
  }

  function logout() { clearDeviceSession(); router.push("/"); }

  function submitRequest(prefill?: { kind?: string; item?: string; note?: string }) {
    const next: RequestItem = {
      id: `req-${Date.now()}`,
      kind: prefill?.kind || requestKind,
      item: prefill?.item || requestItem || "General request",
      requestedBy: requestBy,
      crew: requestCrew,
      status: "Pending",
      note: prefill?.note || requestNote,
      createdAt: new Date().toISOString(),
    };
    const updated = [next, ...requests];
    writeRequests(activeCompany.slug, updated);
    setRequests(updated);
    const nextBoard = { ...board, requests: updated };
    setBoard(nextBoard);
    saveLiveBoard(activeCompany.slug, nextBoard);
    setRequestItem("");
    setRequestNote("");
    setStatus("Request sent to manager board.");
    setTab("request");
  }

  return <main className="ff-light-page"><div className="ff-crew-shell">
    <header className="ff-crew-top-v2">
      <div className="ff-login-brand"><div className="ff-login-logo small ff-nexus-logo"><img src="/brand/nexus-app-icon.png" alt="Nexus" /></div><div><p className="micro">Nexus Crew</p><h1>{activeCompany.companyName}</h1></div></div>
      <div className="ff-crew-header-actions"><Link href={`/${activeCompany.slug}/dashboard`} className="ff-btn secondary"><LayoutDashboard size={17} /> Manager</Link><button className="ff-btn secondary" onClick={logout}><LogOut size={17}/> Logout</button></div>
    </header>

    <section className="ff-crew-hero-v2"><div><p className="micro">Today</p><h2>Clean field board.</h2><p>Jobs, equipment, tools, inventory, uploads, and requests without giving crew the manager controls.</p></div><button className="ff-crew-upload-cta" onClick={() => setTab("request")}><Hand /> Make Request</button></section>

    <div className="ff-crew-tabs-v2 ff-crew-tabs-five">
      <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><ClipboardList /> Jobs</button>
      <button className={tab === "equipment" ? "active" : ""} onClick={() => setTab("equipment")}><Truck /> Equipment</button>
      <button className={tab === "tools" ? "active" : ""} onClick={() => setTab("tools")}><Wrench /> Tools</button>
      <button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}><Package /> Inventory</button>
      <button className={tab === "request" ? "active" : ""} onClick={() => setTab("request")}><Send /> Request</button>
      <button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}><UploadCloud /> Upload</button>
    </div>

    {tab !== "upload" ? <div className="ff-crew-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs, equipment, tools, material..." /></div> : null}

    {tab === "today" && <section className="ff-crew-stack">{filteredJobs.map((job: any) => <article className="ff-crew-card-v2" key={job.id}><div className="ff-card-top"><div><h3>{job.name}</h3><p>{job.address}</p></div><Pill t={tone(job.status)}>{job.status}</Pill></div><div className="ff-crew-meta-line"><span>Crew: <b>{job.crew}</b></span><span>ETA: <b>{job.eta}</b></span></div>{job.tasks?.map((task: string) => <div className="ff-crew-task-v2" key={task}><CheckCircle2 size={18} />{task}</div>)}</article>)}</section>}

    {tab === "equipment" && <section className="ff-crew-stack">{filteredEquipment.map((item: any) => <article className="ff-crew-card-v2" key={item.id}><div className="ff-card-top"><div><h3>{item.name}</h3><p>{item.category} · {item.location}</p></div><Pill t={tone(item.status)}>{item.status}</Pill></div><div className="ff-crew-meta-line"><span>Assigned: <b>{item.assigned}</b></span><span>Available: <b>{item.available}</b></span></div>{item.notes?.[0] ? <p className="ff-note">{item.notes[0]}</p> : null}<div className="ff-crew-card-actions"><button onClick={() => submitRequest({ kind: "Equipment", item: item.name, note: `Requesting ${item.name}.` })}><Send size={16} /> Request this</button><button onClick={() => submitRequest({ kind: "Repair", item: item.name, note: `Service/check requested for ${item.name}.` })}>Service check</button></div></article>)}</section>}

    {tab === "tools" && <section className="ff-crew-stack">{filteredTools.map((item: any) => <article className="ff-crew-card-v2" key={item.id}><div className="ff-card-top"><div><h3>{item.name}</h3><p>{item.category} · {item.location}</p></div><Pill t={tone(item.status)}>{item.status}</Pill></div><div className="ff-crew-meta-line"><span>Assigned: <b>{item.assigned}</b></span><span>Available: <b>{item.available}</b></span></div>{item.notes?.[0] ? <p className="ff-note">{item.notes[0]}</p> : null}<div className="ff-crew-card-actions"><button onClick={() => submitRequest({ kind: "Tool", item: item.name, note: `Requesting ${item.name}.` })}><Send size={16} /> Request this</button><button onClick={() => submitRequest({ kind: "Repair", item: item.name, note: `Service/check requested for ${item.name}.` })}>Service check</button></div></article>)}</section>}

    {tab === "inventory" && <section><div className="ff-inventory-tabs crew-tabs">{inventoryCategories.map((c: string) => <button key={c} className={`ff-inventory-tab ${inventoryCategory === c ? "active" : ""}`} onClick={() => setInventoryCategory(c)}>{c}</button>)}</div><div className="ff-crew-stack">{filteredInventory.map((item: any) => <article className="ff-crew-card-v2" key={item.id}><div className="ff-card-top"><div><h3>{item.name}</h3><p>{item.category}</p></div><Pill t={tone(item.status)}>{item.status}</Pill></div><div className="ff-crew-meta-line"><span>Qty: <b>{item.qty}</b></span><span>Unit: <b>{item.unit}</b></span></div>{item.notes?.[0] ? <p className="ff-note">{item.notes[0]}</p> : null}<div className="ff-crew-card-actions"><button onClick={() => submitRequest({ kind: "Material", item: item.name, note: `Need more ${item.name}.` })}><Send size={16} /> Request material</button></div></article>)}</div></section>}

    {tab === "request" && <section className="ff-panel"><div className="ff-panel-head"><div><h3>Request equipment, materials, or help</h3><p>This sends a pending request to the manager dashboard.</p></div></div><div className="ff-panel-body ff-request-form"><label><span>Type</span><select className="ff-input" value={requestKind} onChange={(e) => setRequestKind(e.target.value)}><option>Equipment</option><option>Material</option><option>Help</option><option>Repair</option><option>Other</option></select></label><label><span>Item</span><input className="ff-input" value={requestItem} onChange={(e) => setRequestItem(e.target.value)} placeholder="Excavator, black mulch, extra guy, repair..." /></label><label><span>Your name</span><input className="ff-input" value={requestBy} onChange={(e) => setRequestBy(e.target.value)} /></label><label><span>Crew</span><input className="ff-input" value={requestCrew} onChange={(e) => setRequestCrew(e.target.value)} /></label><label className="wide"><span>Note</span><textarea className="ff-input" value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="What do you need and when?" /></label><button className="ff-crew-big" onClick={() => submitRequest()}><Send /> Send Request</button></div><div className="ff-panel-body"><div className="ff-crew-stack">{requests.slice(0, 8).map((r) => <article className="ff-crew-card-v2" key={r.id}><div className="ff-card-top"><div><h3>{r.item}</h3><p>{r.kind} · {r.crew}</p></div><Pill t={tone(r.status)}>{r.status}</Pill></div>{r.note ? <p className="ff-note">{r.note}</p> : null}</article>)}</div></div></section>}

    {tab === "upload" && <section className="ff-panel"><div className="ff-panel-head"><div><h3>Upload field media</h3><p>Photos save under this company when Supabase Storage is connected.</p></div></div><div className="ff-panel-body ff-upload-layout"><label className="ff-upload-drop light"><UploadCloud /><strong>Tap to upload</strong><span>Before/after, issue, equipment, receipt, or job photo.</span><input type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} /></label><div style={{ display: "grid", gap: 10 }}><label><span className="ff-admin-label dark">Type</span><select className="ff-input" value={kind} onChange={(e) => setKind(e.target.value)}><option>Job Photo</option><option>Before Photo</option><option>After Photo</option><option>Issue Photo</option><option>Equipment Photo</option><option>Receipt</option></select></label><label><span className="ff-admin-label dark">Note</span><textarea className="ff-input" style={{ minHeight: 110 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is this photo for?" /></label><div className="ff-admin-status light">{status}</div></div></div>{uploads.length > 0 ? <div className="ff-panel-body"><div className="ff-media-grid">{uploads.map((u) => <article className="ff-media-card" key={u.id}><div className="ff-media-thumb"><img src={u.url} alt={u.name} /></div><div className="ff-media-card-body"><strong>{u.kind}</strong><p>{u.name}</p>{u.note ? <p>{u.note}</p> : null}</div></article>)}</div></div> : null}</section>}
  </div></main>;
}
