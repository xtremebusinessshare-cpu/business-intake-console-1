import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function safeName(name: string) {
  // keep it simple + safe for storage paths
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function POST(req: Request) {
  try {
    const supabase = supabaseAdmin();

    const form = await req.formData();

    const file = form.get("file") as File | null;
    const company_context = String(form.get("company_context") ?? "").trim();
    const uploader_note = String(form.get("uploader_note") ?? "").trim() || null;

    const related_job_log_id_raw = String(form.get("related_job_log_id") ?? "").trim();
    const related_quote_id_raw = String(form.get("related_quote_id") ?? "").trim();

    const related_job_log_id = related_job_log_id_raw || null;
    const related_quote_id = related_quote_id_raw || null;

    if (!company_context) {
      return NextResponse.json({ error: "company_context is required" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const bucket = "job-audio"; // <-- you said you created this bucket
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");

    const originalName = safeName(file.name || "upload");
    const path = `${company_context}/${yyyy}-${mm}-${dd}/${Date.now()}_${originalName}`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("STORAGE UPLOAD ERROR:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const public_url = pub?.publicUrl;

    if (!public_url) {
      return NextResponse.json({ error: "Could not generate public URL" }, { status: 500 });
    }

    const { data: row, error: insertError } = await supabase
      .from("receipts")
      .insert({
        company_context,
        uploader_note,
        file_name: originalName,
        file_path: path,
        public_url,
        mime_type: file.type || null,
        file_size: typeof file.size === "number" ? file.size : null,
        related_job_log_id,
        related_quote_id,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("RECEIPTS INSERT ERROR:", insertError);
      return NextResponse.json({ error: insertError.message, details: insertError }, { status: 500 });
    }

    return NextResponse.json({ receipt: row }, { status: 200 });
  } catch (e: any) {
    console.error("RECEIPTS POST ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
