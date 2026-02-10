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
    const body = await req.json();

    // These are the fields your frontend should send
    const {
      company_context,
      transcript,
      priority = "normal",
      important = false,
      client_name = null,
      city = null,
      service_type = null,
      sqft = null,
      source = "typed",
      meta = null,
    } = body ?? {};

    // Hard fail if required fields are missing
    if (!company_context || !transcript) {
      return NextResponse.json(
        { error: "company_context and transcript are required" },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    // Insert into the CORRECT table: job_logs
    const { data, error } = await supabase
      .from("job_logs")
      .insert({
        company_context,
        transcript,
        priority,
        important,
        client_name,
        city,
        service_type,
        sqft: sqft === "" ? null : sqft,
        source,
        meta,
      })
      .select("*")     // IMPORTANT: this makes Supabase return the inserted row
      .single();       // IMPORTANT: ensures `data` is a single object

    // If Supabase failed, return an error (do NOT pretend success)
    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    // ✅ This is the key: return the inserted row INCLUDING ID
    return NextResponse.json({ log: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
