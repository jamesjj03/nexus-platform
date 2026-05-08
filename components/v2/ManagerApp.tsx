"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCompanies } from "@/lib/fieldflow/useCompanies";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  Package,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  UserCog,
  Wrench,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { jobs as seedJobs, crews, equipment as seedEquipment, tools as seedTools, issues as seedIssues } from "@/lib/v2Data";
import { clearDeviceSession, getDeviceSession } from "@/lib/fieldflow/deviceAuth";
import { loadLiveBoard, saveLiveBoard, NexusBoardData } from "@/lib/fieldflow/liveStore";
import { categorizedInventory, inventoryCategories } from "@/lib/v2Additions";
import { seedBoardForCompany } from "@/lib/fieldflow/seedBoards";

type View = "dashboard" | "work" | "equipment" | "tools" | "inventory" | "issues" | "staff";
type DrawerType = "job" | "equipment" | "tool" | "inventory" | "issue" | "staff" | "request";
type Drawer = { type: DrawerType; title: string; payload: any; mode?: "edit" | "add" } | null;
type RequestItem = { id: string; kind: string; item: string; requestedBy: string; crew: string; status: "Pending" | "Approved" | "Denied" | "Completed"; note: string; createdAt: string };

const permissions = [
  ["edit_inventory", "Edit inventory"],
  ["edit_equipment", "Edit equipment"],
  ["edit_issues", "Edit issues"],
  ["manage_staff", "Manage staff"],
  ["approve_requests", "Approve requests"],
  ] as const;

const nav = [
  ["Command", [["/dashboard", "Dashboard", Gauge], ["/work", "Jobs", ClipboardList], ["/staff", "Staff + Crews", UserCog], ["/crew", "Crew Portal", Users]]],
  ["Assets", [["/equipment", "Equipment", Truck], ["/tools", "Tools", Wrench], ["/inventory", "Inventory", Package], ["/issues", "Issues", Bell]]],
] as const;

