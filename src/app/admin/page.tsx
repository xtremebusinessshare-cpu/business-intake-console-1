import Link from "next/link";

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-zinc-600 mt-2">
            Internal management of quotes, receipts, and voice logs
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminCard
            title="Quotes"
            description="View all submitted preliminary estimates"
            href="/admin/quotes"
          />

          <AdminCard
            title="Receipts"
            description="Review uploaded receipts and images"
            href="/admin/receipts"
          />

          <AdminCard
            title="Voice Logs"
            description="Access recorded job intakes"
            href="/admin/voice"
          />
        </section>
      </div>
    </main>
  );
}

function AdminCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white border rounded-xl p-6 hover:shadow-md transition"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-zinc-600 text-sm">{description}</p>
    </Link>
  );
}
