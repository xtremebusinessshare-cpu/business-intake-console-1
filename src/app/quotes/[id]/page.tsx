import { fetchQuoteById } from "@/lib/supabaseClient";
import ExportPDFButton from "@/components/ExportPDFButton";

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const quote = await fetchQuoteById(params.id);

  if (!quote) {
    return <p className="p-8">Quote not found.</p>;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Quote Detail</h1>

      <p><strong>Customer:</strong> {quote.customer_name}</p>
      <p><strong>Service:</strong> {quote.service_type}</p>
      <p><strong>Total:</strong> ${quote.total.toFixed(2)}</p>

      <ExportPDFButton quote={quote} />
    </main>
  );
}
