import jsPDF from "jspdf";
import { QuickQuoteRecord } from "@/types/quotes";

export function generateQuotePDF(quote: QuickQuoteRecord) {
  const pdf = new jsPDF();

  pdf.text("Preliminary Estimate", 20, 20);
  pdf.text(
    "This estimate is informational only, non-binding, and not an offer.",
    20,
    30
  );

  let y = 45;
  quote.services.forEach((s) => {
    pdf.text(
      `${s.serviceCategory} - ${s.vehicleType}: $${s.estimatedAmount}`,
      20,
      y
    );
    y += 8;
  });

  pdf.text(`Estimated Total: $${quote.total}`, 20, y + 10);

  pdf.text(
    "Final pricing requires confirmation and may change without notice.",
    20,
    y + 20
  );

  pdf.save("preliminary-estimate.pdf");
}
