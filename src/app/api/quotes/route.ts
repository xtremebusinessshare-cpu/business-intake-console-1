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

export async function POST(req: Request) {
  try {
    const supabase = supabaseAdmin();


    const body = await req.json();

    // --- Core quote fields ---
    const status = (body?.status ?? "NEW") as string;

    // UI sends business; your DB uses company_context
    const company_context = (body?.business ?? body?.company_context ?? null) as string | null;

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
    // This is NOT the same as add-on line items; those go into quote_addons/limo_addons.
    const meta: Record<string, any> = {
      estimate_context: {
        company_context,
        estimate_type,
        status,
      },
    };

    // Optional contextual fields from UI
    if (body?.jobAddress) meta.job_address = body.jobAddress;
    if (body?.lossType) meta.loss_type = body.lossType;

    // Limo-specific metadata (because your quotes table doesn't have pickup/dropoff/date/time columns)
    if (body?.limo && typeof body.limo === "object") meta.limo = body.limo;

    // --- Normalize services & addons arrays ---
    const rawServices: IncomingLine[] = Array.isArray(body?.services) ? body.services : [];
    const rawAddons: IncomingLine[] = Array.isArray(body?.addons) ? body.addons : [];

    // If limo, push vehicle_type/passenger_count into each service record
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

    // --- Call RPC (single transaction, auto routes to limo tables if company_context = exquisite_limo) ---
    const { data, error } = await supabase.rpc("create_quote_with_items", {
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

    return NextResponse.json({ id: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
