import { createClient } from "@supabase/supabase-js";
import { QuickQuoteRecord } from "@/types/quotes";

//////////////////////////////////////////////////////
// SUPABASE CLIENT
//////////////////////////////////////////////////////

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

//////////////////////////////////////////////////////
// SAVE QUOTE
//////////////////////////////////////////////////////

export async function saveQuickQuote(
  quote: QuickQuoteRecord
): Promise<QuickQuoteRecord> {
  const { services, addons, ...quoteData } = quote;

  // ✅ Insert main quote
  const { data, error } = await supabase
    .from("quick_quotes")
    .insert([quoteData])
    .select()
    .single();

  if (error) {
    console.error("Error saving quote:", error);
    throw error;
  }

  const quoteId = data.id;

  //////////////////////////////////////////////////////
  // Insert Services
  //////////////////////////////////////////////////////

  if (services?.length) {
    const { error: servicesError } = await supabase
      .from("limo_services")
      .insert(
        services.map((service) => ({
          ...service,
          quote_id: quoteId,
        }))
      );

    if (servicesError) {
      console.error("Error saving services:", servicesError);
      throw servicesError;
    }
  }

  //////////////////////////////////////////////////////
  // Insert Addons
  //////////////////////////////////////////////////////

  if (addons?.length) {
    const { error: addonsError } = await supabase
      .from("limo_addons")
      .insert(
        addons.map((addon) => ({
          ...addon,
          quote_id: quoteId,
        }))
      );

    if (addonsError) {
      console.error("Error saving addons:", addonsError);
      throw addonsError;
    }
  }

  return {
    ...data,
    services: services ?? [],
    addons: addons ?? [],
  };
}

//////////////////////////////////////////////////////
// FETCH ALL QUOTES (ADMIN)
//////////////////////////////////////////////////////

export async function fetchAllQuotes(): Promise<QuickQuoteRecord[]> {
  const { data, error } = await supabase
    .from("quick_quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }

  return data ?? [];
}

//////////////////////////////////////////////////////
// FETCH SINGLE QUOTE
//////////////////////////////////////////////////////

export async function fetchQuoteById(
  id: string
): Promise<QuickQuoteRecord | null> {
  const { data: quote, error } = await supabase
    .from("quick_quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) {
    console.error("Error fetching quote:", error);
    return null;
  }

  const { data: services, error: servicesError } = await supabase
    .from("limo_services")
    .select("*")
    .eq("quote_id", id);

  const { data: addons, error: addonsError } = await supabase
    .from("limo_addons")
    .select("*")
    .eq("quote_id", id);

  if (servicesError) console.error(servicesError);
  if (addonsError) console.error(addonsError);

  return {
    ...quote,
    services: services ?? [],
    addons: addons ?? [],
  };
}
