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

function normalizeSource(v: any): "typed" | "voice" {
  return v === "voice" ? "voice" : "typed";
}

function normalizePriority(v: any): string {
  const s = String(v ?? "").trim();
  return s || "Medium";
}

function normalizeSqft(v: any): number | null {
  if (v === "" || v === null || typeof v === "undefined") return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      company_context,
      transcript = null,
      audio_url = null,

      source = "typed", // "typed" | "voice"
      priority = "Medium",
      important = false,
      client_name = null,
      city = null,
      service_type = null,
      sqft = null,
      meta = null,
    } = body ?? {};

    // Required: company_context
    if (!company_context || !String(company_context).trim()) {
      return NextResponse.json(
        { error: "company_context is required" },
        { status: 400 }
      );
    }

    // Required: at least transcript OR audio_url
    const transcriptText = transcript === null ? "" : String(transcript);
    const hasTranscript = Boolean(transcriptText.trim());
    const hasAudioUrl = Boolean(String(audio_url ?? "").trim());

    if (!hasTranscript && !hasAudioUrl) {
      return NextResponse.json(
        { error: "Provide transcript or audio_url" },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    const sqftNum = normalizeSqft(sqft);

    const insertPayload = {
      company_context: String(company_context).trim(),

      // Transcript is optional now (audio-only logs allowed)
      transcript: hasTranscript ? transcriptText : null,

      audio_url: hasAudioUrl ? String(audio_url).trim() : null,

      source: normalizeSource(source),
      priority: normalizePriority(priority),
      important: Boolean(important),

      client_name: client_name ? String(client_name).trim() : null,
      city: city ? String(city).trim() : null,
      service_type: service_type ? String(service_type).trim() : null,
      sqft: sqftNum,

      meta: meta ?? {},

      // Give a useful summary even if transcript is empty
      job_summary: hasTranscript
        ? transcriptText.slice(0, 120)
        : hasAudioUrl
        ? "Audio log saved"
        : null,
    };

    const { data, error } = await supabase
      .from("job_logs")
      .insert(insertPayload)
      .select(
        "id, created_at, company_context, source, priority, important, client_name, city, service_type, sqft, transcript, audio_url"
      )
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
