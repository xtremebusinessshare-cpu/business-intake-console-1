import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeSource(x: any): "typed" | "voice" {
  return x === "voice" ? "voice" : "typed";
}

export async function POST(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const body = await req.json();

    const company_context = body?.company_context ?? null;
    const transcript = (body?.transcript ?? "").toString();
    const source = normalizeSource(body?.source);

    if (!company_context) {
      return NextResponse.json({ error: "company_context is required." }, { status: 400 });
    }
    if (!transcript.trim()) {
      return NextResponse.json({ error: "transcript is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("job_logs")
      .insert({
        company_context,
        transcript,
        source, // ✅ use the incoming value (typed/voice)
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ log: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
