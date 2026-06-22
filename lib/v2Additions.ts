/* eslint-disable @typescript-eslint/no-explicit-any */

import { inventory as seedInventory } from "@/lib/v2Data";

export const inventoryCategories = [
  "All",
  "Mulch",
  "Stone",
  "Soil",
  "Seed / Fertilizer",
  "Fuel / Fluids",
  "Irrigation",
  "Safety",
  "Shop Supplies",
  "Small Tools",
  "Other",
];

function inferCategory(item: any): string {
  const text = `${item?.name ?? ""} ${item?.type ?? ""} ${item?.unit ?? ""}`.toLowerCase();

  if (text.includes("mulch")) return "Mulch";
  if (text.includes("stone") || text.includes("gravel") || text.includes("rock")) return "Stone";
  if (text.includes("soil") || text.includes("topsoil") || text.includes("dirt")) return "Soil";
  if (text.includes("seed") || text.includes("fertilizer") || text.includes("straw")) return "Seed / Fertilizer";
  if (text.includes("fuel") || text.includes("gas") || text.includes("oil") || text.includes("fluid")) return "Fuel / Fluids";
  if (text.includes("pipe") || text.includes("sprinkler") || text.includes("irrigation")) return "Irrigation";
  if (text.includes("glove") || text.includes("cone") || text.includes("vest") || text.includes("safety")) return "Safety";
  if (text.includes("bag") || text.includes("tape") || text.includes("battery") || text.includes("blade")) return "Shop Supplies";
  if (text.includes("tool") || text.includes("trimmer") || text.includes("shovel") || text.includes("rake")) return "Small Tools";

  return item?.category || "Other";
}

export const categorizedInventory = (seedInventory || []).map((item: any, index: number) => ({
  id: item.id ?? `inventory-${index + 1}`,
  name: item.name ?? "Inventory Item",
  qty: typeof item.qty === "number" ? item.qty : Number(item.quantity ?? 0),
  unit: item.unit ?? "each",
  status: item.status ?? "Good",
  category: item.category ?? inferCategory(item),
  notes: Array.isArray(item.notes)
    ? item.notes
    : item.notes
      ? [item.notes]
      : [`${item.name ?? "Item"} inventory record.`],
  ...item,
}));
