import { createClient } from "@supabase/supabase-js";

/**
 * Quote record shape (matches Supabase table)
 */
export type QuickQuoteRecord = {
  id: string;
  created_at: string;
  customer_name: string;
  service_type: string;
  total: number;
};

/**
 * Supabase client
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * ADMIN — fetch all quotes
 */
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

/**
 * ADMIN — fetch single quote by ID
 */
export async function fetchQuoteById(
  id: string
): Promise<QuickQuoteRecord | null> {
  const { data, error } = await supabase
    .from("quick_quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching quote:", error);
    return null;
  }

  return data;
}

/**
 * ADMIN — save new quote
 */
export async function saveQuickQuote(input: {
  customer_name: string;
  service_type: string;
  total: number;
}) {
  if (!input.customer_name || input.total <= 0) {
    console.warn("Invalid quote data, not saving");
    return;
  }

  const { error } = await supabase
    .from("quick_quotes")
    .insert([input]);

  if (error) {
    console.error("Save quote failed:", error);
  }
}

