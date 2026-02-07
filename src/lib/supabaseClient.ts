import { createClient } from "@supabase/supabase-js";
import { QuickQuoteRecord } from "@/types/quotes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

//////////////////////////////////////////////////////
// SAVE QUOTE
//////////////////////////////////////////////////////

export async function saveQuickQuote(quote: QuickQuoteRecord) {
  const { services, addons, ...quoteData } = quote;

  // Insert main quote
  const { data, error } = await supabase
    .from("quick_quotes")
    .insert([quoteData])
    .select()
    .single();

  if (error) throw error;

  const quoteId = data.id;

  // Insert services
  if (services?.length) {
    await supabase.from("limo_services").insert(
      services.map((s) => ({
        ...s,
        quote_id: quoteId,
      }))
    );
  }

  // Insert addons
  if (addons?.length) {
    await supabase.from("limo_addons").insert(
      addons.map((a) => ({
        ...a,
        quote_id: quoteId,
      }))
    );
  }

  return data;
}

//////////////////////////////////////////////////////
// FETCH ALL QUOTES (ADMIN PAGE)
//////////////////////////////////////////////////////

export async function fetchAllQuotes(): Promise<QuickQuoteRecord[]> {
  const { data, error } = await supabase
    .from("quick_quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

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

  if (error || !quote) return null;

  const { data: services } = await supabase
    .from("limo_services")
    .select("*")
    .eq("quote_id", id);

  const { data: addons } = await supabase
    .from("limo_addons")
    .select("*")
    .eq("quote_id", id);

  return {
    ...quote,
    services: services ?? [],
    addons: addons ?? [],
  };
}
