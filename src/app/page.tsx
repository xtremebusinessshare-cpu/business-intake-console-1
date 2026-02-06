import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold">
            Business Intake Console
          </h1>
          <p className="text-zinc-600 mt-2">
            Centralized intake, estimates, receipts, and voice logging
          </p>
        </header>

        {/* Dashboard Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardCard
            title="Voice Job Logger"
            description="Log jobs using voice notes and structured intake."
            href="/voice"
          />

          <DashboardCard
            title="Quick Quotes"
            description="Create non-binding, court-safe preliminary estimates."
            href="/quotes"
          />

          <DashboardCard
            title="Receipts & Images"
            description="Upload receipts, photos, and supporting documentation."
            href="/receipts"
          />

          <DashboardCard
            title="Admin Review"
            description="View and manage all submitted quotes and records."
            href="/admin/quotes"
          />
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
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
      className="block border rounded-xl p-6 bg-white hover:shadow-md transition"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-zinc-600 text-sm">{description}</p>
    </Link>
  );
}
