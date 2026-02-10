import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  addons?: any | null; // jsonb meta
};

type SaveQuotePayload = {
  company_context: string;
  estimate_type: string;

  client_name?: string | null;
  notes?: string | null;

  subtotal_services: number;
  subtotal_addons: number;
  estimated_total: number;

  disclaimer_text: string;
  disclaimer_version: string;

  services: any[];
  addons: any[];

  meta?: any;
};

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
  if (!res.ok) throw new Error(data?.error || "Save failed.");
  return { id: data?.id };
}

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

export async function fetchQuoteById(id: string) {
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) return null;

  const isLimo = quote.company_context === "exquisite_limo";
  const servicesTable = isLimo ? "limo_services" : "quote_service_items";
  const addonsTable = isLimo ? "limo_addons" : "quote_addons";

  const [{ data: services }, { data: addons }] = await Promise.all([
    supabase.from(servicesTable).select("*").eq("quote_id", id),
    supabase.from(addonsTable).select("*").eq("quote_id", id),
  ]);

  return { ...quote, services: services ?? [], addons: addons ?? [] };
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function saveJobLog(payload: {
  company_context: string;
  transcript: string;
}) {
  const res = await fetch("/api/job-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to save job log.");
  return data;
}

export async function fetchJobLogs() {
  const { data, error } = await supabase
    .from("job_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}
