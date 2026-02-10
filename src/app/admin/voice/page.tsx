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

export default async function AdminVoicePage() {
  const supabase = supabaseAdmin();

  const { data: logs, error } = await supabase
    .from("job_logs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin — Job Logs</h1>
          <p className="text-sm text-zinc-600">
            Shows typed logs and future transcribed voice logs.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/" className="px-4 py-2 rounded bg-zinc-100 font-semibold">
            Home
          </Link>
          <Link
            href="/voice-job-logger"
            className="px-4 py-2 rounded bg-black text-white font-semibold"
          >
            New Log
          </Link>
        </div>
      </header>

      {error ? (
        <p className="text-red-600">Failed to load job logs: {error.message}</p>
      ) : !logs || logs.length === 0 ? (
        <p className="text-zinc-500">No job logs yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log: any) => (
            <div key={log.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  {log.company_context ?? "—"}{" "}
                  <span className="text-xs text-zinc-500 font-normal">
                    ({log.source ?? "unknown"})
                  </span>
                </p>

                <div className="flex items-center gap-3">
                  <p className="text-xs text-zinc-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                  </p>

                  <Link
                    href={`/quotes/new?logId=${log.id}`}
                    className="px-3 py-2 rounded bg-black text-white text-sm font-semibold"
                  >
                    Convert to Quote
                  </Link>
                </div>
              </div>

              <p className="whitespace-pre-line text-sm mt-2">{log.transcript}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
