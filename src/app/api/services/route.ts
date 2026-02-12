import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const business = (searchParams.get("business") || "xes").toString();

    if (!["xes", "gxs", "exquisite_limo"].includes(business)) {
      return NextResponse.json({ error: "Invalid business" }, { status: 400 });
    }

    const supabase = supabasePublic();

    const { data, error } = await supabase
      .from("services_master")
      .select("id, label, service_name, unit, default_unit_price, category, sort_order")
      .eq("company_context", business)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("SERVICES FETCH ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ services: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
