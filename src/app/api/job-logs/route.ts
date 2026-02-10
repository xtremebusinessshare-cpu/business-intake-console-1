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

    // Normalize sqft safely (handles "", null, undefined, "1200", 1200)
const sqftNum =
  sqft === "" || sqft === null || typeof sqft === "undefined"
    ? null
    : Number(String(sqft).replace(/[^\d.]/g, ""));

const { data, error } = await supabase
  .from("job_logs")
  .insert({
    company_context,
    transcript,
    source: source ?? "typed",
    priority: priority ?? null,
    important: important ?? false,
    client_name: client_name ?? null,
    city: city ?? null,
    service_type: service_type ?? null,
    sqft: sqft === "" || sqft === undefined ? null : sqft,
    meta: meta ?? {},
    job_summary: transcript ? String(transcript).slice(0, 120) : null,
  })
  .select("id, created_at")
  .single();

if (error) {
  console.error("JOB LOG INSERT ERROR:", error);
  return NextResponse.json({ error: error.message, details: error }, { status: 500 });
}

return NextResponse.json(
  { log: { id: data.id, created_at: data.created_at } },
  { status: 200 }
);




    // ✅ This is the key: return the inserted row INCLUDING ID
    return NextResponse.json({ log: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
