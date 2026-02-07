"use client";

import { useState } from "react";
import { saveQuickQuote } from "@/lib/supabaseClient";
import { QuickQuoteRecord } from "@/types/quotes";
import { generateQuotePDF } from "@/lib/pdf";

export default function NewQuotePage() {
  const [customer, setCustomer] = useState("");
  const [service, setService] = useState("");
  const [total, setTotal] = useState(0);

  const handleSave = async () => {
    const quote: QuickQuoteRecord = {
      customer_name: customer,
      service_type: service,
      total,
      estimateType: "limo",
      businessContext: "exquisite_limo",
      services: [],
      addons: [],
      created_at: new Date(),
    };

    const saved = await saveQuickQuote(quote);
    generateQuotePDF(saved);
    alert("Quote saved and PDF generated!");
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">New Quote</h1>
      <input placeholder="Customer Name" value={customer} onChange={e => setCustomer(e.target.value)} />
      <input placeholder="Service Type" value={service} onChange={e => setService(e.target.value)} />
      <input type="number" placeholder="Total" value={total} onChange={e => setTotal(Number(e.target.value))} />
      <button onClick={handleSave}>Save & Generate PDF</button>
    </div>
  );
}
