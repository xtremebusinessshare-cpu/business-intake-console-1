import { Suspense } from "react";
import NewQuoteClient from "./NewQuoteClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-600">Loading…</div>}>
      <NewQuoteClient />
    </Suspense>
  );
}
