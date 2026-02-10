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

function extractFields(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const get = (label: string) => {
    const rx = new RegExp(`^${label}\\s*:\\s*(.+)$`, "i");
    const hit = lines.find((l) => rx.test(l));
    if (!hit) return null;
    return hit.replace(rx, "$1").trim() || null;
  };

  const priority = get("Priority") ?? get("Urgency");
  const client = get("Client") ?? get("Customer") ?? get("Name");
  const city = get("City");
  const service = get("Service") ?? get("Service Type");
  const sqftRaw = get("SqFt") ?? get("Sq Ft") ?? get("Square Feet") ?? get("Square Footage");
  const sqft = sqftRaw ? sqftRaw.replace(/[^\d.]/g, "") : null;

  const actions = lines
    .filter((l) => /^Action\s*:/i.test(l))
    .map((l) => l.replace(/^Action\s*:\s*/i, "").trim())
    .filter(Boolean);

  const important =
    lines.some((l) => /^Important\s*:/i.test(l)) || /#important\b/i.test(text);

  return { priority, client, city, service, sqft, actions, important };
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

export default async function AdminVoicePage() {
  const supabase = supabaseAdmin();

  // ✅ Correct table name
  const { data: logs, error } = await supabase
    .from("job_logs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin — Logs</h1>
          <p className="text-sm text-zinc-600">
            Notes + tasks + quote-ready details.
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
        <p className="text-red-600">Failed to load logs: {error.message}</p>
      ) : !logs || logs.length === 0 ? (
        <p className="text-zinc-500">No logs yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log: any) => {
            const f = extractFields(log.transcript ?? "");
            const src = (log.source ?? "typed").toString();

            const priorityTone =
              (f.priority ?? "").toLowerCase().includes("high") ? "warn" : "info";

            return (
              <div key={log.id} className="border rounded-xl p-4 bg-white space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">
                      {log.company_context ?? "—"}
                    </p>
                    {badge(src, "info")}
                    {f.important ? badge("IMPORTANT", "dark") : null}
                    {f.priority ? badge(`PRIORITY: ${f.priority}`, priorityTone as any) : null}
                  </div>

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

                {(f.client || f.city || f.service || f.sqft) && (
                  <div className="text-sm text-zinc-700 flex flex-wrap gap-x-4 gap-y-1">
                    {f.client && (
                      <span>
                        <strong>Client:</strong> {f.client}
                      </span>
                    )}
                    {f.city && (
                      <span>
                        <strong>City:</strong> {f.city}
                      </span>
                    )}
                    {f.service && (
                      <span>
                        <strong>Service:</strong> {f.service}
                      </span>
                    )}
                    {f.sqft && (
                      <span>
                        <strong>SqFt:</strong> {f.sqft}
                      </span>
                    )}
                  </div>
                )}

                {f.actions?.length > 0 && (
                  <div className="text-sm">
                    <p className="font-semibold">Actions</p>
                    <ul className="list-disc pl-5 text-zinc-700">
                      {f.actions.map((a: string, idx: number) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="whitespace-pre-line text-sm mt-2">{log.transcript}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
