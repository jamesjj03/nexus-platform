"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/purity, react-hooks/set-state-in-effect */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, Hand, LayoutDashboard, LogOut, MessageSquare, Package, Search, Send, Truck, UploadCloud, Wrench } from "lucide-react";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import { uploadCompanyFile } from "@/lib/fieldflow/companyConfig";
import { fetchDeviceSession, logoutDeviceSession } from "@/lib/fieldflow/deviceAuth";
import { inventoryCategories } from "@/lib/v2Additions";
import { loadLiveBoard, saveLiveBoard, subscribeLiveBoard, type NexusBoardData } from "@/lib/fieldflow/liveStore";
import { seedBoardForCompany } from "@/lib/fieldflow/seedBoards";

type UploadItem = { id: string; name: string; url: string; kind: string; note: string; jobId?: string; jobName?: string };
type RequestItem = { id: string; kind: string; item: string; assetIds?: string[]; requestedBy: string; crew: string; status: "Pending" | "Approved" | "Denied" | "Completed"; note: string; jobId?: string; jobName?: string; startDate?: string; endDate?: string; createdAt: string };

function tone(v = "") { if (["Available", "Good", "Resolved", "Approved", "Completed"].includes(v)) return "green"; if (["Needs Service", "Low", "Open", "High", "Denied", "Out"].includes(v)) return "red"; if (["Active", "In Use", "Pending"].includes(v)) return "blue"; if (["Medium", "Scheduled"].includes(v)) return "gold"; return ""; }
function Pill({ children, t = "" }: { children: React.ReactNode; t?: string }) { return <span className={`ff-pill ${t}`}>{children}</span>; }
function today() { return new Date().toISOString().slice(0, 10); }
function plusDays(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function normalizeBoard(data: NexusBoardData, slug: string): Required<NexusBoardData> { return { jobs: data.jobs || [], equipment: data.equipment || [], tools: data.tools || [], inventory: data.inventory || [], issues: data.issues || [], staff: data.staff || [], crews: data.crews || [], messages: data.messages || [], requests: data.requests || [], checkouts: data.checkouts || [], updatedAt: data.updatedAt || "", companySlug: slug }; }
function emptyBoard(slug: string): Required<NexusBoardData> { return normalizeBoard({ jobs: [], equipment: [], tools: [], inventory: [], issues: [], staff: [], crews: [], messages: [], requests: [], checkouts: [] }, slug); }
function assetName(a: any) { return `${a.name}${a.status === "In Use" ? ` · out to ${a.assigned}` : ""}`; }

export function CrewPortal({ companySlug }: { companySlug?: string }) {
  const router = useRouter();
  const { activeCompany, loading, selectCompany } = useCompanies();
  const [tab, setTab] = useState<"today" | "messages" | "equipment" | "tools" | "inventory" | "request" | "upload">("today");
  const [search, setSearch] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("All");
  const [assetCategory, setAssetCategory] = useState("All");
  const [assetDept, setAssetDept] = useState("All");
  const [assetStatus, setAssetStatus] = useState("All");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("Job Photo");
  const [status, setStatus] = useState("Ready.");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [requestBy, setRequestBy] = useState("Crew member");
  const [requestCrew, setRequestCrew] = useState("Crew A");
  const [requestNote, setRequestNote] = useState("");
  const [requestStart, setRequestStart] = useState(today());
  const [requestEnd, setRequestEnd] = useState(today());
  const [requestJobId, setRequestJobId] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const fallbackBoard = useMemo<NexusBoardData>(() => seedBoardForCompany(activeCompany.slug), [activeCompany.slug]);
  const [board, setBoard] = useState<Required<NexusBoardData>>(() => emptyBoard(activeCompany.slug));
  const [boardSlug, setBoardSlug] = useState("");
  const loadedSlug = useRef("");
  const hydrated = useRef(false);

  useEffect(() => { fetchDeviceSession().then((session) => { if (!session) router.replace("/"); if (companySlug && session && session.role !== "owner" && session.slug !== companySlug) router.replace("/"); }).catch(() => router.replace("/")); }, [router, companySlug]);
  useEffect(() => { if (!loading && companySlug && activeCompany.slug !== companySlug) selectCompany(companySlug); }, [loading, companySlug, activeCompany.slug, selectCompany]);
  useEffect(() => { let live = true; hydrated.current = false; loadedSlug.current = ""; setBoardSlug(""); setBoard(emptyBoard(activeCompany.slug)); setStatus(`Loading ${activeCompany.companyName}...`); loadLiveBoard(activeCompany.slug, fallbackBoard).then(async (data) => { if (!live) return; const next = normalizeBoard(data, activeCompany.slug); setBoard(next); loadedSlug.current = activeCompany.slug; hydrated.current = true; setBoardSlug(activeCompany.slug); const session = await fetchDeviceSession().catch(() => null); const person = session?.personName || next.staff[0]?.name || "Crew member"; setRequestBy(person); setRequestCrew(next.staff.find((p:any) => p.name === person)?.crew || next.staff[0]?.crew || "Crew A"); setStatus("Crew board loaded."); }); return () => { live = false; }; }, [activeCompany.slug, activeCompany.companyName, fallbackBoard]);
  useEffect(() => subscribeLiveBoard(activeCompany.slug, (data) => { if (loadedSlug.current !== activeCompany.slug) return; setBoard(normalizeBoard(data, activeCompany.slug)); }, setStatus), [activeCompany.slug]);

  const q = search.toLowerCase();
  const pass = (x: any) => !q || JSON.stringify(x).toLowerCase().includes(q);
  const filteredJobs = board.jobs.filter(pass);
  const assetPass = (x: any) => pass(x) && (assetCategory === "All" || x.category === assetCategory) && (assetDept === "All" || x.dept === assetDept) && (assetStatus === "All" || x.status === assetStatus);
  const filteredEquipment = board.equipment.filter(assetPass);
  const filteredTools = board.tools.filter(assetPass);
  const filteredInventory = board.inventory.filter((i: any) => inventoryCategory === "All" || i.category === inventoryCategory).filter(pass);
  const assets = useMemo(() => [...board.equipment.map((x:any)=>({...x, assetType:"Equipment"})), ...board.tools.map((x:any)=>({...x, assetType:"Tool"}))], [board.equipment, board.tools]);
  const crewOptions = useMemo(() => Array.from(new Set([...(board.crews || []).map((c:any)=>c.name), ...board.staff.map((p:any) => p.crew)].filter(Boolean))).sort(), [board.crews, board.staff]);
  const jobOptions = useMemo(() => board.jobs.map((j:any)=>({ id: j.id, name: j.name || j.title })), [board.jobs]);
  const assetCategories = useMemo(() => ["All", ...Array.from(new Set([...board.equipment, ...board.tools].map((x:any)=>x.category).filter(Boolean))).sort()], [board.equipment, board.tools]);
  const assetDepts = useMemo(() => ["All", ...Array.from(new Set([...board.equipment, ...board.tools].map((x:any)=>x.dept).filter(Boolean))).sort()], [board.equipment, board.tools]);
  const myRequests = board.requests.filter((r:any) => !requestBy || r.requestedBy === requestBy || r.crew === requestCrew).slice(0, 12);

  async function handleFile(file?: File) { if (!file) return; setStatus("Uploading..."); const result = await uploadCompanyFile(activeCompany.slug, file); const url = result.ok ? result.url : URL.createObjectURL(file); const jobName = jobOptions.find((j:any)=>j.id === selectedJobId)?.name || ""; setUploads((list) => [{ id: String(Date.now()), name: file.name, url, kind, note, jobId: selectedJobId, jobName }, ...list]); setStatus(result.ok ? "Uploaded live." : `${result.message} Local preview is showing.`); if (result.ok) setNote(""); }
  async function logout() { await logoutDeviceSession(); router.push("/"); }
  function toggleAsset(id: string) { setSelectedAssets((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]); }
  async function submitRequest(mode: "today" | "multi" = "multi", singleAssetId?: string) {
    const ids = singleAssetId ? [singleAssetId] : selectedAssets;
    const names = assets.filter((a:any) => ids.includes(a.id)).map((a:any) => a.name).join(", ");
    const jobName = jobOptions.find((j:any)=>j.id === requestJobId)?.name || "";
    const next: RequestItem = { id: `req-${Date.now()}`, kind: "Checkout", item: names || "General checkout request", assetIds: ids, requestedBy: requestBy, crew: requestCrew, status: "Pending", note: requestNote || (mode === "today" ? "Requesting checkout for today." : "Requesting checkout extension."), jobId: requestJobId, jobName, startDate: mode === "today" ? today() : requestStart, endDate: mode === "today" ? today() : requestEnd, createdAt: new Date().toISOString() };
    const nextBoard = { ...board, requests: [next, ...board.requests] };
    setBoard(nextBoard);
    const result = await saveLiveBoard(activeCompany.slug, nextBoard);
    setStatus(result.ok ? "Request sent to manager board." : `Saved locally. Live sync issue: ${result.message}`);
    setSelectedAssets([]); setRequestNote(""); setRequestJobId(""); setTab("request");
  }

  const waitingForCompany = loading || (companySlug ? activeCompany.slug !== companySlug : false);
  const boardReady = boardSlug === activeCompany.slug;
  if (waitingForCompany || !boardReady) return <main className="ff-light-page"><div className="ff-loading-shell"><div className="nexus-sync-pill">{waitingForCompany ? "Loading company..." : status}</div></div></main>;

  return <main className="ff-light-page"><div className="ff-crew-shell">
    <header className="ff-crew-top-v2"><div className="ff-login-brand"><div className="ff-login-logo small ff-nexus-logo"><img src="/brand/nexus-app-icon.png" alt="Nexus" /></div><div><p className="micro">Nexus Crew</p><h1>{activeCompany.companyName}</h1></div></div><div className="ff-crew-header-actions"><Link href={`/${activeCompany.slug}/dashboard`} className="ff-btn secondary"><LayoutDashboard size={17} /> Manager</Link><button className="ff-btn secondary" onClick={logout}><LogOut size={17}/> Logout</button></div></header>
    <section className="ff-crew-hero-v2"><div><p className="micro">Today</p><h2>Crew field board.</h2><p>Jobs, inventory, exact tool checkout requests, and live manager approvals.</p></div><button className="ff-crew-upload-cta" onClick={() => setTab("request")}><Hand /> Check Out Gear</button></section>
    <div className="ff-crew-tabs-v2 ff-crew-tabs-five"><button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><ClipboardList /> Jobs</button><button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}><MessageSquare /> Board</button><button className={tab === "equipment" ? "active" : ""} onClick={() => setTab("equipment")}><Truck /> Equipment</button><button className={tab === "tools" ? "active" : ""} onClick={() => setTab("tools")}><Wrench /> Tools</button><button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}><Package /> Inventory</button><button className={tab === "request" ? "active" : ""} onClick={() => setTab("request")}><Send /> Requests</button><button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}><UploadCloud /> Upload</button></div>
    {tab !== "upload" ? <div className="ff-crew-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs, equipment, tools, material..." /></div> : null}
    {(tab === "equipment" || tab === "tools") ? <div className="ff-controls"><select className="ff-input" value={assetCategory} onChange={(e)=>setAssetCategory(e.target.value)}>{assetCategories.map((c:any)=><option key={c}>{c}</option>)}</select><select className="ff-input" value={assetDept} onChange={(e)=>setAssetDept(e.target.value)}>{assetDepts.map((d:any)=><option key={d}>{d}</option>)}</select><select className="ff-input" value={assetStatus} onChange={(e)=>setAssetStatus(e.target.value)}><option>All</option><option>Available</option><option>In Use</option><option>Needs Service</option><option>Low</option></select></div> : null}
    {tab === "messages" && <section className="ff-crew-stack">{board.messages.length ? board.messages.map((m:any) => <article className="ff-crew-card-v2" key={m.id}><div className="ff-card-top"><div><h3>{m.title}</h3><p>{m.author || "Manager"} · {String(m.createdAt || "").slice(0,10)}</p></div><Pill t={m.pinned ? "gold" : "blue"}>{m.pinned ? "Pinned" : m.audience || "All"}</Pill></div><p className="ff-note">{m.body}</p></article>) : <div className="ff-empty-box">No messages yet.</div>}</section>}
    {tab === "today" && <section className="ff-crew-stack">{filteredJobs.map((job: any) => <article className="ff-crew-card-v2" key={job.id}><div className="ff-card-top"><div><h3>{job.name}</h3><p>{job.address}</p></div><Pill t={tone(job.status)}>{job.status}</Pill></div><div className="ff-crew-meta-line"><span>Crew: <b>{job.crew}</b></span><span>Finish: <b>{job.estimatedFinish || job.eta}</b></span></div>{job.tasks?.map((task: string) => <div className="ff-crew-task-v2" key={task}><CheckCircle2 size={18} />{task}</div>)}</article>)}</section>}
    {tab === "equipment" && <section className="ff-crew-stack">{filteredEquipment.map((item: any) => <article className="ff-crew-card-v2" key={item.id}><div className="ff-card-top"><div><h3>{item.name}</h3><p>{item.category} · {item.location}</p></div><Pill t={tone(item.status)}>{item.status}</Pill></div><div className="ff-crew-meta-line"><span>Assigned: <b>{item.assigned}</b></span><span>Available: <b>{item.available}</b></span></div>{item.notes?.[0] ? <p className="ff-note">{item.notes[0]}</p> : null}<div className="ff-crew-card-actions"><button onClick={() => submitRequest("today", item.id)}><Send size={16} /> Request today</button><button onClick={() => { setSelectedAssets([item.id]); setTab("request"); }}>Request more days</button></div></article>)}</section>}
    {tab === "tools" && <section className="ff-crew-stack">{filteredTools.map((item: any) => <article className="ff-crew-card-v2" key={item.id}><div className="ff-card-top"><div><h3>{item.name}</h3><p>{item.category} · {item.location}</p></div><Pill t={tone(item.status)}>{item.status}</Pill></div><div className="ff-crew-meta-line"><span>Assigned: <b>{item.assigned}</b></span><span>Available: <b>{item.available}</b></span></div>{item.notes?.[0] ? <p className="ff-note">{item.notes[0]}</p> : null}<div className="ff-crew-card-actions"><button onClick={() => submitRequest("today", item.id)}><Send size={16} /> Request today</button><button onClick={() => { setSelectedAssets([item.id]); setTab("request"); }}>Request more days</button></div></article>)}</section>}
    {tab === "inventory" && <section><div className="ff-inventory-tabs crew-tabs">{inventoryCategories.map((c: string) => <button key={c} className={`ff-inventory-tab ${inventoryCategory === c ? "active" : ""}`} onClick={() => setInventoryCategory(c)}>{c}</button>)}</div><div className="ff-crew-stack">{filteredInventory.map((item: any) => <article className="ff-crew-card-v2" key={item.id}><div className="ff-card-top"><div><h3>{item.name}</h3><p>{item.category}</p></div><Pill t={tone(item.status)}>{item.status}</Pill></div><div className="ff-crew-meta-line"><span>Qty: <b>{item.qty}</b></span><span>Unit: <b>{item.unit}</b></span></div>{item.notes?.[0] ? <p className="ff-note">{item.notes[0]}</p> : null}</article>)}</div></section>}
    {tab === "request" && <section className="ff-panel"><div className="ff-panel-head"><div><h3>Check out exact gear</h3><p>Pick the person, crew, exact tools/equipment, and dates. Managers approve it from the dashboard.</p></div></div><div className="ff-panel-body ff-request-form"><label><span>Your name</span><input className="ff-input" value={requestBy} onChange={(e) => setRequestBy(e.target.value)} /></label><label><span>Crew</span><select className="ff-input" value={requestCrew} onChange={(e)=>setRequestCrew(e.target.value)}>{Array.from(new Set([requestCrew, ...crewOptions].filter(Boolean))).map(c=><option key={c}>{c}</option>)}</select></label><label><span>Job</span><select className="ff-input" value={requestJobId} onChange={(e)=>setRequestJobId(e.target.value)}><option value="">No specific job</option>{jobOptions.map((j:any)=><option key={j.id} value={j.id}>{j.name}</option>)}</select></label><label><span>Start date</span><input className="ff-input" type="date" value={requestStart} onChange={(e)=>setRequestStart(e.target.value)} /></label><label><span>Return date</span><input className="ff-input" type="date" value={requestEnd} onChange={(e)=>setRequestEnd(e.target.value)} /></label><div className="wide"><span>Tools + Equipment</span><div className="ff-asset-picklist crew-picklist">{assets.map((a:any)=><label key={a.id} className="ff-permission-pill"><input type="checkbox" checked={selectedAssets.includes(a.id)} onChange={()=>toggleAsset(a.id)} /> {a.assetType}: {assetName(a)}</label>)}</div></div><label className="wide"><span>Note</span><textarea className="ff-input" value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="Example: Jose needs rake, spade, Vermeer, and Truck 372 for the next three days." /></label><div className="wide ff-request-actions"><button className="ff-crew-big" onClick={() => { setRequestStart(today()); setRequestEnd(today()); submitRequest("today"); }}><Send /> Request today</button><button className="ff-crew-big" onClick={() => { if (requestEnd === today()) setRequestEnd(plusDays(3)); submitRequest("multi"); }}><Send /> Request selected dates</button></div></div><div className="ff-panel-body"><div className="ff-admin-status light">{status}</div><div className="ff-crew-stack">{myRequests.map((r:any) => <article className="ff-crew-card-v2" key={r.id}><div className="ff-card-top"><div><h3>{r.item}</h3><p>{r.crew} · {r.startDate || "Today"} → {r.endDate || "Today"}</p></div><Pill t={tone(r.status)}>{r.status}</Pill></div>{r.note ? <p className="ff-note">{r.note}</p> : null}</article>)}</div></div></section>}
    {tab === "upload" && <section className="ff-panel"><div className="ff-panel-head"><div><h3>Upload field media</h3><p>Photos save under this company when Supabase Storage is connected.</p></div></div><div className="ff-panel-body ff-upload-layout"><label className="ff-upload-drop light"><UploadCloud /><strong>Tap to upload</strong><span>Before/after, issue, equipment, receipt, or job photo.</span><input type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} /></label><div style={{ display: "grid", gap: 10 }}><label><span className="ff-admin-label dark">Job</span><select className="ff-input" value={selectedJobId} onChange={(e)=>setSelectedJobId(e.target.value)}><option value="">No specific job</option>{jobOptions.map((j:any)=><option key={j.id} value={j.id}>{j.name}</option>)}</select></label><label><span className="ff-admin-label dark">Type</span><select className="ff-input" value={kind} onChange={(e) => setKind(e.target.value)}><option>Job Photo</option><option>Before Photo</option><option>After Photo</option><option>Issue Photo</option><option>Equipment Photo</option><option>Receipt</option></select></label><label><span className="ff-admin-label dark">Note</span><textarea className="ff-input" style={{ minHeight: 110 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is this photo for?" /></label><div className="ff-admin-status light">{status}</div></div></div>{uploads.length > 0 ? <div className="ff-panel-body"><div className="ff-media-grid">{uploads.map((u) => <article className="ff-media-card" key={u.id}><div className="ff-media-thumb"><img src={u.url} alt={u.name} /></div><div className="ff-media-card-body"><strong>{u.kind}</strong><p>{u.name}</p>{u.jobName ? <p>Job: {u.jobName}</p> : null}{u.note ? <p>{u.note}</p> : null}</div></article>)}</div></div> : null}</section>}
  </div></main>;
}
