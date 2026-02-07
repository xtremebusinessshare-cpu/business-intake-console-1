import jsPDF from "jspdf";
import { QuickQuoteRecord } from "@/types/quotes";

export function generateQuotePDF(quote: QuickQuoteRecord) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Business Intake Console — Quote", 20, 20);

  doc.setFontSize(12);

  const customerText = doc.splitTextToSize(`Customer: ${quote.customer_name ?? "N/A"}`, 170);
  doc.text(customerText, 20, 40);

  const serviceText = doc.splitTextToSize(`Service: ${quote.service_type ?? "N/A"}`, 170);
  doc.text(serviceText, 20, 50);

  doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 20, 60);
  doc.text(`Total: $${quote.total.toFixed(2)}`, 20, 70);

  doc.save(`quote-${quote.id}.pdf`);
}
