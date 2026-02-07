"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { saveQuote } from "@/lib/supabaseClient";
import {
  MASTER_QUICK_QUOTE_DISCLAIMER,
  DISCLAIMER_VERSION,
} from "@/lib/disclaimers";

type CompanyContext = "xes" | "gxs" | "exquisite_limo";
type EstimateType = "remediation" | "repairs" | "limo";
type Unit = "hrs" | "mile" | "flat";

type ServiceItem = {
  id: string;
  serviceCategory: string;
  vehicleType?: string;
  passengerCount?: number;
  unit: Unit;
  quantity: number;
  estimatedAmount: number;
};

type AddOnItem = {
  id: string;
  extraType: string;
  unit: Unit;
  quantity: number;
  estimatedAmount: number;
};

export default function QuotesPage() {
  const [companyContext, setCompanyContext] =
    useState<CompanyContext>("xes");

  const [estimateType, setEstimateType] =
    useState<EstimateType>("remediation");

  const [services] = useState<ServiceItem[]>([]);
  const [addons] = useState<AddOnItem[]>([]);
  const [notes, setNotes] = useState("");

  const servicesTotal = useMemo(
    () => services.reduce((s, i) => s + i.estimatedAmount, 0),
    [services]
  );

  const addonsTotal = useMemo(
    () => addons.reduce((s, i) => s + i.estimatedAmount, 0),
    [addons]
  );

  const estimatedTotal = servicesTotal + addonsTotal;

  async function handleSave() {
    try {
      await saveQuote({
        company_context: companyContext,
        estimate_type: estimateType,
        estimated_total: estimatedTotal,
        subtotal_services: servicesTotal,
        subtotal_addons: addonsTotal,
        notes,
        disclaimer_text: MASTER_QUICK_QUOTE_DISCLAIMER,
        disclaimer_version: DISCLAIMER_VERSION,
        services,
        addons,
      });

      alert("Preliminary estimate saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save quote.");
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <header className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quick Quote</h1>
          <p className="text-sm text-zinc-600">
            Non-binding preliminary estimate
          </p>
        </div>

        <Link href="/" className="underline text-sm">
          Home
        </Link>
      </header>

      <section className="border rounded-xl p-4 mb-6 space-y-4">
        <select
          className="w-full border p-2"
          value={companyContext}
          onChange={(e) =>
            setCompanyContext(e.target.value as CompanyContext)
          }
        >
          <option value="xes">Xtreme Environmental Service</option>
          <option value="gxs">Global Xtreme Services</option>
          <option value="exquisite_limo">Exquisite Limo</option>
        </select>

        <textarea
          placeholder="Notes..."
          className="w-full border p-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <section className="border rounded-xl p-4 bg-zinc-50 mb-4">
        <div className="flex justify-between font-semibold">
          <span>Estimated Total</span>
          <span>${estimatedTotal.toFixed(2)}</span>
        </div>
      </section>

      <section className="text-xs whitespace-pre-line border p-4 rounded-xl">
        {MASTER_QUICK_QUOTE_DISCLAIMER}
      </section>

      <button
        onClick={handleSave}
        className="mt-6 px-5 py-3 rounded-md bg-black text-white font-semibold"
      >
        Save Estimate
      </button>
    </main>
  );
}
