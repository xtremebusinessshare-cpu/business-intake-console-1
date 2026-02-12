import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminReceiptsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin — Receipts & Images</h1>
            <p className="text-zinc-600 mt-2">
              Review uploaded receipts, photos, and supporting documentation.
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
              href="/admin"
              className="px-4 py-2 rounded bg-black text-white font-semibold"
            >
              Admin Console
            </Link>
          </div>
        </header>

        <div className="rounded-xl border bg-white p-6">
          <p className="font-semibold">Receipts Admin</p>
          <p className="text-sm text-zinc-600 mt-1">
            This page is ready. Next step is wiring it to Supabase Storage so you
            can see uploaded files, preview images/PDFs, and mark items as reviewed.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/receipts"
              className="px-4 py-2 rounded bg-zinc-100 font-semibold"
            >
              Go to Upload Page
            </Link>
            <Link
              href="/admin/voice"
              className="px-4 py-2 rounded bg-zinc-100 font-semibold"
            >
              View Logs
            </Link>
            <Link
              href="/admin/quotes"
              className="px-4 py-2 rounded bg-zinc-100 font-semibold"
            >
              View Quotes
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
