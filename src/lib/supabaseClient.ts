import { createClient } from "@supabase/supabase-js";
import { QuickQuoteRecord } from "@/types/quotes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fetch a single quote with services and addons
export async function fetchQuoteById(id: string): Promise<QuickQuoteRecord | null> {
  // Fetch quote
  const { data: quoteData, error } = await supabase
    .from("quick_quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quoteData) return null;

  // Fetch services
  const { data: services = [] } = await supabase
    .from("limo_services")
    .select("*")
    .eq("quote_id", id);

  // Fetch addons
  const { data: addons = [] } = await supabase
    .from("limo_addons")
    .select("*")
    .eq("quote_id", id);

  return {
    ...quoteData,
    services,
    addons,
    customer_name: quoteData.customer_name,
    service_type: quoteData.service_type,
    created_at: quoteData.created_at,
  } as QuickQuoteRecord;
}