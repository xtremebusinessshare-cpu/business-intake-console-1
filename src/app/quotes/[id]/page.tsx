import ExportPDFButton from "@/components/ExportPDFButton";
import { createClient } from "@supabase/supabase-js";

type QuoteRow = {
  id: string;
  estimate_type: string;
  client_name: string | null;
  notes: string | null;
  status: string | null;
  company_context: string | null;
  created_at: string | null;

  // totals
  subtotal_services: number | null;
  subtotal_addons: number | null;
  estimated_total: number | null;
  subtotal: number | null;
  total: number | null;

  // jsonb meta container (you’re storing metadata here)
  addons: any | null;

  disclaimer_text: string | null;
  disclaimer_version: string | null;
};

type ServiceItem = {
  id: string;
  quote_id: string | null;
  service_category: string | null;
  vehicle_type: string | null;
  passenger_count: number | null;
  unit: string | null;
  quantity: number | null;
  estimated_amount: number | null;
};

type AddonItem = {
  id: string;
  quote_id: string | null;
  extra_type: string | null;
  unit: string | null;
  quantity: number | null;
  estimated_amount: number | null;
};

function money(n: number | null | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function toNum(n: any) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}


export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = supabaseAdmin();


  // 1) Fetch quote
  const { data: quote, error: quoteErr } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<QuoteRow>();

  if (quoteErr) {
    return (
      <main className="p-8">
        <p className="text-red-600">Error loading quote: {quoteErr.message}</p>
      </main>
    );
  }

  if (!quote) {
    return <p className="p-8">Quote not found.</p>;
  }

  const isLimo = quote.company_context === "exquisite_limo";

  // 2) Fetch line items from correct tables
  const servicesTable = isLimo ? "limo_services" : "quote_service_items";
  const addonsTable = isLimo ? "limo_addons" : "quote_addons";

  const [{ data: services, error: svcErr }, { data: addons, error: addErr }] =
    await Promise.all([
      supabase
        .from(servicesTable)
        .select("*")
        .eq("quote_id", quote.id)
        .order("id", { ascending: true }) as any,
      supabase
        .from(addonsTable)
        .select("*")
        .eq("quote_id", quote.id)
        .order("id", { ascending: true }) as any,
    ]);

  if (svcErr || addErr) {
    return (
      <main className="p-8">
        <p className="text-red-600">
          Error loading quote items: {svcErr?.message || addErr?.message}
        </p>
      </main>
    );
  }

  const serviceItems = (services ?? []) as ServiceItem[];
  const addonItems = (addons ?? []) as AddonItem[];

  // 3) Compute totals fallback (in case some totals are null)
  const computedServicesSubtotal = serviceItems.reduce(
    (sum, s) => sum + toNum(s.estimated_amount),
    0
  );
  const computedAddonsSubtotal = addonItems.reduce(
    (sum, a) => sum + toNum(a.estimated_amount),
    0
  );
  const computedTotal = computedServicesSubtotal + computedAddonsSubtotal;

  const servicesSubtotal =
    quote.subtotal_services ?? computedServicesSubtotal;
  const addonsSubtotal = quote.subtotal_addons ?? computedAddonsSubtotal;
  const estimatedTotal =
    quote.estimated_total ?? quote.total ?? computedTotal;

  // 4) Pull metadata saved into quotes.addons (jsonb)
  const meta = (quote.addons ?? {}) as any;
  const jobAddress = meta?.job_address ?? null;
  const lossType = meta?.loss_type ?? null;
  const limoMeta = meta?.limo ?? null;

  // 5) Normalize object for your ExportPDFButton
  // (Keeps your PDF component flexible while matching your current DB reality)
  const pdfQuote = {
    ...quote,
    services: serviceItems,
    addons: addonItems,
    meta: {
      job_address: jobAddress,
      loss_type: lossType,
      limo: limoMeta,
    },
    totals: {
      services_subtotal: servicesSubtotal,
      addons_subtotal: addonsSubtotal,
      estimated_total: estimatedTotal,
    },
  };

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quote Detail</h1>
          <p className="text-sm text-gray-600">
            ID: <span className="font-mono">{quote.id}</span>
          </p>
        </div>
        <ExportPDFButton quote={pdfQuote} />
      </div>

      <div className="rounded-xl border p-4 bg-white space-y-2">
        <p>
          <strong>Business:</strong>{" "}
          {quote.company_context ?? "—"}
        </p>
        <p>
          <strong>Estimate Type:</strong>{" "}
          {quote.estimate_type}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          {quote.status ?? "NEW"}
        </p>
        <p>
          <strong>Client Name:</strong>{" "}
          {quote.client_name ?? "—"}
        </p>

        {jobAddress && (
          <p>
            <strong>Job Address:</strong> {jobAddress}
          </p>
        )}
        {lossType && (
          <p>
            <strong>Loss Type:</strong> {lossType}
          </p>
        )}

        {isLimo && limoMeta && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3">
            <p className="font-semibold">Limo Details</p>
            <p className="text-sm">
              <strong>Pickup:</strong> {limoMeta?.pickup ?? "—"}
            </p>
            <p className="text-sm">
              <strong>Dropoff:</strong> {limoMeta?.dropoff ?? "—"}
            </p>
            <p className="text-sm">
              <strong>Date:</strong> {limoMeta?.serviceDate ?? "—"}{" "}
              <strong>Time:</strong> {limoMeta?.startTime ?? "—"}
            </p>
            <p className="text-sm">
              <strong>Vehicle:</strong> {limoMeta?.vehicleType ?? "—"}{" "}
              <strong>Passengers:</strong> {limoMeta?.passengers ?? "—"}
            </p>
            <p className="text-sm">
              <strong>Est Hours:</strong> {limoMeta?.estHours ?? "—"}{" "}
              <strong>Est Miles:</strong> {limoMeta?.estMiles ?? "—"}{" "}
              <strong>Stops:</strong> {limoMeta?.stops ?? "—"}
            </p>
          </div>
        )}

        {quote.notes && (
          <p>
            <strong>Notes:</strong> {quote.notes}
          </p>
        )}
      </div>

      <div className="rounded-xl border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Service Line Items</h2>
        {serviceItems.length === 0 ? (
          <p className="text-sm text-gray-600">No service items found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Service</th>
                  {isLimo && <th className="py-2 pr-3">Vehicle</th>}
                  {isLimo && <th className="py-2 pr-3">Passengers</th>}
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 pr-3">{s.service_category ?? "—"}</td>
                    {isLimo && <td className="py-2 pr-3">{s.vehicle_type ?? "—"}</td>}
                    {isLimo && (
                      <td className="py-2 pr-3">
                        {typeof s.passenger_count === "number" ? s.passenger_count : "—"}
                      </td>
                    )}
                    <td className="py-2 pr-3">{s.unit ?? "—"}</td>
                    <td className="py-2 pr-3">{toNum(s.quantity)}</td>
                    <td className="py-2 pr-3">{money(toNum(s.estimated_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-sm flex justify-end">
          <span className="mr-2 text-gray-600">Services Subtotal:</span>
          <span className="font-semibold">{money(servicesSubtotal)}</span>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Add-Ons</h2>
        {addonItems.length === 0 ? (
          <p className="text-sm text-gray-600">No add-ons found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Add-on</th>
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {addonItems.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="py-2 pr-3">{a.extra_type ?? "—"}</td>
                    <td className="py-2 pr-3">{a.unit ?? "—"}</td>
                    <td className="py-2 pr-3">{toNum(a.quantity)}</td>
                    <td className="py-2 pr-3">{money(toNum(a.estimated_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-sm flex justify-end">
          <span className="mr-2 text-gray-600">Add-ons Subtotal:</span>
          <span className="font-semibold">{money(addonsSubtotal)}</span>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-2">Totals</h2>
        <p>
          <strong>Estimated Total:</strong> {money(estimatedTotal)}
        </p>
        {quote.disclaimer_text && (
          <div className="mt-3">
            <p className="font-semibold">Disclaimer</p>
            <p className="text-sm text-gray-700">{quote.disclaimer_text}</p>
            {quote.disclaimer_version && (
              <p className="text-xs text-gray-500 mt-1">
                Version: {quote.disclaimer_version}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
