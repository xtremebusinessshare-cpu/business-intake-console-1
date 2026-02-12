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

// GET /api/job-logs/:id  -> returns log at top-level (your quote prefill expects this)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("job_logs")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Log not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// PATCH /api/job-logs/:id  body: { status: "archived" | "logged" }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const status = body?.status;

    if (!params?.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (status !== "archived" && status !== "logged") {
      return NextResponse.json(
        { error: "Invalid status. Use 'archived' or 'logged'." },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("job_logs")
      .update({ status })
      .eq("id", params.id)
      .select("id,status")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ log: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-logs/:id  -> permanently deletes a log
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!params?.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { error } = await supabase.from("job_logs").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
