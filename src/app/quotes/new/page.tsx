"use client";

import { useState } from "react";
import { saveQuickQuote } from "@/lib/supabaseClient";
import { LimoLineItems } from "@/components/quotes/LimoLineItems";
import { useRouter } from "next/navigation";

export default function NewQuotePage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    await saveQuickQuote({
      customer_name: customerName,
      service_type: serviceType,
      total,
    });

    router.push("/admin/quotes");
  }

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">New Quote</h1>

      <input
        className="border p-2 w-full"
        placeholder="Customer Name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />

      <input
        className="border p-2 w-full"
        placeholder="Service Type"
        value={serviceType}
        onChange={(e) => setServiceType(e.target.value)}
      />

      <LimoLineItems onTotalChange={setTotal} />

      <div className="text-right font-bold">
        Total: ${total.toFixed(2)}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-black text-white"
      >
        {saving ? "Saving..." : "Save Quote"}
      </button>
    </main>
  );
}
