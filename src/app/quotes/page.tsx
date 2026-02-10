import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type QuoteRow = {
  id: string;
  created_at: string | null;
  company_context: string | null;
  estimate_type: string | null;
  client_name: string | null;
  notes: string | null;
  status: string | null;
  estimated_total: number | null;
  subtotal_services: number | null;
  subtotal_addons: number | null;
};

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function money(n: number | null | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function normalizeParam(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function badge(text: string, tone: "dark" | "warn" | "info" = "info") {
  const base = "inline-flex items-center px-2 py-1 rounded text-xs font-semibold";
  const cls =
    tone === "dark"
      ? `${base} bg-black text-white`
      : tone === "warn"
      ? `${base} bg-amber-100 text-amber-900`
      : `${base} bg-zinc-100 text-zinc-800`;
  return <span className={cls}>{text}</span>;
}

const BUSINESS_OPTIONS = [
  { value: "", label: "All Businesses" },
  { value: "xes", label: "XES" },
  { value: "gxs", label: "GXS" },
  { value: "exquisite_limo", label: "Exquisite Limo" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "NEW", label: "NEW" },
  { value: "REVIEWING", label: "REVIEWING" },
  { value: "APPROVED", label: "APPROVED" },
  { value: "CONVERTED", label: "CONVERTED" },
  { value: "CLOSED", label: "CLOSED" },
];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const q = normalizeParam(searchParams?.q).trim();
  const business = normalizeParam(searchParams?.business).trim();
  const status = normalizeParam(searchParams?.status).trim();

  const supabase = supabaseAdmin();

  let query = supabase
    .from("quotes")
    .select(
      "id, created_at, company_context, estimate_type, client_name, notes, status, estimated_total, subtotal_services, subtotal_addons"
    )
    .order("created_at", { ascending: false });

  if (business) query = query.eq("company_context", business);
  if (status) query = query.eq("status", status);

  // Search: client_name OR notes
  // Supabase "or" filter uses comma-separated expressions.
  if (q) {
    const safe = q.replace(/,/g, " "); // avoid breaking the or() string
    query = query.or(`client_name.ilike.%${safe}%,notes.ilike.%${safe}%`);
  }

  const { data: quotes, error } = await query;

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Quotes</h1>
            <p className="text-zinc-600 mt-1">
              Search, filter, and open quotes.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded bg-zinc-100 font-semibold"
            >
              Home
            </Link>
            <Link
              href="/quotes/new"
              className="px-4 py-2 rounded bg-black text-white font-semibold"
            >
              New Quote
            </Link>
          </div>
        </header>

        {/* Filters */}
        <form
          className="rounded-xl border bg-white p-4"
          action="/quotes"
          method="GET"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className="text-sm font-medium">Search</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Client name or notes…"
                className="mt-1 w-full rounded-lg border p-2"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Searches client name and notes.
              </p>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-medium">Business</label>
              <select
                name="business"
                defaultValue={business}
                className="mt-1 w-full rounded-lg border p-2 bg-white"
              >
                {BUSINESS_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                defaultValue={status}
                className="mt-1 w-full rounded-lg border p-2 bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-12 flex items-center justify-between gap-3 pt-2">
              <div className="text-sm text-zinc-600">
                Showing{" "}
                <span className="font-semibold">
                  {(quotes?.length ?? 0).toString()}
                </span>{" "}
                result(s)
              </div>

              <div className="flex gap-2">
                <Link
                  href="/quotes"
                  className="px-4 py-2 rounded bg-zinc-100 font-semibold"
                >
                  Clear
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-black text-white font-semibold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Results */}
        <div className="rounded-xl border bg-white overflow-hidden">
          {error ? (
            <div className="p-4 text-red-600">
              Failed to load quotes: {error.message}
            </div>
          ) : !quotes || quotes.length === 0 ? (
            <div className="p-6 text-zinc-500">
              No quotes found. Try clearing filters or create a new quote.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b bg-zinc-50">
                  <tr>
                    <th className="py-3 px-4">Quote</th>
                    <th className="py-3 px-4">Business</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Estimate Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(quotes as QuoteRow[]).map((row) => {
                    const tone =
                      (row.status ?? "").toUpperCase() === "NEW"
                        ? "warn"
                        : (row.status ?? "").toUpperCase() === "APPROVED"
                        ? "dark"
                        : "info";

                    return (
                      <tr key={row.id} className="border-b last:border-b-0">
                        <td className="py-3 px-4">
                          <Link
                            href={`/quotes/${row.id}`}
                            className="font-semibold text-black underline underline-offset-2"
                          >
                            {row.id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          {row.company_context ? badge(row.company_context, "info") : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {row.client_name ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          {row.estimate_type ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          {badge((row.status ?? "NEW").toUpperCase(), tone as any)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {money(row.estimated_total)}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString()
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500">
          Tip: This page uses server-only Supabase service role for reliable reads in Vercel.
        </p>
      </div>
    </main>
  );
}
