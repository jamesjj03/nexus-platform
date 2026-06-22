import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/nexus/server/supabaseAdmin";
import { canReadCompany, getSessionFromRequest } from "@/lib/nexus/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const form = await request.formData();
  const slug = String(form.get("slug") || session?.slug || "");
  const file = form.get("file");
  const bucket = String(form.get("bucket") || "fieldflow-media");

  if (!canReadCompany(session, slug)) return NextResponse.json({ error: "Not signed into this company." }, { status: 401 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload file missing." }, { status: 400 });

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const path = `${slug}/${Date.now()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

