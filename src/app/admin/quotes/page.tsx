export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
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

export default async function AdminQuotesPage() {
  const supabase = supabaseAdmin();

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id, quote_number, created_at, company_context, estimate_type, client_name, status, estimated_total, total")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin — Quotes</h1>
          <p className="text-sm text-zinc-600">All submitted quotes (most recent first).</p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin" className="px-4 py-2 rounded bg-zinc-100 font-semibold">
            Back to Admin
          </Link>
          <Link href="/quotes/new" className="px-4 py-2 rounded bg-black text-white font-semibold">
            New Quote
          </Link>
        </div>
      </header>

      {error ? (
        <p className="text-red-600">Failed to load quotes: {error.message}</p>
      ) : !quotes || quotes.length === 0 ? (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-zinc-700 font-semibold">No quotes submitted yet.</p>
          <p className="text-sm text-zinc-600 mt-1">
            If you just saved one, this page should show it immediately once deployed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q: any) => (
            <div key={q.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {q.quote_number ? q.quote_number : q.id}
                    </p>
                    {q.status ? badge(String(q.status), "info") : null}
                    {q.company_context ? badge(String(q.company_context).toUpperCase(), "dark") : null}
                    {q.estimate_type ? badge(String(q.estimate_type), "info") : null}
                  </div>

                  <p className="text-sm text-zinc-700">
                    <strong>Client:</strong> {q.client_name ?? "—"}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {q.created_at ? new Date(q.created_at).toLocaleString() : ""}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-zinc-500">Estimated Total</p>
                  <p className="text-lg font-bold">
                    {typeof q.estimated_total === "number"
                      ? q.estimated_total.toLocaleString(undefined, { style: "currency", currency: "USD" })
                      : typeof q.total === "number"
                      ? q.total.toLocaleString(undefined, { style: "currency", currency: "USD" })
                      : "—"}
                  </p>

                  <Link
                    href={`/quotes/${q.id}`}
                    className="inline-block mt-2 px-3 py-2 rounded bg-black text-white text-sm font-semibold"
                  >
                    View Quote
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
