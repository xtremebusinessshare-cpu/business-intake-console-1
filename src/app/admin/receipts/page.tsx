import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default async function AdminReceiptsPage() {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin — Receipts & Images</h1>
            <p className="text-zinc-600 mt-2">Review uploaded receipts, photos, and documents.</p>
          </div>

          <div className="flex gap-2">
            <Link href="/" className="px-4 py-2 rounded bg-zinc-100 font-semibold">
              Home
            </Link>
            <Link href="/admin" className="px-4 py-2 rounded bg-black text-white font-semibold">
              Admin Console
            </Link>
          </div>
        </header>

        {error ? (
          <p className="text-red-600">Failed to load receipts: {error.message}</p>
        ) : !data || data.length === 0 ? (
          <p className="text-zinc-500">No uploads yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map((r: any) => (
              <div key={r.id} className="rounded-xl border bg-white p-4 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {r.company_context}{" "}
                    <span className="text-xs text-zinc-500 font-normal">
                      • {fmt(r.created_at)}
                    </span>
                  </div>

                  <a
                    href={r.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded bg-black text-white text-sm font-semibold"
                  >
                    Open
                  </a>
                </div>

                <div className="text-sm text-zinc-700">
                  <strong>File:</strong> {r.file_name}
                </div>

                {r.uploader_note ? (
                  <div className="text-sm text-zinc-700">
                    <strong>Note:</strong> {r.uploader_note}
                  </div>
                ) : null}

                <div className="text-xs text-zinc-500">
                  Status: {r.status ?? "new"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
