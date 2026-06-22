import { equipment as joesEquipment, jobs as joesJobs, tools as joesTools, crews as joesCrews } from "@/lib/v2Data";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { categorizedInventory } from "@/lib/v2Additions";
import type { NexusBoardData } from "./liveStore";

const companyAdminPerms = ["manage_company_admins", "manage_managers", "manage_staff", "approve_requests", "edit_jobs", "edit_inventory", "edit_equipment", "edit_issues", "post_messages"];
const managerPerms = ["manage_staff", "approve_requests", "edit_jobs", "edit_inventory", "edit_equipment", "edit_issues", "post_messages"];
const leadPerms = ["approve_requests", "edit_jobs", "edit_inventory", "edit_equipment", "post_messages"];
const crewPerms = ["request_assets", "upload_media", "post_messages"];

function id(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function firstPassword(name: string) { return name.trim().split(/\s+/)[0].toLowerCase(); }
function staff(name: string, role: string, crew: string, dept: string, pin: string, accessLevel: string, permissions: string[], includeCredentials = false) {
  const person = { id: id(name), name, role, crew, dept, status: "Active", available: "Now", accessLevel, permissions };
  return includeCredentials ? { ...person, pin, tempPin: pin, password: firstPassword(name), mustChangePassword: true } : person;
}

const joesStaff = [
  staff("Chad", "Company Admin", "Office", "Office", "5100", "company_admin", companyAdminPerms),
  staff("Jeanette", "Office Manager", "Office", "Office", "5101", "company_admin", companyAdminPerms),
  staff("Jamie", "Office Manager", "Office", "Office", "5102", "company_admin", companyAdminPerms),
  staff("Bill", "Manager", "Management", "Operations", "5103", "manager", managerPerms),
  staff("Jose", "Crew Lead", "Jose's Crew", "Landscape / Construction", "5201", "crew_lead", leadPerms),
  staff("Justin", "Crew Lead", "Justin's Crew", "Maintenance", "5202", "crew_lead", leadPerms),
  staff("Lil Chad", "Crew Lead", "Lil Chad's Crew", "Mulch", "5203", "crew_lead", leadPerms),
  staff("Jim", "Crew Lead", "Jim's Crew", "Landscape / Construction", "5204", "crew_lead", leadPerms),
  staff("Pimpon", "Crew Member", "Jose's Crew", "Landscape / Construction", "5301", "crew", crewPerms),
  staff("Angel", "Crew Member", "Jose's Crew", "Landscape / Construction", "5302", "crew", crewPerms),
  staff("Moises", "Crew Member", "Jose's Crew", "Landscape / Construction", "5303", "crew", crewPerms),
  staff("Jacob", "Crew Member", "Justin's Crew", "Maintenance", "5304", "crew", crewPerms),
  staff("Ethan", "Crew Member", "Justin's Crew", "Maintenance", "5305", "crew", crewPerms),
  staff("Taylor", "Greenhouse Lead", "Greenhouse", "Greenhouse", "5205", "manager", [...leadPerms, "manage_departments"]),
  staff("Wes", "Maintenance", "Maintenance", "Maintenance", "5306", "crew", crewPerms),
  staff("Brandon", "Maintenance", "Maintenance", "Maintenance", "5307", "crew", crewPerms),
  staff("Austin", "Maintenance", "Maintenance", "Maintenance", "5308", "crew", crewPerms),
];

const joesCrewsClean = [
  { id: "crew-office", name: "Office", status: "Active", lead: "Chad", people: ["Jeanette", "Jamie"], available: "Now", dept: "Office", notes: ["Scheduling, quotes, billing, and company admin."] },
  { id: "crew-management", name: "Management", status: "Active", lead: "Bill", people: [], available: "Now", dept: "Operations", notes: ["Daily field manager oversight."] },
  { id: "crew-jose", name: "Jose's Crew", status: "Active", lead: "Jose", people: ["Pimpon", "Angel", "Moises"], available: "Now", dept: "Landscape / Construction", notes: ["Construction, grading, hardscape, excavation support."] },
  { id: "crew-justin", name: "Justin's Crew", status: "Active", lead: "Justin", people: ["Jacob", "Ethan"], available: "Now", dept: "Maintenance", notes: ["Commercial route and equipment checks."] },
  { id: "crew-lil-chad", name: "Lil Chad's Crew", status: "Active", lead: "Lil Chad", people: [], available: "Now", dept: "Mulch", notes: ["Mulch and cleanup jobs."] },
  { id: "crew-jim", name: "Jim's Crew", status: "Active", lead: "Jim", people: [], available: "Now", dept: "Landscape / Construction", notes: ["General install and landscape support."] },
  { id: "crew-greenhouse", name: "Greenhouse", status: "Active", lead: "Taylor", people: [], available: "Now", dept: "Greenhouse", notes: ["Plants, greenhouse inventory, plant care, and seasonal material staging."] },
  { id: "crew-maintenance", name: "Maintenance", status: "Active", lead: "Wes", people: ["Brandon", "Austin"], available: "Now", dept: "Maintenance", notes: ["Equipment upkeep, shop support, fixes, and odd jobs."] },
];

function staffFromCrews(crews: any[], ownerName: string, managerName: string, includeCredentials = false) {
  const staffList: any[] = [];
  crews.forEach((crew: any, crewIndex: number) => {
    staffList.push(staff(crew.lead, crewIndex === 0 ? "Company Admin" : "Crew Lead", crew.name, crew.dept || "Operations", String(6100 + crewIndex), crewIndex === 0 ? "company_admin" : "crew_lead", crewIndex === 0 ? companyAdminPerms : leadPerms, includeCredentials));
    (crew.people || []).forEach((person: string, index: number) => staffList.push(staff(person, "Crew Member", crew.name, crew.dept || "Operations", String(6200 + crewIndex * 10 + index), "crew", crewPerms, includeCredentials)));
  });
  staffList.push(staff(managerName, "Manager", "Office", "Office", "6001", "manager", managerPerms, includeCredentials));
  staffList.push(staff(ownerName, "Company Admin", "Admin", "Admin", "6000", "company_admin", companyAdminPerms, includeCredentials));
  return staffList;
}

const gffCrews = [
  { id: "crew-sam", name: "Sam's Sales Team", status: "Active", lead: "Sam", people: ["JJ", "Christian"], available: "Knocking today", dept: "Sales", notes: ["Main fiber sales crew."] },
  { id: "crew-zach", name: "Zach's Route", status: "Active", lead: "Zach", people: ["Chris", "Jacob"], available: "Afternoon", dept: "Sales", notes: ["Follow-ups and territory cleanup."] },
  { id: "crew-dylan", name: "Dylan Support", status: "Available", lead: "Dylan", people: ["Julian"], available: "As needed", dept: "Sales", notes: ["Backup canvassing and ride-alongs."] },
];

const gffJobs = [
  { id: "lead-001", name: "Oakwood fiber pass", title: "Oakwood fiber pass", address: "Oakwood blocks 12-18", status: "Active", dept: "Sales", crew: "Sam's Sales Team", eta: "Today 4:00 PM", tasks: ["Knock greenlit homes", "Log objections", "Follow up hot leads"], notes: ["Lead with fiber vs cable reliability."] },
  { id: "lead-002", name: "Kettering follow-ups", title: "Kettering follow-ups", address: "Kettering south route", status: "Scheduled", dept: "Sales", crew: "Zach's Route", eta: "Tomorrow 5:30 PM", tasks: ["Revisit maybes", "Check install windows", "Confirm current bill"], notes: ["Bring pricing sheet and iPad visual."] },
  { id: "lead-003", name: "Beavercreek new build sweep", title: "Beavercreek new build sweep", address: "Beavercreek development", status: "Active", dept: "Sales", crew: "Dylan Support", eta: "Today 6:00 PM", tasks: ["Verify availability", "Mark no-solicit homes", "Capture callback numbers"], notes: ["Keep notes clean for manager review."] },
];

const gffEquipment = [
  { id: "sales-kit-001", name: "JJ iPad 9th Gen", category: "Sales Kit", status: "In Use", assigned: "JJ", location: "Field", available: "Today", dept: "Sales", notes: ["Nexus pitch board and savings calculator."] },
  { id: "sales-kit-002", name: "Sam iPad", category: "Sales Kit", status: "Available", assigned: "Sam", location: "Office", available: "Now", dept: "Sales", notes: ["Backup for rep demos."] },
  { id: "hotspot-001", name: "Mobile Hotspot", category: "Connectivity", status: "Available", assigned: "None", location: "Sales bag", available: "Now", dept: "Sales", notes: ["Use when cell service gets sketchy."] },
  { id: "car-001", name: "Team Vehicle", category: "Vehicle", status: "In Use", assigned: "Sam's Sales Team", location: "Route", available: "After shift", dept: "Sales", notes: ["Keep charger and pitch materials inside."] },
];

const gffTools = [
  { id: "tool-clipboard", name: "Backup Clipboard", category: "Sales Materials", status: "Available", assigned: "None", location: "Sales bag", available: "Now", dept: "Sales", notes: ["For paper backup if app/network fails."] },
  { id: "tool-battery", name: "Portable Battery Pack", category: "Power", status: "Available", assigned: "JJ", location: "Field bag", available: "Now", dept: "Sales", notes: ["Charge before every trip."] },
  { id: "tool-doorhanger", name: "Door Hanger Pack", category: "Sales Materials", status: "Low", assigned: "Sam", location: "Vehicle", available: "Now", dept: "Sales", notes: ["Restock after next team run."] },
];

const gffInventory = [
  { id: "inv-flyers", name: "Fiber flyers", category: "Sales Materials", qty: 85, unit: "sheets", status: "Good", dept: "Sales", notes: ["Use for not-home doors."] },
  { id: "inv-cards", name: "Rep contact cards", category: "Sales Materials", qty: 40, unit: "cards", status: "Good", dept: "Sales", notes: ["Leave with interested homeowners."] },
  { id: "inv-visa", name: "$100 Visa promo reminders", category: "Promo", qty: 25, unit: "cards", status: "Low", dept: "Sales", notes: ["Only use when promo applies."] },
  { id: "inv-wifi", name: "Wi-Fi extender talking points", category: "Training", qty: 1, unit: "script", status: "Good", dept: "Sales", notes: ["Explain as coverage, not random add-on."] },
];

export function seedBoardForCompany(slug?: string, options: { includeCredentials?: boolean } = {}): NexusBoardData {
  const clean = (slug || "joes").toLowerCase();
  const includeCredentials = options.includeCredentials === true;
  if (clean.includes("gff") || clean.includes("fiber") || clean.includes("sales")) {
    return { jobs: gffJobs, equipment: gffEquipment, tools: gffTools, inventory: gffInventory, issues: [
      { id: "issue-gff-001", name: "Need clean territory notes", title: "Need clean territory notes", severity: "Medium", status: "Open", owner: "Sam", dept: "Sales", notes: ["Make every rep log no-answer, maybe, and sold consistently."] },
      { id: "issue-gff-002", name: "Door hanger stock low", title: "Door hanger stock low", severity: "Low", status: "Open", owner: "JJ", dept: "Sales", notes: ["Restock before the next out-of-town run."] },
    ], staff: staffFromCrews(gffCrews, "Sam", "JJ", includeCredentials), crews: gffCrews, messages: [], requests: [], checkouts: [] };
  }
  const joesStaffClean = includeCredentials ? [
    staff("Chad", "Company Admin", "Office", "Office", "5100", "company_admin", companyAdminPerms, true),
    staff("Jeanette", "Office Manager", "Office", "Office", "5101", "company_admin", companyAdminPerms, true),
    staff("Jamie", "Office Manager", "Office", "Office", "5102", "company_admin", companyAdminPerms, true),
    staff("Bill", "Manager", "Management", "Operations", "5103", "manager", managerPerms, true),
    staff("Jose", "Crew Lead", "Jose's Crew", "Landscape / Construction", "5201", "crew_lead", leadPerms, true),
    staff("Justin", "Crew Lead", "Justin's Crew", "Maintenance", "5202", "crew_lead", leadPerms, true),
    staff("Lil Chad", "Crew Lead", "Lil Chad's Crew", "Mulch", "5203", "crew_lead", leadPerms, true),
    staff("Jim", "Crew Lead", "Jim's Crew", "Landscape / Construction", "5204", "crew_lead", leadPerms, true),
    staff("Pimpon", "Crew Member", "Jose's Crew", "Landscape / Construction", "5301", "crew", crewPerms, true),
    staff("Angel", "Crew Member", "Jose's Crew", "Landscape / Construction", "5302", "crew", crewPerms, true),
    staff("Moises", "Crew Member", "Jose's Crew", "Landscape / Construction", "5303", "crew", crewPerms, true),
    staff("Jacob", "Crew Member", "Justin's Crew", "Maintenance", "5304", "crew", crewPerms, true),
    staff("Ethan", "Crew Member", "Justin's Crew", "Maintenance", "5305", "crew", crewPerms, true),
    staff("Taylor", "Greenhouse Lead", "Greenhouse", "Greenhouse", "5205", "manager", [...leadPerms, "manage_departments"], true),
    staff("Wes", "Maintenance", "Maintenance", "Maintenance", "5306", "crew", crewPerms, true),
    staff("Brandon", "Maintenance", "Maintenance", "Maintenance", "5307", "crew", crewPerms, true),
    staff("Austin", "Maintenance", "Maintenance", "Maintenance", "5308", "crew", crewPerms, true),
  ] : joesStaff;
  return {
    jobs: joesJobs.map((j:any) => j.crew === "Chad's Crew" ? { ...j, crew: "Lil Chad's Crew" } : j),
    equipment: joesEquipment,
    tools: joesTools,
    inventory: categorizedInventory,
    issues: [],
    staff: joesStaffClean,
    crews: joesCrewsClean,
    messages: [
      { id: "msg-welcome", title: "Morning board", body: "Use requests for exact equipment/tools and tag the job when it belongs to one.", audience: "All", author: "Chad", createdAt: new Date().toISOString() }
    ],
    requests: [],
    checkouts: []
  };
}
