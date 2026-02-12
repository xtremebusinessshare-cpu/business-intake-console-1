import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

const ALLOWED_BUSINESSES = new Set(["xes", "gxs", "exquisite_limo"]);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const business = (searchParams.get("business") || "").toLowerCase().trim();

    if (!business || !ALLOWED_BUSINESSES.has(business)) {
      return NextResponse.json(
        { error: "Invalid business. Use xes, gxs, or exquisite_limo." },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    /**
     * IMPORTANT:
     * This assumes your price book table is named: price_book
     * and has at least:
     *  - id
     *  - company_context (xes/gxs/exquisite_limo)
     *  - label (what user sees) OR service_name
     *  - unit
     *  - default_unit_price
     *
     * If your table name is different, change "price_book" below.
     */
    const { data, error } = await supabase
      .from("price_book")
      .select("id,label,service_name,unit,default_unit_price,category,company_context")
      .eq("company_context", business)
      .order("label", { ascending: true });

    if (error) {
      console.error("SERVICES API SUPABASE ERROR:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ services: data ?? [] }, { status: 200 });
  } catch (e: any) {
    console.error("SERVICES API ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
