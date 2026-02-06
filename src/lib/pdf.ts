import jsPDF from "jspdf";
import { QuickQuoteRecord } from "@/types/quotes";

export function generateQuotePDF(quote: QuickQuoteRecord) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Business Intake Console — Quote", 20, 20);

  doc.setFontSize(12);
  doc.text(`Customer: ${quote.customer_name}`, 20, 40);
  doc.text(`Service: ${quote.service_type}`, 20, 50);
  doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 20, 60);
  doc.text(`Total: $${quote.total.toFixed(2)}`, 20, 70);

  doc.save(`quote-${quote.id}.pdf`);
}
