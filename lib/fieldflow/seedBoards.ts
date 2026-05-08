import { equipment as joesEquipment, jobs as joesJobs, tools as joesTools, crews as joesCrews } from "@/lib/v2Data";
import { categorizedInventory } from "@/lib/v2Additions";
import type { NexusBoardData } from "./liveStore";

const perms = ["edit_inventory", "edit_equipment", "edit_issues", "manage_staff", "approve_requests"];

function staffFromCrews(crews: any[], ownerName: string, managerName: string) {
  const staff: any[] = [];
  crews.forEach((crew: any) => {
    staff.push({ id: `${crew.id}-lead`, name: crew.lead, role: "Crew Lead", crew: crew.name, status: crew.status, available: crew.available, permissions: ["edit_inventory", "edit_equipment"] });
    (crew.people || []).forEach((person: string, index: number) => {
      staff.push({ id: `${crew.id}-${index}`, name: person, role: "Crew Member", crew: crew.name, status: crew.status, available: crew.available, permissions: [] });
    });
  });
  staff.push({ id: `${managerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-manager`, name: managerName, role: "Manager", crew: "Office", status: "Active", available: "Now", permissions: perms });
  staff.push({ id: `${ownerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-owner`, name: ownerName, role: "Owner", crew: "Admin", status: "Active", available: "Now", permissions: perms });
  return staff;
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

export function seedBoardForCompany(slug?: string): NexusBoardData {
  const clean = (slug || "joes").toLowerCase();
  if (clean.includes("gff") || clean.includes("fiber") || clean.includes("sales")) {
    return { jobs: gffJobs, equipment: gffEquipment, tools: gffTools, inventory: gffInventory, issues: [
      { id: "issue-gff-001", name: "Need clean territory notes", title: "Need clean territory notes", severity: "Medium", status: "Open", owner: "Sam", dept: "Sales", notes: ["Make every rep log no-answer, maybe, and sold consistently."] },
      { id: "issue-gff-002", name: "Door hanger stock low", title: "Door hanger stock low", severity: "Low", status: "Open", owner: "JJ", dept: "Sales", notes: ["Restock before the next out-of-town run."] },
    ], staff: staffFromCrews(gffCrews, "Sam", "JJ"), requests: [], checkouts: [] };
  }
  return { jobs: joesJobs, equipment: joesEquipment, tools: joesTools, inventory: categorizedInventory, issues: [], staff: staffFromCrews(joesCrews, "Joe", "Amanda"), requests: [], checkouts: [] };
}
