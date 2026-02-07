import { fetchQuoteById } from "@/lib/supabaseClient";
import Link from "next/link";

export default async function QuoteDetail({
  params,
}: {
  params: { id: string };
}) {
  const quote = await fetchQuoteById(params.id);

  if (!quote) {
    return (
      <main className="p-8">
        Quote not found.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <Link href="/admin/quotes" className="underline text-sm">
          ← Back to Quotes
        </Link>

        <header>
          <h1 className="text-3xl font-bold">
            Quote Details
          </h1>
        </header>

        <section className="bg-white border rounded-xl p-6 space-y-2">
          <p><strong>Company:</strong> {quote.company_context}</p>
          <p><strong>Type:</strong> {quote.estimate_type}</p>
          <p><strong>Total:</strong> ${quote.estimated_total.toFixed(2)}</p>
          <p><strong>Notes:</strong> {quote.notes || "None"}</p>
        </section>

        {/* SERVICES */}
        <section className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Services</h2>

          {quote.services?.length === 0 && (
            <p className="text-zinc-500">No services</p>
          )}

          <div className="space-y-3">
            {quote.services?.map((s: any) => (
              <div
                key={s.id}
                className="border rounded-lg p-3"
              >
                <p>{s.service_category}</p>
                <p className="text-sm text-zinc-600">
                  Qty: {s.quantity} — ${s.estimated_amount}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ADDONS */}
        <section className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Add-ons</h2>

          {quote.addons?.length === 0 && (
            <p className="text-zinc-500">No add-ons</p>
          )}

          <div className="space-y-3">
            {quote.addons?.map((a: any) => (
              <div
                key={a.id}
                className="border rounded-lg p-3"
              >
                <p>{a.extra_type}</p>
                <p className="text-sm text-zinc-600">
                  Qty: {a.quantity} — ${a.estimated_amount}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
