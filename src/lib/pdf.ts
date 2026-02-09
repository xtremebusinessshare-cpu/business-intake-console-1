import jsPDF from "jspdf";

type ServiceItem = {
  service_category?: string | null;
  unit?: string | null;
  quantity?: number | null;
  estimated_amount?: number | null;
  vehicle_type?: string | null;
  passenger_count?: number | null;
};

type AddonItem = {
  extra_type?: string | null;
  unit?: string | null;
  quantity?: number | null;
  estimated_amount?: number | null;
};

type QuotePDFInput = {
  id: string;
  company_context?: string | null;
  estimate_type?: string | null;
  client_name?: string | null;
  notes?: string | null;
  created_at?: string | null;

  services?: ServiceItem[];
  addons?: AddonItem[];

  totals?: {
    services_subtotal?: number;
    addons_subtotal?: number;
    estimated_total?: number;
  };

  estimated_total?: number | null;
  subtotal_services?: number | null;
  subtotal_addons?: number | null;

  disclaimer_text?: string | null;

  meta?: {
    job_address?: string;
    loss_type?: string;
    limo?: {
      pickup?: string;
      dropoff?: string;
      serviceDate?: string;
      startTime?: string;
      vehicleType?: string;
      passengers?: number;
      estHours?: number;
      estMiles?: number;
      stops?: number;
    };
  };
};

function money(n?: number | null) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

export function generateQuotePDF(quote: QuotePDFInput) {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text("Business Intake Console — Quote", 20, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Quote ID: ${quote.id}`, 20, y);
  y += 6;

  if (quote.created_at) {
    doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 20, y);
    y += 6;
  }

  doc.setFontSize(12);
  doc.text(`Business: ${quote.company_context ?? "—"}`, 20, y);
  y += 6;

  doc.text(`Estimate Type: ${quote.estimate_type ?? "—"}`, 20, y);
  y += 6;

  if (quote.client_name) {
    doc.text(`Client: ${quote.client_name}`, 20, y);
    y += 6;
  }

  if (quote.meta?.job_address) {
    const addr = doc.splitTextToSize(`Job Address: ${quote.meta.job_address}`, 170);
    doc.text(addr, 20, y);
    y += addr.length * 6;
  }

  if (quote.meta?.loss_type) {
    doc.text(`Loss Type: ${quote.meta.loss_type}`, 20, y);
    y += 6;
  }

  if (quote.company_context === "exquisite_limo" && quote.meta?.limo) {
    doc.setFontSize(13);
    doc.text("Limo Trip Details", 20, y);
    y += 8;

    doc.setFontSize(11);
    const limo = quote.meta.limo;

    if (limo.pickup) doc.text(`Pickup: ${limo.pickup}`, 20, y), (y += 6);
    if (limo.dropoff) doc.text(`Dropoff: ${limo.dropoff}`, 20, y), (y += 6);

    if (limo.serviceDate || limo.startTime) {
      doc.text(
        `Date / Time: ${limo.serviceDate ?? "—"} ${limo.startTime ?? ""}`,
        20,
        y
      );
      y += 6;
    }

    if (limo.vehicleType) doc.text(`Vehicle: ${limo.vehicleType}`, 20, y), (y += 6);
    if (typeof limo.passengers === "number")
      doc.text(`Passengers: ${limo.passengers}`, 20, y), (y += 6);

    if (typeof limo.estHours === "number")
      doc.text(`Estimated Hours: ${limo.estHours}`, 20, y), (y += 6);
    if (typeof limo.estMiles === "number")
      doc.text(`Estimated Miles: ${limo.estMiles}`, 20, y), (y += 6);
    if (typeof limo.stops === "number")
      doc.text(`Stops: ${limo.stops}`, 20, y), (y += 6);
  }

  y += 4;
  doc.setFontSize(13);
  doc.text("Service Line Items", 20, y);
  y += 8;

  doc.setFontSize(11);
  if (!quote.services || quote.services.length === 0) {
    doc.text("No service items.", 20, y);
    y += 6;
  } else {
    quote.services.forEach((s, idx) => {
      const line = `${idx + 1}. ${s.service_category ?? "Service"} — ${s.quantity ?? 0} ${
        s.unit ?? ""
      } — ${money(s.estimated_amount)}`;
      const wrapped = doc.splitTextToSize(line, 170);
      doc.text(wrapped, 20, y);
      y += wrapped.length * 6;
    });
  }

  if (quote.addons && quote.addons.length > 0) {
    y += 4;
    doc.setFontSize(13);
    doc.text("Add-ons", 20, y);
    y += 8;

    doc.setFontSize(11);
    quote.addons.forEach((a, idx) => {
      const line = `${idx + 1}. ${a.extra_type ?? "Add-on"} — ${a.quantity ?? 0} ${
        a.unit ?? ""
      } — ${money(a.estimated_amount)}`;
      const wrapped = doc.splitTextToSize(line, 170);
      doc.text(wrapped, 20, y);
      y += wrapped.length * 6;
    });
  }

  y += 6;
  doc.setFontSize(12);

  const servicesSubtotal = quote.totals?.services_subtotal ?? quote.subtotal_services ?? 0;
  const addonsSubtotal = quote.totals?.addons_subtotal ?? quote.subtotal_addons ?? 0;
  const estimatedTotal = quote.totals?.estimated_total ?? quote.estimated_total ?? 0;

  doc.text(`Services Subtotal: ${money(servicesSubtotal)}`, 20, y);
  y += 6;
  doc.text(`Add-ons Subtotal: ${money(addonsSubtotal)}`, 20, y);
  y += 6;

  doc.setFontSize(13);
  doc.text(`Estimated Total: ${money(estimatedTotal)}`, 20, y);
  y += 10;

  if (quote.disclaimer_text) {
    doc.setFontSize(10);
    const disclaimer = doc.splitTextToSize(`Disclaimer: ${quote.disclaimer_text}`, 170);
    doc.text(disclaimer, 20, y);
    y += disclaimer.length * 5;
  }

  doc.save(`quote-${quote.id}.pdf`);
}
