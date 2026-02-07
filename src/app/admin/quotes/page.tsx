import { fetchAllQuotes } from "@/lib/supabaseClient";

export default async function AdminQuotesPage() {
  const quotes = await fetchAllQuotes();

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">All Quotes</h1>
      {quotes.length === 0 ? (
        <p>No quotes found</p>
      ) : (
        <ul>
          {quotes.map(q => (
            <li key={q.id}>
              {q.customer_name} — {q.service_type} — ${q.total}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
