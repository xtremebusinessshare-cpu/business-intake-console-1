import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function supabaseServer() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY; // server-side reads with RLS
  if (!url || !anon) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  return createClient(url, anon, { auth: { persistSession: false } });
}

export default async function AdminVoicePage() {
  const supabase = supabaseServer();

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
            Shows both typed logs and future voice transcriptions.
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
            href="/voice-job-logger"
            className="px-4 py-2 rounded bg-black text-white font-semibold"
          >
            New Log
          </Link>
        </div>
      </header>

      {error ? (
        <p className="text-red-600">Failed to load job logs: {error.message}</p>
      ) : logs?.length === 0 ? (
        <p className="text-zinc-500">No job logs yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log: any) => (
            <div key={log.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {log.company_context ?? "—"}{" "}
                  <span className="text-xs text-zinc-500 font-normal">
                    ({log.source ?? "unknown"})
                  </span>
                </p>
                <p className="text-xs text-zinc-500">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                </p>
              </div>

              <p className="whitespace-pre-line text-sm mt-2">
                {log.transcript}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
