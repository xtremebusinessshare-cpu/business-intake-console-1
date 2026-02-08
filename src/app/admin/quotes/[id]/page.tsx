import { fetchQuoteById } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";

export default async function AdminQuoteDetail({
  params,
}: {
  params: { id: string };
}) {
  const quote = await fetchQuoteById(params.id);

  if (!quote) return notFound();

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto bg-white border rounded-xl p-6">

        <header className="mb-6">
          <h1 className="text-2xl font-bold">
            Quote #{quote.id}
          </h1>

          <p className="text-zinc-600">
            {quote.company_context} — {quote.estimate_type}
          </p>
        </header>

        {/* STATUS */}
        <div className="mb-6">
          <span className="text-sm font-semibold mr-2">
            Status:
          </span>

          <span className="px-3 py-1 rounded-full bg-zinc-200 text-sm">
            {quote.status}
          </span>
        </div>

        {/* TOTAL */}
        <div className="mb-6">
          <p className="text-lg font-bold">
            Estimated Total: ${quote.estimated_total.toFixed(2)}
          </p>
        </div>

        {/* NOTES */}
        {quote.notes && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-zinc-700 whitespace-pre-wrap">
              {quote.notes}
            </p>
          </div>
        )}

        {/* SERVICES */}
        {quote.services?.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Services</h2>

            <div className="space-y-2">
              {quote.services.map((s: any) => (
                <div
                  key={s.id}
                  className="border rounded-lg p-3"
                >
                  {s.service_category} — ${s.estimated_amount}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADDONS */}
        {quote.addons?.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Add-ons</h2>

            <div className="space-y-2">
              {quote.addons.map((a: any) => (
                <div
                  key={a.id}
                  className="border rounded-lg p-3"
                >
                  {a.extra_type} — ${a.estimated_amount}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