function tone(v: string) {
  if (["Available", "Good", "Resolved", "Approved", "Completed"].includes(v)) return "green";
  if (["Needs Service", "Low", "Open", "High", "Denied"].includes(v)) return "red";
  if (["Active", "In Use", "Pending"].includes(v)) return "blue";
  if (["Medium", "Scheduled"].includes(v)) return "gold";
  return "";
}
function Pill({ children, t = "" }: { children: React.ReactNode; t?: string }) { return <span className={`ff-pill ${t}`}>{children}</span>; }
function Button({ children, onClick, variant = "primary", type = "button" }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger"; type?: "button" | "submit" }) { return <button type={type} onClick={onClick} className={`ff-btn ${variant}`}>{children}</button>; }
function Panel({ title, note, action, children }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="ff-panel"><div className="ff-panel-head"><div><h3>{title}</h3>{note ? <p>{note}</p> : null}</div>{action}</div><div className="ff-panel-body">{children}</div></section>; }
function Kpi({ label, value }: { label: string; value: string | number }) { return <div className="ff-kpi"><div className="label">{label}</div><div className="num">{value}</div></div>; }
function Field({ label, value, onChange, textarea = false, type = "text" }: { label: string; value: any; onChange: (v: string) => void; textarea?: boolean; type?: string }) {
  return <label className="ff-edit-field"><span>{label}</span>{textarea ? <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} /> : <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}</label>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: any; onChange: (v: string) => void; options: string[] }) {
  return <label className="ff-edit-field"><span>{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
function noteText(item: any) { return Array.isArray(item.notes) ? item.notes.join("\n") : item.notes ?? ""; }
function notesFromText(value: string) { return value.split("\n").map((x) => x.trim()).filter(Boolean); }
function uid(prefix: string) { return `${prefix}-${Date.now()}`; }

function buildSeedStaff() {
  const people: any[] = [];
  crews.forEach((crew: any) => {
    people.push({ id: `${crew.id}-lead`, name: crew.lead, role: "Crew Lead", crew: crew.name, status: crew.status, available: crew.available, permissions: ["edit_inventory", "edit_equipment"] });
    (crew.people || []).forEach((person: string, index: number) => people.push({ id: `${crew.id}-${index}`, name: person, role: "Crew Member", crew: crew.name, status: crew.status, available: crew.available, permissions: [] }));
  });
  people.push({ id: "office-manager", name: "Office Manager", role: "Manager", crew: "Office", status: "Active", available: "Now", permissions: ["edit_inventory", "edit_equipment", "edit_issues", "manage_staff", "approve_requests"] });
  people.push({ id: "owner", name: "Owner", role: "Owner", crew: "Admin", status: "Active", available: "Now", permissions: permissions.map(([key]) => key) });
  return people;
}

function Card({ item, type, setDrawer }: { item: any; type: DrawerType; setDrawer: (d: Drawer) => void }) {
  const title = item.name || item.title || item.item;
  return <article className="ff-card" onClick={() => setDrawer({ type, title, payload: item, mode: "edit" })}>
    <div className="ff-card-top"><div><h4>{title}</h4><p>{item.address || item.location || item.owner || item.crew || `${item.qty ?? ""} ${item.unit ?? ""}`}</p></div><Pill t={tone(item.status || item.severity)}>{item.status || item.severity}</Pill></div>
    {item.notes?.[0] || item.note ? <div className="ff-note">{item.notes?.[0] || item.note}</div> : null}
    <div className="ff-meta">
      {type === "job" && <><div><span>Crew</span><strong>{item.crew}</strong></div><div><span>ETA</span><strong>{item.eta}</strong></div><div><span>Tasks</span><strong>{item.tasks?.length ?? 0}</strong></div></>}
      {(type === "equipment" || type === "tool") && <><div><span>Category</span><strong>{item.category}</strong></div><div><span>Assigned</span><strong>{item.assigned}</strong></div><div><span>Available</span><strong>{item.available}</strong></div></>}
      {type === "inventory" && <><div><span>Qty</span><strong>{item.qty}</strong></div><div><span>Unit</span><strong>{item.unit}</strong></div><div><span>Status</span><strong>{item.status}</strong></div></>}
      {type === "issue" && <><div><span>Severity</span><strong>{item.severity}</strong></div><div><span>Owner</span><strong>{item.owner}</strong></div><div><span>Status</span><strong>{item.status}</strong></div></>}
      {type === "staff" && <><div><span>Role</span><strong>{item.role}</strong></div><div><span>Crew</span><strong>{item.crew}</strong></div><div><span>Available</span><strong>{item.available}</strong></div></>}
      {type === "request" && <><div><span>Kind</span><strong>{item.kind}</strong></div><div><span>Crew</span><strong>{item.crew}</strong></div><div><span>Status</span><strong>{item.status}</strong></div></>}
    </div>
  </article>;
}

export function ManagerApp({ view, companySlug }: { view: View; companySlug?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeCompany, loading, selectCompany } = useCompanies();
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [edit, setEdit] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("All");
  const [jobs, setJobs] = useState<any[]>(seedJobs);
  const [equipment, setEquipment] = useState<any[]>(seedEquipment);
  const [tools, setTools] = useState<any[]>(seedTools);
  const [inventory, setInventory] = useState<any[]>(categorizedInventory);
  const [issues, setIssues] = useState<any[]>(seedIssues);
  const [staff, setStaff] = useState<any[]>(() => buildSeedStaff());
  const [inventoryCategory, setInventoryCategory] = useState("All");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [syncStatus, setSyncStatus] = useState("Loading company board...");
  const loadedSlug = useRef("");
  const hydrated = useRef(false);

  const fallbackBoard = useMemo<NexusBoardData>(() => seedBoardForCompany(activeCompany.slug), [activeCompany.slug]);

  useEffect(() => {
    const session = getDeviceSession();
    if (!session) router.replace("/");
    if (companySlug && session && session.role !== "owner" && session.slug !== companySlug) router.replace("/");
    if (session && !["owner", "admin", "manager"].includes(session.role)) router.replace(`/${session.slug}/crew`);
  }, [router, companySlug]);

  useEffect(() => {
    if (!loading && companySlug && activeCompany.slug !== companySlug) selectCompany(companySlug);
  }, [loading, companySlug, activeCompany.slug, selectCompany]);

  useEffect(() => {
    let live = true;
    hydrated.current = false;
    setSyncStatus(`Loading ${activeCompany.companyName}...`);
    loadLiveBoard(activeCompany.slug, fallbackBoard).then((data) => {
      if (!live) return;
      setJobs(data.jobs || []);
      setEquipment(data.equipment || []);
      setTools(data.tools || []);
      setInventory(data.inventory || []);
      setIssues(data.issues || []);
      setStaff(data.staff || []);
      setRequests(data.requests || []);
      loadedSlug.current = activeCompany.slug;
      hydrated.current = true;
      setSyncStatus("Company board loaded.");
    });
    return () => { live = false; };
  }, [activeCompany.slug, activeCompany.companyName, fallbackBoard]);

  useEffect(() => {
    if (!hydrated.current || loadedSlug.current !== activeCompany.slug) return;
    const timer = window.setTimeout(async () => {
      const result = await saveLiveBoard(activeCompany.slug, { jobs, equipment, tools, inventory, issues, staff, requests });
      setSyncStatus(result.ok ? "Saved live." : `Local save OK. Live sync needs setup: ${result.message}`);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeCompany.slug, jobs, equipment, tools, inventory, issues, staff, requests]);

  useEffect(() => { if (drawer) setEdit({ ...drawer.payload, notesText: noteText(drawer.payload), tasksText: Array.isArray(drawer.payload.tasks) ? drawer.payload.tasks.join("\n") : "" }); }, [drawer?.payload?.id, drawer?.mode]);

  const q = search.toLowerCase();
  function pass(x: any) { const txt = JSON.stringify(x).toLowerCase(); if (q && !txt.includes(q)) return false; if (dept !== "all" && x.dept && x.dept !== dept) return false; if (status !== "all" && x.status && x.status !== status) return false; return true; }
  const cats = ["All", "Trucks", "Trailers", "Excavators", "Skid Steers", "Vermeers", "Mowers", "Small Tools"];
  const toolCats = ["All", "Blowers", "Trimmers", "Hardscape", "Layout", "Hand Tools", "Power Tools", "Safety"];
  const fe = equipment.filter((e) => (cat === "All" || e.category === cat)).filter(pass);
  const ft = tools.filter((t) => (cat === "All" || t.category === cat)).filter(pass);
  const filteredInventory = inventory.filter((i: any) => inventoryCategory === "All" || i.category === inventoryCategory).filter(pass);
  const filteredStaff = staff.filter(pass);
  const roles = ["Owner", "Manager", "Crew Lead", "Crew Member"];

  function persistRequests(next: RequestItem[]) { setRequests(next); }
  function openAdd(type: DrawerType) {
    const blank: Record<DrawerType, any> = {
      job: { id: uid("job"), name: "New Job", title: "New Job", address: "", status: "Scheduled", dept: "Landscape / Construction", crew: "Crew A", eta: "Today", tasks: [], notes: [] },
      equipment: { id: uid("eq"), name: "New Equipment", category: "Trucks", status: "Available", assigned: "None", location: "Yard", available: "Now", dept: "Maintenance", notes: [] },
      tool: { id: uid("tool"), name: "New Tool", category: "Hand Tools", status: "Available", assigned: "None", location: "Tool rack", available: "Now", dept: "Maintenance", notes: [] },
      inventory: { id: uid("inv"), name: "New Inventory Item", category: "Other", qty: 0, unit: "each", status: "Good", dept: "Maintenance", notes: [] },
      issue: { id: uid("issue"), name: "New Issue", title: "New Issue", severity: "Medium", status: "Open", owner: "Manager", dept: "Maintenance", notes: [] },
      staff: { id: uid("staff"), name: "New Person", role: "Crew Member", crew: "Crew A", status: "Active", available: "Now", permissions: [], tempPin: "", mustChangePassword: true },
      request: { id: uid("req"), kind: "Equipment", item: "", requestedBy: "Manager", crew: "Crew A", status: "Pending", note: "", createdAt: new Date().toISOString() },
    };
    setDrawer({ type, title: `Add ${type}`, payload: blank[type], mode: "add" });
  }
  function saveEdit() {
    if (!drawer || !edit) return;
    const clean = { ...edit };
    if ("notesText" in clean) { clean.notes = notesFromText(clean.notesText); delete clean.notesText; }
    if ("tasksText" in clean) { clean.tasks = notesFromText(clean.tasksText); delete clean.tasksText; }
    if (drawer.type === "job") setJobs((list) => drawer.mode === "add" ? [clean, ...list] : list.map((x) => x.id === clean.id ? clean : x));
    if (drawer.type === "equipment") setEquipment((list) => drawer.mode === "add" ? [clean, ...list] : list.map((x) => x.id === clean.id ? clean : x));
    if (drawer.type === "tool") setTools((list) => drawer.mode === "add" ? [clean, ...list] : list.map((x) => x.id === clean.id ? clean : x));
    if (drawer.type === "inventory") setInventory((list) => drawer.mode === "add" ? [clean, ...list] : list.map((x) => x.id === clean.id ? clean : x));
    if (drawer.type === "issue") setIssues((list) => drawer.mode === "add" ? [clean, ...list] : list.map((x) => x.id === clean.id ? clean : x));
    if (drawer.type === "staff") setStaff((list) => drawer.mode === "add" ? [clean, ...list] : list.map((x) => x.id === clean.id ? clean : x));
    if (drawer.type === "request") persistRequests(drawer.mode === "add" ? [clean, ...requests] : requests.map((x) => x.id === clean.id ? clean : x));
    setDrawer(null);
  }
  function deleteItem() {
    if (!drawer || !edit) return;
    if (drawer.type === "job") setJobs((list) => list.filter((x) => x.id !== edit.id));
    if (drawer.type === "equipment") setEquipment((list) => list.filter((x) => x.id !== edit.id));
    if (drawer.type === "tool") setTools((list) => list.filter((x) => x.id !== edit.id));
    if (drawer.type === "inventory") setInventory((list) => list.filter((x) => x.id !== edit.id));
    if (drawer.type === "issue") setIssues((list) => list.filter((x) => x.id !== edit.id));
    if (drawer.type === "staff") setStaff((list) => list.filter((x) => x.id !== edit.id));
    if (drawer.type === "request") persistRequests(requests.filter((x) => x.id !== edit.id));
    setDrawer(null);
  }
  function updateRequest(id: string, nextStatus: RequestItem["status"]) { persistRequests(requests.map((r) => r.id === id ? { ...r, status: nextStatus } : r)); }
  function patch(k: string, v: any) { setEdit((current: any) => ({ ...current, [k]: v })); }
  function togglePerm(key: string) { setEdit((current: any) => { const currentPerms = Array.isArray(current.permissions) ? current.permissions : []; return { ...current, permissions: currentPerms.includes(key) ? currentPerms.filter((x: string) => x !== key) : [...currentPerms, key] }; }); }
  function headerAdd() { openAdd(view === "work" ? "job" : view === "equipment" ? "equipment" : view === "tools" ? "tool" : view === "inventory" ? "inventory" : view === "issues" ? "issue" : view === "staff" ? "staff" : "request"); }
  function logout() { clearDeviceSession(); router.push("/"); }

  return <main className="ff-light-page"><div className="ff-shell">
    <aside className={`ff-sidebar ${open ? "open" : ""}`}><div className="ff-brand"><div className="ff-brand-row"><div className="ff-logo ff-nexus-logo"><img src="/brand/nexus-app-icon.png" alt="Nexus" /></div><div><h1>Nexus</h1><p>Manager board</p></div></div><div className="ff-company-box"><div className="micro">Signed into</div><strong>{activeCompany.companyName}</strong><div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}><Pill t="green">{activeCompany.template}</Pill><Pill>{activeCompany.modules.length} modules</Pill></div><button className="ff-logout-mini" onClick={logout}><LogOut size={14}/> Logout</button></div></div><nav className="ff-nav">{nav.map(([g, links]) => <div key={g}><div className="ff-nav-label">{g}</div>{links.map(([href, label, Icon]) => <Link key={label} href={`/${activeCompany.slug}${href}`} className={`ff-nav-link ${pathname === `/${activeCompany.slug}${href}` ? "active" : ""}`}><span style={{ display: "flex", gap: 10, alignItems: "center" }}><Icon size={18} />{label}</span><ChevronRight size={14} /></Link>)}</div>)}</nav></aside>
    <section className="ff-main"><header className="ff-top"><div className="ff-top-inner"><div className="ff-top-row"><div className="ff-title"><div className="micro">{activeCompany.companyName} Manager</div><h2>{view === "dashboard" ? "Office board" : view[0].toUpperCase() + view.slice(1)}</h2><p>Manager-only controls for jobs, requests, staff permissions, assets, and inventory.</p></div><div className="ff-actions"><span className="nexus-sync-pill">{syncStatus}</span><Button variant="secondary" onClick={logout}><LogOut size={17}/> <span className="hide-mobile">Logout</span></Button>{view !== "dashboard" ? null : <Button onClick={() => openAdd("request")}><Plus /> Request</Button>}</div></div></div></header>
    <div className="ff-content"><div className="ff-controls"><input className="ff-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search truck, crew, job, material, person, location..." /><select className="ff-input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="all">All departments</option><option>Landscape / Construction</option><option>Mulch</option><option>Office</option><option>Maintenance</option></select><select className="ff-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option>Active</option><option>Scheduled</option><option>Available</option><option>In Use</option><option>Needs Service</option><option>Low</option><option>Open</option><option>Pending</option><option>Approved</option></select></div>
    {view === "dashboard" && <><div className="ff-kpis"><Kpi label="Active Jobs" value={jobs.filter((j) => j.status === "Active").length} /><Kpi label="Crews Working" value={new Set(staff.filter((p:any)=>p.status === "Active" && p.crew && p.crew !== "Admin").map((p:any)=>p.crew)).size} /><Kpi label="Equipment Available" value={equipment.filter((e) => e.status === "Available").length} /><Kpi label="Tools Ready" value={tools.filter((t) => t.status === "Available").length} /><Kpi label="Open Requests" value={requests.filter((r) => r.status === "Pending").length} /><Kpi label="Open Issues" value={issues.filter((i) => i.status === "Open").length} /></div><Panel title="Crew Requests" note="Approve, deny, complete, or delete requests from the crew portal." action={<Button onClick={() => openAdd("request")}><Plus /> Add Request</Button>}><div className="ff-grid">{requests.length ? requests.filter(pass).map((r) => <Card key={r.id} item={r} type="request" setDrawer={setDrawer} />) : <div className="ff-empty-box">No crew requests yet.</div>}</div></Panel><div className="ff-two"><Panel title="Needs Attention" note="Issues, low stock, and crew blockers."><div className="ff-grid">{issues.filter(pass).map((i) => <Card key={i.id} item={i} type="issue" setDrawer={setDrawer} />)}</div></Panel><Panel title="Available Equipment"><div className="ff-grid">{equipment.filter((e) => e.status === "Available").map((e) => <Card key={e.id} item={e} type="equipment" setDrawer={setDrawer} />)}</div></Panel></div><Panel title="Today’s Jobs"><div className="ff-grid">{jobs.filter(pass).map((j) => <Card key={j.id} item={j} type="job" setDrawer={setDrawer} />)}</div></Panel></>}
    {view === "work" && <Panel title="Jobs" action={<Button onClick={() => openAdd("job")}><Plus /> Add Job</Button>}><div className="ff-grid">{jobs.filter(pass).map((j) => <Card key={j.id} item={j} type="job" setDrawer={setDrawer} />)}</div></Panel>}
    {view === "equipment" && <Panel title="Equipment" action={<Button onClick={() => openAdd("equipment")}><Plus /> Add Equipment</Button>}><div className="ff-cats">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`ff-cat ${cat === c ? "active" : ""}`}>{c}</button>)}</div><div className="ff-grid">{fe.map((e) => <Card key={e.id} item={e} type="equipment" setDrawer={setDrawer} />)}</div></Panel>}
    {view === "tools" && <Panel title="Tools" note="Small tools, power tools, hardscape tools, layout kits, and crew hand tools." action={<Button onClick={() => openAdd("tool")}><Plus /> Add Tool</Button>}><div className="ff-cats">{toolCats.map((c) => <button key={c} onClick={() => setCat(c)} className={`ff-cat ${cat === c ? "active" : ""}`}>{c}</button>)}</div><div className="ff-grid">{ft.map((t) => <Card key={t.id} item={t} type="tool" setDrawer={setDrawer} />)}</div></Panel>}
    {view === "inventory" && <Panel title="Inventory" note="Broken into categories so the yard board is usable." action={<Button onClick={() => openAdd("inventory")}><Plus /> Add Item</Button>}><div className="ff-inventory-tabs">{inventoryCategories.map((c) => <button key={c} className={`ff-inventory-tab ${inventoryCategory === c ? "active" : ""}`} onClick={() => setInventoryCategory(c)}>{c}</button>)}</div><div className="ff-grid">{filteredInventory.map((i) => <Card key={i.id} item={i} type="inventory" setDrawer={setDrawer} />)}</div></Panel>}
    {view === "staff" && <Panel title="Staff + Crew Permissions" note="Add people, set roles, temp PINs, and manager permissions." action={<Button onClick={() => openAdd("staff")}><Plus /> Add Person</Button>}><div className="ff-staff-groups">{roles.map((role) => { const group = filteredStaff.filter((p: any) => p.role === role); if (!group.length) return null; return <section className="ff-staff-group" key={role}><div className="ff-staff-group-head"><h4>{role}</h4><Pill>{group.length}</Pill></div><div className="ff-grid">{group.map((person: any) => <Card key={person.id} item={person} type="staff" setDrawer={setDrawer} />)}</div></section>; })}</div></Panel>}
    {view === "issues" && <Panel title="Issues" action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button onClick={() => openAdd("issue")}><Plus /> Add Issue</Button><Button variant="secondary" onClick={() => setIssues((list) => list.filter((i) => i.status !== "Resolved"))}>Clear Resolved</Button></div>}><div className="ff-grid">{issues.filter(pass).map((i) => <Card key={i.id} item={i} type="issue" setDrawer={setDrawer} />)}</div></Panel>}
    </div></section></div>
    <aside className={`ff-drawer ${drawer ? "open" : ""}`}><div className="ff-drawer-head"><div><div className="ff-drawer-title">{drawer?.mode === "add" ? drawer?.title : edit?.name || edit?.title || edit?.item}</div><div className="micro">{drawer?.type} editor</div></div><Button variant="secondary" onClick={() => setDrawer(null)}><X /> Close</Button></div><div className="ff-drawer-body">{drawer && edit ? <div className="ff-edit-form">
      {drawer.type === "job" && <><Field label="Job name" value={edit.name} onChange={(v) => { patch("name", v); patch("title", v); }} /><Field label="Address" value={edit.address} onChange={(v) => patch("address", v)} /><SelectField label="Status" value={edit.status} onChange={(v) => patch("status", v)} options={["Scheduled", "Active", "Completed", "Paused"]} /><Field label="Department" value={edit.dept} onChange={(v) => patch("dept", v)} /><Field label="Crew" value={edit.crew} onChange={(v) => patch("crew", v)} /><Field label="ETA" value={edit.eta} onChange={(v) => patch("eta", v)} /><Field label="Tasks" value={edit.tasksText} textarea onChange={(v) => patch("tasksText", v)} /><Field label="Notes" value={edit.notesText} textarea onChange={(v) => patch("notesText", v)} /></>}
      {drawer.type === "equipment" && <><Field label="Name" value={edit.name} onChange={(v) => patch("name", v)} /><SelectField label="Category" value={edit.category} onChange={(v) => patch("category", v)} options={cats.filter((c) => c !== "All")} /><SelectField label="Status" value={edit.status} onChange={(v) => patch("status", v)} options={["Available", "In Use", "Needs Service"]} /><Field label="Assigned" value={edit.assigned} onChange={(v) => patch("assigned", v)} /><Field label="Location" value={edit.location} onChange={(v) => patch("location", v)} /><Field label="Available" value={edit.available} onChange={(v) => patch("available", v)} /><Field label="Notes" value={edit.notesText} textarea onChange={(v) => patch("notesText", v)} /></>}
      {drawer.type === "tool" && <><Field label="Tool name" value={edit.name} onChange={(v) => patch("name", v)} /><SelectField label="Category" value={edit.category} onChange={(v) => patch("category", v)} options={toolCats.filter((c) => c !== "All")} /><SelectField label="Status" value={edit.status} onChange={(v) => patch("status", v)} options={["Available", "In Use", "Needs Service"]} /><Field label="Assigned" value={edit.assigned} onChange={(v) => patch("assigned", v)} /><Field label="Location" value={edit.location} onChange={(v) => patch("location", v)} /><Field label="Available" value={edit.available} onChange={(v) => patch("available", v)} /><Field label="Notes" value={edit.notesText} textarea onChange={(v) => patch("notesText", v)} /></>}
      {drawer.type === "inventory" && <><Field label="Name" value={edit.name} onChange={(v) => patch("name", v)} /><SelectField label="Category" value={edit.category} onChange={(v) => patch("category", v)} options={inventoryCategories.filter((c) => c !== "All")} /><Field label="Qty" value={edit.qty} type="number" onChange={(v) => patch("qty", Number(v))} /><Field label="Unit" value={edit.unit} onChange={(v) => patch("unit", v)} /><SelectField label="Status" value={edit.status} onChange={(v) => patch("status", v)} options={["Good", "Low", "Out"]} /><Field label="Notes" value={edit.notesText} textarea onChange={(v) => patch("notesText", v)} /></>}
      {drawer.type === "issue" && <><Field label="Issue" value={edit.name} onChange={(v) => { patch("name", v); patch("title", v); }} /><SelectField label="Severity" value={edit.severity} onChange={(v) => patch("severity", v)} options={["Low", "Medium", "High"]} /><SelectField label="Status" value={edit.status} onChange={(v) => patch("status", v)} options={["Open", "Resolved"]} /><Field label="Owner" value={edit.owner} onChange={(v) => patch("owner", v)} /><Field label="Department" value={edit.dept} onChange={(v) => patch("dept", v)} /><Field label="Notes" value={edit.notesText} textarea onChange={(v) => patch("notesText", v)} /></>}
      {drawer.type === "staff" && <><Field label="Name" value={edit.name} onChange={(v) => patch("name", v)} /><SelectField label="Role" value={edit.role} onChange={(v) => patch("role", v)} options={roles} /><Field label="Crew" value={edit.crew} onChange={(v) => patch("crew", v)} /><SelectField label="Status" value={edit.status} onChange={(v) => patch("status", v)} options={["Active", "Inactive", "Available"]} /><Field label="Available" value={edit.available} onChange={(v) => patch("available", v)} /><Field label="One-time PIN" value={edit.tempPin ?? ""} onChange={(v) => patch("tempPin", v)} /><label className="ff-check-row"><input type="checkbox" checked={!!edit.mustChangePassword} onChange={(e) => patch("mustChangePassword", e.target.checked)} /> Force password change on first login</label><div className="ff-permission-grid">{permissions.map(([key, label]) => <label key={key} className="ff-permission-pill"><input type="checkbox" checked={(edit.permissions || []).includes(key)} onChange={() => togglePerm(key)} /> {label}</label>)}</div></>}
      {drawer.type === "request" && <><SelectField label="Request type" value={edit.kind} onChange={(v) => patch("kind", v)} options={["Equipment", "Material", "Help", "Repair", "Other"]} /><Field label="Item" value={edit.item} onChange={(v) => patch("item", v)} /><Field label="Requested by" value={edit.requestedBy} onChange={(v) => patch("requestedBy", v)} /><Field label="Crew" value={edit.crew} onChange={(v) => patch("crew", v)} /><SelectField label="Status" value={edit.status} onChange={(v) => patch("status", v)} options={["Pending", "Approved", "Denied", "Completed"]} /><Field label="Note" value={edit.note} textarea onChange={(v) => patch("note", v)} /><div className="ff-request-actions"><Button onClick={() => updateRequest(edit.id, "Approved")}><CheckCircle2 /> Approve</Button><Button variant="secondary" onClick={() => updateRequest(edit.id, "Completed")}>Complete</Button><Button variant="danger" onClick={() => updateRequest(edit.id, "Denied")}>Deny</Button></div></>}
      <div className="ff-drawer-actions"><Button onClick={saveEdit}><Save /> Save</Button><Button variant="danger" onClick={deleteItem}><Trash2 /> Delete</Button></div>
    </div> : null}</div></aside>
  </main>;
}
