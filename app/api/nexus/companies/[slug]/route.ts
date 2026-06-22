import { NextResponse } from "next/server";
import { deleteCompanyServer } from "@/lib/nexus/server/data";
import { canManageStudio, getSessionFromRequest } from "@/lib/nexus/server/session";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!canManageStudio(session)) return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const { slug } = await context.params;
  await deleteCompanyServer(slug);
  return NextResponse.json({ ok: true });
}

