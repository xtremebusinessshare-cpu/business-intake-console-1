export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav className="p-4 bg-black text-white flex gap-4">
        <a href="/admin/quotes">Quotes</a>
        <a href="/">Home</a>
      </nav>

      {children}
    </div>
  );
}
