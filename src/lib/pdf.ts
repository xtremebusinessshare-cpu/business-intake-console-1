import jsPDF from "jspdf";
import { QuickQuoteRecord } from "@/types/quotes";

export function generateQuotePDF(quote: QuickQuoteRecord) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Business Intake Console — Quote", 20, 20);

  doc.setFontSize(12);

  // Multi-line customer name
  const customerText = doc.splitTextToSize(
    `Customer: ${quote.customer_name ?? "N/A"}`,
    170
  );
  doc.text(customerText, 20, 40);

  // Multi-line service type
  const serviceText = doc.splitTextToSize(
    `Service: ${quote.service_type ?? "N/A"}`,
    170
  );
  doc.text(serviceText, 20, 50);

  // Date and total
  doc.text(
    `Date: ${new Date(quote.created_at ?? Date.now()).toLocaleDateString()}`,
    20,
    60
  );
  doc.text(`Total: $${quote.total.toFixed(2)}`, 20, 70);

  // Save PDF
  doc.save(`quote-${quote.id ?? "new"}.pdf`);
}