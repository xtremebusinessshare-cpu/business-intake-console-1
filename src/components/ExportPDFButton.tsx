"use client";

import { generateQuotePDF } from "@/lib/pdf";

export default function ExportPDFButton({ quote }: { quote: any }) {
  return (
    <button
      className="mt-4 px-4 py-2 bg-black text-white rounded"
      onClick={() => generateQuotePDF(quote)}
    >
      Export PDF
    </button>
  );
}
