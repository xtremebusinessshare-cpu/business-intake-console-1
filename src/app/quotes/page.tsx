"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Business = "xes" | "gxs" | "exquisite_limo";
type EstimateType =
  | "remediation"
  | "cleaning_restoration"
  | "demolition_tear_out"
  | "combo"
  | "repairs_rebuild"
  | "limo";

type LossType = "water" | "mold" | "fire" | "biohazard" | "odor" | "unknown";

type Unit =
  | "sq_ft"
  | "linear_ft"
  | "room"
  | "unit"
  | "flat"
  | "day"
  | "hour"
  | "mile";

type LineItem = {
  id: string;
  name: string;
  area: string; // room/floor/zone (scope clarity)
  unit: Unit;
  qty: number; // must be > 0 (rules)
  unitPrice: number; // estimator amount per unit
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function money(n: number) {
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: "sq_ft", label: "Sq Ft" },
  { value: "linear_ft", label: "Linear Ft" },
  { value: "room", label: "Room" },
  { value: "unit", label: "Unit" },
  { value: "flat", label: "Flat" },
  { value: "day", label: "Day" },
  { value: "hour", label: "Hour" },
  { value: "mile", label: "Mile" },
];

export default function QuotesEstimatorPage() {
  const router = useRouter();

  // Quote context
  const [business, setBusiness] = useState<Business>("xes");
  const [estimateType, setEstimateType] = useState<EstimateType>("remediation");
  const [lossType, setLossType] = useState<LossType>("unknown");

  // Property-service fields (XES / GXS)
  const [jobAddress, setJobAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Limo fields (Exquisite Limo)
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [serviceDate, setServiceDate] = useState(""); // yyyy-mm-dd
  const [startTime, setStartTime] = useState(""); // hh:mm
  const [tripType, setTripType] = useState<
    "airport_transfer" | "hourly_rental" | "one_way" | "round_trip" | "special_event"
  >("hourly_rental");
  const [vehicleType, setVehicleType] = useState<
    "sedan" | "luxury_suv" | "suburban" | "sprinter_van" | "stretch_limo" | "party_bus"
  >("sedan");
  const [passengers, setPassengers] = useState<number>(1);
  const [estHours, setEstHours] = useState<number>(0);
  const [estMiles, setEstMiles] = useState<number>(0);
  const [stops, setStops] = useState<number>(0);

  // Line items (start with 1 blank service row visible)
  const [services, setServices] = useState<LineItem[]>([
    { id: uid(), name: "", area: "", unit: "sq_ft", qty: 0, unitPrice: 0 },
  ]);
  const [addons, setAddons] = useState<LineItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Keep estimate type aligned with business
  React.useEffect(() => {
    setError(null);
    setSavedId(null);

    if (business === "exquisite_limo") {
      setEstimateType("limo");
      setLossType("unknown");
    } else if (business === "gxs") {
      if (estimateType === "limo") setEstimateType("repairs_rebuild");
    } else if (business === "xes") {
      if (estimateType === "limo") setEstimateType("remediation");
    }
  }, [business]);

  const servicesSubtotal = useMemo(() => {
    return services.reduce((sum, li) => sum + (li.qty || 0) * (li.unitPrice || 0), 0);
  }, [services]);

  const addonsSubtotal = useMemo(() => {
    return addons.reduce((sum, li) => sum + (li.qty || 0) * (li.unitPrice || 0), 0);
  }, [addons]);

  const total = useMemo(() => servicesSubtotal + addonsSubtotal, [servicesSubtotal, addonsSubtotal]);

  function updateLine(
    kind: "services" | "addons",
    id: string,
    patch: Partial<LineItem>
  ) {
    const setter = kind === "services" ? setServices : setAddons;
    setter((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  }

  function addLine(kind: "services" | "addons") {
    const newLine: LineItem = { id: uid(), name: "", area: "", unit: "sq_ft", qty: 0, unitPrice: 0 };
    if (kind === "services") setServices((p) => [...p, newLine]);
    else setAddons((p) => [...p, newLine]);
  }

  function removeLine(kind: "services" | "addons", id: string) {
    const setter = kind === "services" ? setServices : setAddons;
    setter((prev) => prev.filter((li) => li.id !== id));
  }

  function validate(): string | null {
    // Shared rules: at least one service line item is required; qty > 0 (doc rules)
    const hasValidService = services.some(
      (s) => s.name.trim().length > 0 && (s.qty ?? 0) > 0
    );
    if (!hasValidService) return "Add at least one service with a name and quantity greater than zero.";

    // Property-service required: job location
    if (business !== "exquisite_limo" && jobAddress.trim().length < 5) {
      return "Job address / location is required for this business line.";
    }

    // Limo required: pickup, date, time, passengers
    if (business === "exquisite_limo") {
      if (pickup.trim().length < 3) return "Pickup location is required.";
      if (!serviceDate) return "Date of service is required.";
      if (!startTime) return "Start time is required.";
      if (passengers < 1) return "Passenger count must be at least 1.";
      // Duration or distance: at least one should be entered (hours or miles)
      if ((estHours ?? 0) <= 0 && (estMiles ?? 0) <= 0) {
        return "Enter estimated hours or estimated mileage for limo quotes.";
      }
    }

    // Qty must be > 0 when line has a name (clean rules)
    const badQty = [...services, ...addons].find(
      (li) => li.name.trim().length > 0 && (li.qty ?? 0) <= 0
    );
    if (badQty) return "All named line items must have quantity greater than zero.";

    return null;
  }

  async function saveQuote() {
    setError(null);
    setSavedId(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        status: "NEW",
        business,
        estimateType,
        lossType: business === "xes" ? lossType : undefined,

        // property
        jobAddress: business === "exquisite_limo" ? undefined : jobAddress,
        notes,

        // limo
        limo:
          business === "exquisite_limo"
            ? {
                pickup,
                dropoff,
                serviceDate,
                startTime,
                tripType,
                vehicleType,
                passengers,
                estHours,
                estMiles,
                stops,
              }
            : undefined,

        // scope lines
        services: services.map((s) => ({
          ...s,
          lineTotal: (s.qty || 0) * (s.unitPrice || 0),
        })),
        addons: addons.map((a) => ({
          ...a,
          lineTotal: (a.qty || 0) * (a.unitPrice || 0),
        })),

        totals: {
          servicesSubtotal,
          addonsSubtotal,
          total,
        },

        createdAtISO: new Date().toISOString(),
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Save failed (${res.status})`);
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string };
      const id = data?.id || null;
      setSavedId(id);

      // If you support /quotes/[id], route there
      if (id) router.push(`/quotes/${id}`);
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const isLimo = business === "exquisite_limo";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Estimator</h1>
          <p className="mt-1 text-sm text-gray-600">
            Preliminary estimate intake (scope-based). Not final pricing or invoice language.
          </p>
        </div>

        {/* Context */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Business</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2"
                value={business}
                onChange={(e) => setBusiness(e.target.value as Business)}
              >
                <option value="xes">Xtreme Environmental Services (XES)</option>
                <option value="gxs">Global Xtreme Services (GXS)</option>
                <option value="exquisite_limo">Exquisite Limo Services</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Estimate Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2"
                value={estimateType}
                onChange={(e) => setEstimateType(e.target.value as EstimateType)}
                disabled={isLimo}
                title={isLimo ? "Limo uses limo estimate type" : ""}
              >
                {business === "xes" && (
                  <>
                    <option value="remediation">Remediation</option>
                    <option value="cleaning_restoration">Cleaning / Restoration</option>
                    <option value="demolition_tear_out">Demolition / Tear-Out</option>
                    <option value="combo">Combo</option>
                  </>
                )}
                {business === "gxs" && (
                  <>
                    <option value="repairs_rebuild">Repairs / Rebuild</option>
                    <option value="combo">Combo</option>
                  </>
                )}
                {business === "exquisite_limo" && <option value="limo">Limo</option>}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Loss Type (optional)</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2"
                value={lossType}
                onChange={(e) => setLossType(e.target.value as LossType)}
                disabled={business !== "xes"}
                title={business !== "xes" ? "Loss type typically applies to remediation quotes" : ""}
              >
                <option value="unknown">Unknown</option>
                <option value="water">Water</option>
                <option value="mold">Mold</option>
                <option value="fire">Fire</option>
                <option value="biohazard">Biohazard</option>
                <option value="odor">Odor</option>
              </select>
            </div>
          </div>

          {!isLimo ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Job address / location</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={jobAddress}
                  onChange={(e) => setJobAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any constraints, access notes, visible conditions, etc."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Pickup location</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Pickup address or landmark"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Drop-off</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder='Destination or "around town"'
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Date of service</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Start time</label>
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Trip type</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2"
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as any)}
                >
                  <option value="airport_transfer">Airport transfer</option>
                  <option value="hourly_rental">Hourly rental</option>
                  <option value="one_way">One-way</option>
                  <option value="round_trip">Round trip</option>
                  <option value="special_event">Special event</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Vehicle type</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                >
                  <option value="sedan">Sedan</option>
                  <option value="luxury_suv">Luxury SUV</option>
                  <option value="suburban">Suburban</option>
                  <option value="sprinter_van">Sprinter van</option>
                  <option value="stretch_limo">Stretch limo</option>
                  <option value="party_bus">Party bus</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Passengers</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value || 0))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Estimated hours</label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={estHours}
                  onChange={(e) => setEstHours(Number(e.target.value || 0))}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Estimated miles</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={estMiles}
                  onChange={(e) => setEstMiles(Number(e.target.value || 0))}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Stops (optional)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={stops}
                  onChange={(e) => setStops(Number(e.target.value || 0))}
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Event details, timing constraints, special requests, etc."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Services */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Service Line Items</h2>
            <button
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
              onClick={() => addLine("services")}
              type="button"
            >
              + Add Service
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Add at least one service. Use units + quantities (no labor hours required unless you choose “hour”).
          </p>

          <div className="mt-4 space-y-3">
            {services.map((li, idx) => {
              const lineTotal = (li.qty || 0) * (li.unitPrice || 0);
              return (
                <div key={li.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <label className="text-xs font-medium text-gray-600">Service</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                        value={li.name}
                        onChange={(e) => updateLine("services", li.id, { name: e.target.value })}
                        placeholder={isLimo ? "Airport transfer, hourly rental, etc." : "Mold remediation, drywall, painting..."}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-xs font-medium text-gray-600">Area / Location</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                        value={li.area}
                        onChange={(e) => updateLine("services", li.id, { area: e.target.value })}
                        placeholder="Room, floor, zone (optional)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-600">Unit</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2"
                        value={li.unit}
                        onChange={(e) => updateLine("services", li.id, { unit: e.target.value as Unit })}
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-xs font-medium text-gray-600">Qty</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                        value={li.qty}
                        onChange={(e) => updateLine("services", li.id, { qty: Number(e.target.value || 0) })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-600">Amount / Unit</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                        value={li.unitPrice}
                        onChange={(e) =>
                          updateLine("services", li.id, { unitPrice: Number(e.target.value || 0) })
                        }
                      />
                    </div>

                    <div className="md:col-span-12 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Line Total: <span className="font-semibold">{money(lineTotal)}</span>
                      </div>

                      <button
                        type="button"
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                        onClick={() => {
                          // keep at least 1 visible row for services
                          if (services.length <= 1) {
                            updateLine("services", li.id, { name: "", area: "", qty: 0, unitPrice: 0 });
                            return;
                          }
                          removeLine("services", li.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end text-sm">
            <span className="text-gray-600 mr-2">Services Subtotal:</span>
            <span className="font-semibold text-gray-900">{money(servicesSubtotal)}</span>
          </div>
        </div>

        {/* Add-ons */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add-Ons (Optional)</h2>
            <button
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
              onClick={() => addLine("addons")}
              type="button"
            >
              + Add Add-On
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Fees, rentals, disposal, waiting time, extra stops, gratuity (if included), etc.
          </p>

          {addons.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              No add-ons yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {addons.map((li) => {
                const lineTotal = (li.qty || 0) * (li.unitPrice || 0);
                return (
                  <div key={li.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <label className="text-xs font-medium text-gray-600">Add-on</label>
                        <input
                          className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                          value={li.name}
                          onChange={(e) => updateLine("addons", li.id, { name: e.target.value })}
                          placeholder="Waiting time, disposal, equipment rental..."
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-xs font-medium text-gray-600">Area / Location</label>
                        <input
                          className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                          value={li.area}
                          onChange={(e) => updateLine("addons", li.id, { area: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-600">Unit</label>
                        <select
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2"
                          value={li.unit}
                          onChange={(e) => updateLine("addons", li.id, { unit: e.target.value as Unit })}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="text-xs font-medium text-gray-600">Qty</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                          value={li.qty}
                          onChange={(e) => updateLine("addons", li.id, { qty: Number(e.target.value || 0) })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-600">Amount / Unit</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                          value={li.unitPrice}
                          onChange={(e) =>
                            updateLine("addons", li.id, { unitPrice: Number(e.target.value || 0) })
                          }
                        />
                      </div>

                      <div className="md:col-span-12 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Line Total: <span className="font-semibold">{money(lineTotal)}</span>
                        </div>

                        <button
                          type="button"
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                          onClick={() => removeLine("addons", li.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end text-sm">
            <span className="text-gray-600 mr-2">Add-ons Subtotal:</span>
            <span className="font-semibold text-gray-900">{money(addonsSubtotal)}</span>
          </div>
        </div>

        {/* Totals + Disclaimer + Save */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Preliminary Estimate Disclaimer</h3>
              <p className="mt-2 text-sm text-gray-700">
                This is a preliminary estimate only, based on visible conditions and provided information.
                It is not a final invoice, contract, or guaranteed price. Final pricing may change after
                inspection, scope confirmation, route/traffic, availability, and any required approvals.
              </p>
            </div>

            <div className="w-full md:w-80 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Services</span>
                <span className="font-medium">{money(servicesSubtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm text-gray-700">
                <span>Add-ons</span>
                <span className="font-medium">{money(addonsSubtotal)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                <span className="text-sm font-semibold text-gray-900">Estimated Total</span>
                <span className="text-base font-semibold text-gray-900">{money(total)}</span>
              </div>

              {error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={saveQuote}
                disabled={saving}
                className="mt-4 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Quote (Status: NEW)"}
              </button>

              {savedId && (
                <div className="mt-3 text-sm text-gray-700">
                  Saved: <span className="font-semibold">{savedId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Tip: Keep services and supplies/add-ons separated (helps clarity now and AI automation later).
        </div>
      </div>
    </div>
  );
}
