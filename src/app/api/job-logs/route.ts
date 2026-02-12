import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      company_context,
      transcript,
      source = "typed", // "typed" | "voice"
      priority = "Medium",
      important = false,
      client_name = null,
      city = null,
      service_type = null,
      sqft = null,
      meta = null,
      audio_url = null,
    } = body ?? {};

    if (!company_context || !String(company_context).trim()) {
      return NextResponse.json({ error: "company_context is required" }, { status: 400 });
    }

    if (!transcript || !String(transcript).trim()) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }

    // Normalize sqft safely: "", null, undefined => null; otherwise numeric
    const sqftNum =
      sqft === "" || sqft === null || typeof sqft === "undefined"
        ? null
        : Number(String(sqft).replace(/[^\d.]/g, ""));

    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("job_logs")
      .insert({
        company_context,
        transcript,
        source,
        priority,
        important,
        client_name,
        city,
        service_type,
        sqft: Number.isFinite(sqftNum as number) ? (sqftNum as number) : null,
        meta: meta ?? {},
        audio_url: audio_url ?? null,
        job_summary: String(transcript).slice(0, 120),
      })
      // return enough data for UI + convert-to-quote
      .select("id, created_at, company_context, source, priority, important, client_name, city, service_type, sqft, transcript")
      .single();

    if (error) {
      console.error("JOB LOG INSERT ERROR:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ log: data }, { status: 200 });
  } catch (e: any) {
    console.error("JOB LOG POST ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
