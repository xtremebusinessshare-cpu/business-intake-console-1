import { fetchAllQuotes } from "@/lib/supabaseClient";

export default async function AdminQuotesPage() {
  const quotes = await fetchAllQuotes();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Admin — Quick Quotes
      </h1>

<a
  href="/admin/quotes/new"
  className="inline-block mb-4 px-4 py-2 bg-black text-white"
>
  + New Quote
</a>
      {quotes.length === 0 ? (
        <p className="text-gray-500">No quotes found.</p>
      ) : (
        <table className="w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left border">Date</th>
              <th className="p-2 text-left border">Customer</th>
              <th className="p-2 text-left border">Service</th>
              <th className="p-2 text-right border">Total</th>
            </tr>
          </thead>

          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="p-2 border">
                  {new Date(quote.created_at).toLocaleDateString()}
                </td>
                <td className="p-2 border">
                  {quote.customer_name}
                </td>
                <td className="p-2 border">
                  {quote.service_type}
                </td>
                <td className="p-2 border text-right space-x-2">
  ${quote.total.toFixed(2)}
  <button
    className="ml-2 px-2 py-1 text-sm bg-black text-white"
    onClick={() => {
      const { generateQuotePDF } = require("@/lib/pdf");
      generateQuotePDF(quote);
    }}
  >
    PDF
  </button>
</td>

              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
