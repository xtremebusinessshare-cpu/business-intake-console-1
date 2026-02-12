"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Filter = "all" | "active" | "archived" | "typed" | "voice";

export default function AdminLogsClient({ initialLogs }: { initialLogs: any[] }) {
  const [logs, setLogs] = useState<any[]>(initialLogs || []);
  const [filter, setFilter] = useState<Filter>("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const status = (l.status ?? "logged").toString();
      const source = (l.source ?? "typed").toString();

      if (filter === "all") return true;
      if (filter === "active") return status !== "archived";
      if (filter === "archived") return status === "archived";
      if (filter === "typed") return source === "typed" && status !== "archived";
      if (filter === "voice") return source === "voice" && status !== "archived";
      return true;
    });
  }, [logs, filter]);

  async function setStatus(id: string, status: "archived" | "logged") {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/job-logs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Update failed.");

      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: data?.log?.status ?? status } : l))
      );
    } catch (e: any) {
      setError(e?.message || "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteLog(id: string) {
    const ok = window.confirm("Delete this log permanently? This cannot be undone.");
    if (!ok) return;

    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/job-logs/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed.");

      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold">View:</label>
          <select
            className="rounded-lg border p-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="active">Active (default)</option>
            <option value="all">All</option>
            <option value="archived">Archived</option>
            <option value="typed">Typed</option>
            <option value="voice">Voice</option>
          </select>
        </div>

        <p className="text-sm text-zinc-600">
          Showing <strong>{filtered.length}</strong> logs
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-zinc-500">No logs match this filter.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((log) => {
            const src = (log.source ?? "typed").toString();
            const status = (log.status ?? "logged").toString();
            const isBusy = busyId === log.id;

            return (
              <div key={log.id} className="border rounded-xl p-4 bg-white space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {log.company_context ?? "—"}{" "}
                      <span className="text-xs text-zinc-500 font-normal">
                        ({src}{status === "archived" ? " • archived" : ""})
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString("en-US", {
                            timeZone: "America/Chicago",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    <Link
                      href={`/quotes/new?logId=${log.id}`}
                      className="px-3 py-2 rounded bg-black text-white text-sm font-semibold"
                    >
                      Convert to Quote
                    </Link>

                    {status !== "archived" ? (
                      <button
                        disabled={isBusy}
                        onClick={() => setStatus(log.id, "archived")}
                        className="px-3 py-2 rounded bg-zinc-100 text-sm font-semibold disabled:opacity-60"
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        disabled={isBusy}
                        onClick={() => setStatus(log.id, "logged")}
                        className="px-3 py-2 rounded bg-zinc-100 text-sm font-semibold disabled:opacity-60"
                      >
                        Restore
                      </button>
                    )}

                    <button
                      disabled={isBusy}
                      onClick={() => deleteLog(log.id)}
                      className="px-3 py-2 rounded bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="whitespace-pre-line text-sm mt-2">{log.transcript}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
