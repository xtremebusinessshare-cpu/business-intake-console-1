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

type IncomingLine = {
  id?: string;
  name?: string; // UI uses name; DB uses service_category / extra_type
  service_category?: string;
  extra_type?: string;
  unit?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  estimated_amount?: number;
  lineTotal?: number;
};

function toNumber(x: any, fallback = 0) {
  const n = typeof x === "string" ? Number(x) : typeof x === "number" ? x : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// ---------- Quote number helpers ----------
function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function yyyymmddUTC(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function businessCode(companyContext: string) {
  if (companyContext === "xes") return "XES";
  if (companyContext === "gxs") return "GXS";
  if (companyContext === "exquisite_limo") return "ELT"; // ✅ per your choice
  return "BIZ";
}

async function generateNextQuoteNumber(supabase: ReturnType<typeof supabaseAdmin>, company_context: string) {
  const biz = businessCode(company_context);
  const day = yyyymmddUTC();
  const prefix = `BIC-${biz}-${day}-`;

  // Find latest for this prefix
  const { data: last, error: lastErr } = await supabase
    .from("quotes")
    .select("quote_number")
    .like("quote_number", `${prefix}%`)
    .order("quote_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastErr) throw lastErr;

  let nextSeq = 1;
  if (last?.quote_number) {
    const tail = String(last.quote_number).replace(prefix, "");
    const n = Number(tail);
    if (Number.isFinite(n) && n > 0) nextSeq = n + 1;
  }

  return { prefix, nextSeq, quote_number: `${prefix}${pad4(nextSeq)}` };
}

async function assignQuoteNumberWithRetry(
  supabase: ReturnType<typeof supabaseAdmin>,
  quoteId: string,
  company_context: string
) {
  // If you ever re-run, don’t overwrite an existing quote_number.
  const { data: existing } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("id", quoteId)
    .maybeSingle();

  if (existing?.quote_number) return existing.quote_number as string;

  const { prefix, nextSeq } = await generateNextQuoteNumber(supabase, company_context);

  // Try a few times in case two quotes are created at the same time.
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${prefix}${pad4(nextSeq + attempt)}`;

    const { error: upErr } = await supabase
      .from("quotes")
      .update({ quote_number: candidate })
      .eq("id", quoteId);

    if (!upErr) return candidate;

    // If it's a unique constraint conflict, try next number.
    // Supabase error messages vary; we do a safe string check.
    const msg = String((upErr as any)?.message ?? "");
    const isUniqueConflict =
      msg.toLowerCase().includes("duplicate") ||
      msg.toLowerCase().includes("unique") ||
      msg.toLowerCase().includes("quote_number");

    if (!isUniqueConflict) throw upErr;
  }

  throw new Error("Could not assign a unique quote_number after multiple attempts.");
}

export async function POST(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const body = await req.json();

    // --- Core quote fields ---
    const status = (body?.status ?? "NEW") as string;

    // UI sends business; DB uses company_context
    const company_context = (body?.business ?? body?.company_context ?? null) as string | null;
    if (!company_context) {
      return NextResponse.json({ error: "business/company_context is required" }, { status: 400 });
    }

    // UI sends estimateType; DB uses estimate_type
    const estimate_type = (body?.estimateType ?? body?.estimate_type) as string | undefined;
    if (!estimate_type) {
      return NextResponse.json({ error: "estimateType is required" }, { status: 400 });
    }

    const client_name = (body?.clientName ?? body?.client_name ?? null) as string | null;
    const notes = (body?.notes ?? null) as string | null;

    // Totals (UI sends totals.servicesSubtotal, totals.addonsSubtotal, totals.total)
    const totals = body?.totals ?? {};
    const subtotal_services = toNumber(body?.subtotal_services ?? totals?.servicesSubtotal, 0);
    const subtotal_addons = toNumber(body?.subtotal_addons ?? totals?.addonsSubtotal, 0);

    const estimated_total = toNumber(
      body?.estimated_total ?? totals?.total ?? body?.total,
      subtotal_services + subtotal_addons
    );

    const subtotal = toNumber(body?.subtotal, subtotal_services + subtotal_addons);
    const total = toNumber(body?.total, estimated_total);

    const disclaimer_text =
      (body?.disclaimerText ??
        body?.disclaimer_text ??
        "This is a preliminary estimate only, not a final invoice/contract. Final pricing may change after inspection and scope confirmation.") as
        | string
        | null;

    const disclaimer_version = (body?.disclaimerVersion ?? body?.disclaimer_version ?? "v1") as
      | string
      | null;

    // --- Metadata stored in quotes.addons (jsonb) ---
    const meta: Record<string, any> = {
      estimate_context: {
        company_context,
        estimate_type,
        status,
      },
    };

    if (body?.jobAddress) meta.job_address = body.jobAddress;
    if (body?.lossType) meta.loss_type = body.lossType;

    if (body?.limo && typeof body.limo === "object") meta.limo = body.limo;

    // --- Normalize services & addons arrays ---
    const rawServices: IncomingLine[] = Array.isArray(body?.services) ? body.services : [];
    const rawAddons: IncomingLine[] = Array.isArray(body?.addons) ? body.addons : [];

    const limoVehicleType = body?.limo?.vehicleType ?? null;
    const limoPassengerCount =
      typeof body?.limo?.passengers === "number" ? body.limo.passengers : null;

    const services = rawServices
      .map((s) => {
        const service_category = (s?.service_category ?? s?.name ?? "").toString().trim();
        const unit = (s?.unit ?? "").toString().trim();
        const quantity = toNumber(s?.quantity ?? s?.qty, 0);
        const unitPrice = toNumber(s?.unitPrice, 0);
        const estimated_amount = toNumber(
          s?.estimated_amount ?? s?.lineTotal,
          quantity * unitPrice
        );

        return {
          service_category,
          unit,
          quantity,
          estimated_amount,
          vehicle_type: limoVehicleType,
          passenger_count: limoPassengerCount,
        };
      })
      .filter((s) => s.service_category.length > 0 && s.unit.length > 0 && s.quantity > 0);

    if (services.length < 1) {
      return NextResponse.json(
        { error: "At least one valid service line item is required." },
        { status: 400 }
      );
    }

    const addons = rawAddons
      .map((a) => {
        const extra_type = (a?.extra_type ?? a?.name ?? "").toString().trim();
        const unit = (a?.unit ?? "").toString().trim();
        const quantity = toNumber(a?.quantity ?? a?.qty, 0);
        const unitPrice = toNumber(a?.unitPrice, 0);
        const estimated_amount = toNumber(
          a?.estimated_amount ?? a?.lineTotal,
          quantity * unitPrice
        );

        return { extra_type, unit, quantity, estimated_amount };
      })
      .filter((a) => a.extra_type.length > 0 && a.unit.length > 0 && a.quantity > 0);

    // --- Call RPC (single transaction that creates quote + items) ---
    const { data: quoteId, error } = await supabase.rpc("create_quote_with_items", {
      p_quote: {
        estimate_type,
        client_name,
        notes,
        status,
        company_context,
        subtotal,
        total,
        estimated_total,
        subtotal_services,
        subtotal_addons,
        disclaimer_text,
        disclaimer_version,
        addons: meta, // jsonb metadata stored in quotes.addons column
      },
      p_services: services,
      p_addons: addons,
    });

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    // ✅ Assign BIC quote number AFTER creation (no RPC changes required)
    const quote_number = await assignQuoteNumberWithRetry(
      supabase,
      String(quoteId),
      company_context
    );

    return NextResponse.json({ id: quoteId, quote_number }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
