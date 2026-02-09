import Link from "next/link";
import { fetchAllQuotes } from "@/lib/supabaseClient";

export default async function AdminQuotesPage() {
  const quotes = await fetchAllQuotes();

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-6xl mx-auto">

        <header className="mb-8">
          <h1 className="text-3xl font-bold">Submitted Quotes</h1>
          <p className="text-zinc-600 mt-2">
            Internal view of all preliminary estimates
          </p>
        </header>

        {quotes.length === 0 ? (
          <div className="bg-white border rounded-xl p-6">
            No quotes submitted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/admin/quotes/${quote.id}`}
                className="block bg-white border rounded-xl p-5 hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  
                  <div>
                    <p className="font-semibold">
                      {quote.company_context} — {quote.estimate_type}
                    </p>

                    <p className="text-sm text-zinc-600">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">
                    {Number(quote.estimated_total ?? 0).toLocaleString(undefined, {
  style: "currency",
  currency: "USD",
})}


                    </p>

                    <span className="text-xs px-3 py-1 rounded-full bg-zinc-200">
                      {quote.status}
                    </span>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
