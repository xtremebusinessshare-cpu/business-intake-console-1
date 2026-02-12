"use client";

import { useState } from "react";
import Link from "next/link";

type CompanyContext = "xes" | "gxs" | "exquisite_limo";

export default function ReceiptsPage() {
  const [companyContext, setCompanyContext] = useState<CompanyContext>("xes");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload() {
    setErr(null);
    setMsg(null);

    if (!file) return setErr("Choose a file first.");

    setSaving(true);
    try {
      const form = new FormData();
      form.append("company_context", companyContext);
      form.append("uploader_note", note);
      form.append("file", file);

      const res = await fetch("/api/receipts", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed.");

      setMsg("Uploaded. Admin can review it now.");
      setNote("");
      setFile(null);
      // reset file input visually by forcing key rerender
      (document.getElementById("receipt-file") as HTMLInputElement | null)?.value && ((document.getElementById("receipt-file") as HTMLInputElement).value = "");
    } catch (e: any) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Receipts & Images</h1>
            <p className="text-zinc-600 mt-2">
              Upload receipts, photos, and supporting documentation.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/" className="px-4 py-2 rounded bg-zinc-100 font-semibold">
              Home
            </Link>
            <Link href="/admin/receipts" className="px-4 py-2 rounded bg-black text-white font-semibold">
              Admin Review
            </Link>
          </div>
        </header>

        <div className="rounded-xl border bg-white p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Business</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={companyContext}
              onChange={(e) => setCompanyContext(e.target.value as CompanyContext)}
            >
              <option value="xes">XES</option>
              <option value="gxs">GXS</option>
              <option value="exquisite_limo">Exquisite Limo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Note (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Home Depot receipt, mold supplies, job #123"
            />
          </div>

          <div>
            <label className="text-sm font-medium">File</label>
            <input
              id="receipt-file"
              type="file"
              className="mt-1 w-full rounded-lg border p-2 bg-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-zinc-500 mt-1">Photos, PDFs, screenshots, etc.</p>
          </div>

          <button
            type="button"
            onClick={onUpload}
            disabled={saving}
            className="rounded-lg bg-black text-white px-5 py-3 font-semibold disabled:opacity-60"
          >
            {saving ? "Uploading…" : "Upload"}
          </button>

          {msg && <div className="text-sm text-green-700">{msg}</div>}
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
