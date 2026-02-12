export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AdminLogsClient from "./AdminLogsClient";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
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
          <h1 className="text-2xl font-bold">Admin — Job & Note Logs</h1>
          <p className="text-sm text-zinc-600">
            All logs (typed + voice + audio). Archive or delete as needed.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/" className="px-4 py-2 rounded bg-zinc-100 font-semibold">
            Home
          </Link>
          <Link href="/voice-job-logger" className="px-4 py-2 rounded bg-black text-white font-semibold">
            New Log
          </Link>
        </div>
      </header>

      {error ? (
        <p className="text-red-600">Failed to load logs: {error.message}</p>
      ) : (
        <AdminLogsClient initialLogs={logs ?? []} />
      )}
    </main>
  );
}
