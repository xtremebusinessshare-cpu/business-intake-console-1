import { createClient } from "@supabase/supabase-js";

//////////////////////////////////////////////////////
// SUPABASE CLIENT (Singleton)
//////////////////////////////////////////////////////

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

//////////////////////////////////////////////////////
// TYPES (Lightweight — avoid circular imports)
//////////////////////////////////////////////////////

export type Quote = {
  id: string;
  company_context: string;
  estimate_type: string;
  estimated_total: number;
  subtotal_services: number;
  subtotal_addons: number;
  notes?: string;
  created_at: string;
};

//////////////////////////////////////////////////////
// SAVE QUOTE
//////////////////////////////////////////////////////

export async function saveQuote(payload: {
  company_context: string;
  estimate_type: string;
  estimated_total: number;
  subtotal_services: number;
  subtotal_addons: number;
  notes?: string;
  disclaimer_text: string;
  disclaimer_version: string;
  services: any[];
  addons: any[];
}) {
  const { services, addons, ...quoteData } = payload;

  /////////////////////////////////
  // Insert Master Quote
  /////////////////////////////////

  const { data, error } = await supabase
    .from("quotes")
    .insert(quoteData)
    .select()
    .single();

  if (error) {
    console.error("SAVE QUOTE ERROR:", error);
    throw error;
  }

  const quoteId = data.id;

  /////////////////////////////////
  // Insert Services
  /////////////////////////////////

  if (services?.length) {
    const { error: servicesError } = await supabase
      .from("quote_service_items")
      .insert(
        services.map((s) => ({
          quote_id: quoteId,
          service_category: s.serviceCategory,
          vehicle_type: s.vehicleType,
          passenger_count: s.passengerCount,
          unit: s.unit,
          quantity: s.quantity,
          estimated_amount: s.estimatedAmount,
        }))
      );

    if (servicesError) throw servicesError;
  }

  /////////////////////////////////
  // Insert Addons
  /////////////////////////////////

  if (addons?.length) {
    const { error: addonsError } = await supabase
      .from("quote_addons")
      .insert(
        addons.map((a) => ({
          quote_id: quoteId,
          extra_type: a.extraType,
          unit: a.unit,
          quantity: a.quantity,
          estimated_amount: a.estimatedAmount,
        }))
      );

    if (addonsError) throw addonsError;
  }

  return data;
}

//////////////////////////////////////////////////////
// FETCH ALL QUOTES (ADMIN)
//////////////////////////////////////////////////////

export async function fetchAllQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

//////////////////////////////////////////////////////
// FETCH SINGLE QUOTE
//////////////////////////////////////////////////////

export async function fetchQuoteById(id: string) {
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) return null;

  const { data: services } = await supabase
    .from("quote_service_items")
    .select("*")
    .eq("quote_id", id);

  const { data: addons } = await supabase
    .from("quote_addons")
    .select("*")
    .eq("quote_id", id);

  return {
    ...quote,
    services: services ?? [],
    addons: addons ?? [],
  };
}
