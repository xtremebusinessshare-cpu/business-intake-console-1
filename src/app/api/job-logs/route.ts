import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const body = await req.json();

    const company_context = (body?.company_context ?? "").toString();
    const transcript = (body?.transcript ?? "").toString();

    if (!company_context || !transcript.trim()) {
      return NextResponse.json(
        { error: "company_context and transcript are required." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("job_logs").insert({
      company_context,
      source: "voice",
      transcript,
      job_summary: transcript.slice(0, 120),
    });

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
