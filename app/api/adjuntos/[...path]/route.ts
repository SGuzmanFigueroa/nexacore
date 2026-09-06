import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  await requireAdmin();
  const { path } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("core-adjuntos")
    .createSignedUrl(path.join("/"), 60);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No encontrado" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
