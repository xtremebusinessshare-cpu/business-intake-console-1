// src/app/quotes/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import ExportPDFButton from "@/components/ExportPDFButton";
import { fetchQuoteById } from "@/lib/supabaseClient";

export default async function QuotePage({
  params,
}: {
  params: { id: string };
}) {
  const quote = await fetchQuoteById(params.id);

  if (!quote) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Quote</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="px-3 py-2 rounded bg-zinc-100 font-semibold">
              Home
            </Link>
            <Link href="/admin" className="px-3 py-2 rounded bg-zinc-100 font-semibold">
              Admin
            </Link>
            <Link href="/admin/voice" className="px-3 py-2 rounded bg-zinc-100 font-semibold">
              Logs
            </Link>
            <Link
              href="/quotes/new"
              className="px-3 py-2 rounded bg-black text-white font-semibold"
            >
              + New Quote
            </Link>
          </div>
        </header>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-red-600 font-semibold">Quote not found.</p>
          <p className="text-sm text-zinc-600">
            The quote may not exist, or you may not have access.
          </p>
        </div>
      </main>
    );
  }

  const services = Array.isArray((quote as any).services) ? (quote as any).services : [];
  const addons = Array.isArray((quote as any).addons) ? (quote as any).addons : [];

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {/* NAV HEADER so user can always leave */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Quote {quote?.quote_number ? `— ${quote.quote_number}` : ""}
          </h1>
          <p className="text-sm text-zinc-600">
            {quote?.company_context ? String(quote.company_context).toUpperCase() : "—"} •{" "}
            {quote?.status ?? "—"} •{" "}
            {quote?.created_at ? new Date(quote.created_at).toLocaleString() : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/" className="px-3 py-2 rounded bg-zinc-100 font-semibold">
            Home
          </Link>
          <Link href="/admin" className="px-3 py-2 rounded bg-zinc-100 font-semibold">
            Admin
          </Link>
          <Link href="/admin/voice" className="px-3 py-2 rounded bg-zinc-100 font-semibold">
            Logs
          </Link>
          <Link
            href="/quotes/new"
            className="px-3 py-2 rounded bg-black text-white font-semibold"
          >
            + New Quote
          </Link>
        </div>
      </header>

      {/* QUOTE SUMMARY */}
      <section className="rounded-xl border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Client</p>
            <p className="text-sm">{quote?.client_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500">Estimate Type</p>
            <p className="text-sm">{quote?.estimate_type ?? "—"}</p>
          </div>
        </div>

        {quote?.notes ? (
          <div>
            <p className="text-xs font-semibold text-zinc-500 mt-2">Notes</p>
            <p className="text-sm whitespace-pre-line">{quote.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Estimated Total</p>
            <p className="text-2xl font-bold">
              {typeof quote?.estimated_total === "number"
                ? quote.estimated_total.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })
                : typeof quote?.total === "number"
                ? quote.total.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })
                : "—"}
            </p>
          </div>

          {/* Export stays here, but user is not trapped */}
          <ExportPDFButton quote={quote} />
        </div>
      </section>

      {/* SERVICES */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">Services</h2>
        {services.length === 0 ? (
          <p className="text-sm text-zinc-600">No services found.</p>
        ) : (
          <div className="space-y-2">
            {services.map((s: any, idx: number) => (
              <div
                key={s?.id ?? idx}
                className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3"
              >
                <div className="min-w-[220px]">
                  <p className="font-semibold text-sm">
                    {s?.service_category ?? s?.name ?? "Service"}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Unit: {s?.unit ?? "—"} • Qty: {s?.quantity ?? s?.qty ?? "—"}
                  </p>
                </div>

                <div className="text-sm font-semibold">
                  {typeof s?.estimated_amount === "number"
                    ? s.estimated_amount.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ADD-ONS */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">Add-ons</h2>
        {addons.length === 0 ? (
          <p className="text-sm text-zinc-600">No add-ons.</p>
        ) : (
          <div className="space-y-2">
            {addons.map((a: any, idx: number) => (
              <div
                key={a?.id ?? idx}
                className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3"
              >
                <div className="min-w-[220px]">
                  <p className="font-semibold text-sm">
                    {a?.extra_type ?? a?.name ?? "Add-on"}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Unit: {a?.unit ?? "—"} • Qty: {a?.quantity ?? a?.qty ?? "—"}
                  </p>
                </div>

                <div className="text-sm font-semibold">
                  {typeof a?.estimated_amount === "number"
                    ? a.estimated_amount.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
