import { createClient } from "@supabase/supabase-js";

//////////////////////////////////////////////////////
// SUPABASE CLIENT (Browser / anon)
//////////////////////////////////////////////////////

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

//////////////////////////////////////////////////////
// TYPES
//////////////////////////////////////////////////////

export type QuoteStatus =
  | "NEW"
  | "REVIEWING"
  | "APPROVED"
  | "CONVERTED"
  | "CLOSED";

export type Quote = {
  id: string;
  company_context: string | null;
  estimate_type: string;
  client_name?: string | null;
  notes?: string | null;
  status: QuoteStatus;
  created_at: string;

  estimated_total?: number | null;
  subtotal_services?: number | null;
  subtotal_addons?: number | null;
  subtotal?: number | null;
  total?: number | null;

  disclaimer_text?: string | null;
  disclaimer_version?: string | null;

  // jsonb meta stored in quotes.addons (your current approach)
  addons?: any | null;
};

type SaveQuotePayload = {
  // required
  company_context: string; // "xes" | "gxs" | "exquisite_limo"
  estimate_type: string;

  // optional
  client_name?: string | null;
  notes?: string | null;

  subtotal_services: number;
  subtotal_addons: number;
  estimated_total: number;

  // disclaimer
  disclaimer_text: string;
  disclaimer_version: string;

  // line items (use flexible keys; API route normalizes)
  services: any[];
  addons: any[];

  // optional meta (stored into quotes.addons jsonb by API route)
  meta?: any;
};

//////////////////////////////////////////////////////
// SAVE QUOTE (Client -> Server API Route)
// ✅ This avoids RLS issues and routes limo/non-limo tables correctly.
//////////////////////////////////////////////////////

export async function saveQuote(payload: SaveQuotePayload) {
  const res = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "NEW",
      business: payload.company_context,
      estimateType: payload.estimate_type,

      clientName: payload.client_name ?? null,
      notes: payload.notes ?? null,

      services: payload.services ?? [],
      addons: payload.addons ?? [],

      totals: {
        servicesSubtotal: payload.subtotal_services,
        addonsSubtotal: payload.subtotal_addons,
        total: payload.estimated_total,
      },

      disclaimerText: payload.disclaimer_text,
      disclaimerVersion: payload.disclaimer_version,

      meta: payload.meta ?? undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Save failed.");
  }

  // Return a minimal object consistent with your older callers
  return { id: data?.id };
}

//////////////////////////////////////////////////////
// FETCH ALL QUOTES (ADMIN)
// (Reads with anon key; requires RLS that allows read, or switch to server API later)
//////////////////////////////////////////////////////

export async function fetchAllQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("FETCH QUOTES ERROR:", error);
    return [];
  }

  return (data ?? []) as Quote[];
}

//////////////////////////////////////////////////////
// FETCH SINGLE QUOTE (Auto limo vs non-limo)
//////////////////////////////////////////////////////

export async function fetchQuoteById(id: string) {
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) {
    console.error("FETCH QUOTE ERROR:", error);
    return null;
  }

  const isLimo = quote.company_context === "exquisite_limo";

  const servicesTable = isLimo ? "limo_services" : "quote_service_items";
  const addonsTable = isLimo ? "limo_addons" : "quote_addons";

  const [{ data: services, error: sErr }, { data: addons, error: aErr }] =
    await Promise.all([
      supabase.from(servicesTable).select("*").eq("quote_id", id),
      supabase.from(addonsTable).select("*").eq("quote_id", id),
    ]);

  if (sErr) console.error("FETCH SERVICES ERROR:", sErr);
  if (aErr) console.error("FETCH ADDONS ERROR:", aErr);

  return {
    ...quote,
    services: services ?? [],
    addons: addons ?? [],
  };
}

//////////////////////////////////////////////////////
// UPDATE QUOTE STATUS (ADMIN)
// NOTE: This is a client-side update. It will fail unless RLS allows it.
// Best practice later: move to /api/quotes/[id]/status with service role.
//////////////////////////////////////////////////////

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);

  if (error) {
    console.error("STATUS UPDATE ERROR:", error);
    throw error;
  }
}

//////////////////////////////////////////////////////
// SAVE JOB LOG (VOICE LOGGER)
// NOTE: client-side insert; requires RLS or move to API route later.
//////////////////////////////////////////////////////

export async function saveJobLog(payload: {
  company_context: string;
  transcript: string;
}) {
  const { error } = await supabase.from("job_logs").insert({
    company_context: payload.company_context,
    source: "voice",
    transcript: payload.transcript,
    job_summary: payload.transcript.slice(0, 120),
  });

  if (error) {
    console.error("SAVE JOB LOG ERROR:", error);
    throw error;
  }
}

//////////////////////////////////////////////////////
// FETCH JOB LOGS (ADMIN)
//////////////////////////////////////////////////////

export async function fetchJobLogs() {
  const { data, error } = await supabase
    .from("job_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}
