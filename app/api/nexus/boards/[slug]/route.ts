import { NextResponse } from "next/server";
import { loadBoardServer, saveBoardServer } from "@/lib/nexus/server/data";
import { canManageCompany, canReadCompany, getSessionFromRequest } from "@/lib/nexus/server/session";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const session = await getSessionFromRequest(request);
  if (!canReadCompany(session, slug)) return NextResponse.json({ error: "Not signed into this company." }, { status: 401 });
  return NextResponse.json({ board: await loadBoardServer(slug) });
}

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const session = await getSessionFromRequest(request);
  if (!canManageCompany(session, slug)) return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  const body = await request.json();
  return NextResponse.json({ board: await saveBoardServer(slug, body.board || body) });
}

