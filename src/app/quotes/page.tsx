"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  MASTER_QUICK_QUOTE_DISCLAIMER,
  DISCLAIMER_VERSION
} from "@/lib/disclaimers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [addons, setAddons] = useState<AddOnItem[]>([]);
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

  async function saveQuote() {
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        company_context: companyContext,
        estimate_type: estimateType,
        estimated_total: estimatedTotal,
        subtotal_services: servicesTotal,
        subtotal_addons: addonsTotal,
        notes,
        disclaimer_text: MASTER_QUICK_QUOTE_DISCLAIMER,
        disclaimer_version: DISCLAIMER_VERSION
      })
      .select()
      .single();

    if (error) {
      alert("Error saving quote");
      return;
    }

    const quoteId = data.id;

    if (services.length) {
      await supabase.from("quote_service_items").insert(
        services.map((s) => ({
          quote_id: quoteId,
          service_category: s.serviceCategory,
          vehicle_type: s.vehicleType,
          passenger_count: s.passengerCount,
          unit: s.unit,
          quantity: s.quantity,
          estimated_amount: s.estimatedAmount
        }))
      );
    }

    if (addons.length) {
      await supabase.from("quote_addons").insert(
        addons.map((a) => ({
          quote_id: quoteId,
          extra_type: a.extraType,
          unit: a.unit,
          quantity: a.quantity,
          estimated_amount: a.estimatedAmount
        }))
      );
    }

    alert("Preliminary estimate saved (non-binding).");
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <header className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quick Quote</h1>
          <p className="text-sm text-zinc-600">
            Informational, non-binding preliminary estimate
          </p>
        </div>
        <Link href="/" className="text-sm underline">Home</Link>
      </header>

      {/* Context */}
      <section className="border rounded-xl p-4 mb-6 space-y-4">
        <select
          className="w-full border p-2"
          value={companyContext}
          onChange={(e) =>
            setCompanyContext(e.target.value as CompanyContext)
          }
        >
          <option value="xes">Xtreme Environmental Service (XES)</option>
          <option value="gxs">Global Xtreme Services (GXS)</option>
          <option value="exquisite_limo">Exquisite Limo (Estimate)</option>
        </select>

        <select
          className="w-full border p-2"
          value={estimateType}
          onChange={(e) =>
            setEstimateType(e.target.value as EstimateType)
          }
        >
          {companyContext === "exquisite_limo" ? (
            <option value="limo">Limo Service Estimate</option>
          ) : (
            <>
              <option value="remediation">Remediation</option>
              <option value="repairs">Repairs</option>
            </>
          )}
        </select>
      </section>

      {/* Totals */}
      <section className="border rounded-xl p-4 bg-zinc-50 mb-4">
        <div className="flex justify-between font-semibold">
          <span>Estimated Total</span>
          <span>${estimatedTotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          This is a non-binding, preliminary estimate only.
        </p>
      </section>

      {/* Disclaimer */}
      <section className="text-xs text-zinc-500 whitespace-pre-line border p-4 rounded-xl">
        {MASTER_QUICK_QUOTE_DISCLAIMER}
      </section>

      {/* Actions */}
      <div className="mt-6">
        <button
          onClick={saveQuote}
          className="px-5 py-3 rounded-md bg-black text-white font-semibold"
        >
          Save Preliminary Estimate
        </button>
      </div>
    </main>
  );
}

