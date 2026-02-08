import Link from "next/link";
import { fetchAllQuotes } from "@/lib/supabaseClient";

export default async function AdminQuotesPage() {
  const quotes = await fetchAllQuotes();

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin — Quotes</h1>

      {quotes.length === 0 ? (
        <p className="text-zinc-500">No quotes found.</p>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Link
              key={quote.id}
              href={`/admin/quotes/${quote.id}`}
              className="block border rounded-xl p-4 hover:bg-zinc-50"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">
                    {quote.company_context} — {quote.estimate_type}
                  </p>
                  <p className="text-sm text-zinc-600">
                    ${quote.estimated_total.toFixed(2)}
                  </p>
                </div>

                <span className="text-xs px-3 py-1 rounded-full bg-zinc-200">
                  {quote.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
