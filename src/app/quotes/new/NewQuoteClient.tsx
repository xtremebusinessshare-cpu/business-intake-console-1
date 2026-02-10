"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Business = "xes" | "gxs" | "exquisite_limo";
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
  unit: Unit;
  qty: number;
  unitPrice: number;
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function extractFields(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const get = (label: string) => {
    const rx = new RegExp(`^${label}\\s*:\\s*(.+)$`, "i");
    const hit = lines.find((l) => rx.test(l));
    if (!hit) return null;
    return hit.replace(rx, "$1").trim() || null;
  };

  const client = get("Client") ?? get("Customer") ?? get("Name");
  const city = get("City");
  const service = get("Service") ?? get("Service Type");
  const sqftRaw = get("SqFt") ?? get("Sq Ft") ?? get("Square Feet") ?? get("Square Footage");
  const sqft = sqftRaw ? sqftRaw.replace(/[^\d.]/g, "") : null;

  return { client, city, service, sqft };
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

export default function NewQuoteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const logId = searchParams.get("logId");

  const [business, setBusiness] = useState<Business>("xes");
  const [estimateType, setEstimateType] = useState<string>("remediation");
  const [clientName, setClientName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Limo meta
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [vehicleType, setVehicleType] = useState("sedan");
  const [passengers, setPassengers] = useState<number>(1);
  const [estHours, setEstHours] = useState<number>(0);
  const [estMiles, setEstMiles] = useState<number>(0);

  const [services, setServices] = useState<LineItem[]>([
    { id: uid(), name: "", unit: "sq_ft", qty: 0, unitPrice: 0 },
  ]);
  const [addons, setAddons] = useState<LineItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLimo = business === "exquisite_limo";

  // ✅ Prefill from job log
  useEffect(() => {
    async function prefillFromLog() {
      if (!logId) return;

      try {
        const res = await fetch(`/api/job-logs/${logId}`, { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load job log.");

        // Your API returns fields at top-level (id/company_context/transcript/...)
        const log = data;

        const transcript = (log?.transcript ?? "").toString();
        const f = extractFields(transcript);

        // Business + estimateType hint
        if (log?.company_context) {
          setBusiness(log.company_context as Business);

          if (log.company_context === "exquisite_limo") setEstimateType("limo");
          else if (log.company_context === "gxs") setEstimateType("repairs");
          else setEstimateType("remediation");
        }

        // Notes: append transcript
        if (transcript.trim()) {
          setNotes((prev) => {
            const header = `--- From Job Log (${logId}) ---\n`;
            return prev?.trim() ? `${prev}\n\n${header}${transcript}` : `${header}${transcript}`;
          });
        }

        // Client: only fill if empty
        if (f.client) {
          setClientName((prev) => (prev.trim() ? prev : f.client!));
        }

        // Job address: seed with city only if empty and not limo
        if (!isLimo && f.city) {
          setJobAddress((prev) => (prev.trim() ? prev : f.city!));
        }

        // First service name: only fill if empty
        if (f.service) {
          setServices((prev) => {
            if (!prev?.length) return prev;
            if (prev[0].name?.trim()) return prev;
            const first = prev[0];
            return [{ ...first, name: f.service!.slice(0, 100) }, ...prev.slice(1)];
          });
        }

        // SqFt -> qty (only if unit is sq_ft and qty is empty)
        if (f.sqft) {
          const sqftNum = Number(f.sqft);
          if (Number.isFinite(sqftNum) && sqftNum > 0) {
            setServices((prev) => {
              if (!prev?.length) return prev;
              const first = prev[0];
              if (first.unit !== "sq_ft") return prev;
              if (first.qty && first.qty > 0) return prev;
              return [{ ...first, qty: sqftNum }, ...prev.slice(1)];
            });
          }
        }
      } catch (e) {
        console.error("Prefill from log failed:", e);
      }
    }

    prefillFromLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  const servicesSubtotal = useMemo(
    () => services.reduce((sum, li) => sum + (li.qty || 0) * (li.unitPrice || 0), 0),
    [services]
  );
  const addonsSubtotal = useMemo(
    () => addons.reduce((sum, li) => sum + (li.qty || 0) * (li.unitPrice || 0), 0),
    [addons]
  );
  const total = useMemo(() => servicesSubtotal + addonsSubtotal, [servicesSubtotal, addonsSubtotal]);

  function updateLine(kind: "services" | "addons", id: string, patch: Partial<LineItem>) {
    const setter = kind === "services" ? setServices : setAddons;
    setter((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  }

  function addLine(kind: "services" | "addons") {
    const newLine: LineItem = { id: uid(), name: "", unit: "sq_ft", qty: 0, unitPrice: 0 };
    if (kind === "services") setServices((p) => [...p, newLine]);
    else setAddons((p) => [...p, newLine]);
  }

  function removeLine(kind: "services" | "addons", id: string) {
    const setter = kind === "services" ? setServices : setAddons;
    setter((prev) => prev.filter((li) => li.id !== id));
  }

  function validate(): string | null {
    const hasService = services.some((s) => s.name.trim() && (s.qty ?? 0) > 0);
    if (!hasService) return "Add at least one service with a name and quantity > 0.";

    if (!isLimo && jobAddress.trim().length < 2) return "Job address (or at least city) is required.";

    if (isLimo) {
      if (pickup.trim().length < 3) return "Pickup is required.";
      if (!serviceDate) return "Service date is required.";
      if (!startTime) return "Start time is required.";
      if ((estHours ?? 0) <= 0 && (estMiles ?? 0) <= 0) return "Enter estimated hours or estimated miles.";
    }

    return null;
  }

  async function onSave() {
    setError(null);
    const v = validate();
    if (v) return setError(v);

    setSaving(true);
    try {
      const payload = {
        status: "NEW",
        business,
        estimateType,
        clientName: clientName || null,
        jobAddress: isLimo ? undefined : jobAddress,
        notes: notes || null,

        limo: isLimo
          ? { pickup, dropoff, serviceDate, startTime, vehicleType, passengers, estHours, estMiles }
          : undefined,

        services: services.map((s) => ({
          name: s.name,
          unit: s.unit,
          qty: s.qty,
          unitPrice: s.unitPrice,
          lineTotal: (s.qty || 0) * (s.unitPrice || 0),
        })),

        addons: addons.map((a) => ({
          name: a.name,
          unit: a.unit,
          qty: a.qty,
          unitPrice: a.unitPrice,
          lineTotal: (a.qty || 0) * (a.unitPrice || 0),
        })),

        totals: { servicesSubtotal, addonsSubtotal, total },

        disclaimerText:
          "This is a preliminary estimate only, not a final invoice/contract. Final pricing may change after inspection and scope confirmation.",
        disclaimerVersion: "v1",
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed.");

      if (data?.id) router.push(`/quotes/${data.id}`);
      else throw new Error("Save succeeded but no id returned.");
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">New Quote</h1>

      <div className="rounded-xl border p-4 bg-white space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Business</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={business}
              onChange={(e) => setBusiness(e.target.value as Business)}
            >
              <option value="xes">XES</option>
              <option value="gxs">GXS</option>
              <option value="exquisite_limo">Exquisite Limo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Estimate Type</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={estimateType}
              onChange={(e) => setEstimateType(e.target.value)}
              disabled={isLimo}
            />
            {isLimo && <p className="text-xs text-gray-500 mt-1">Limo uses its own quote style.</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Client name (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
        </div>

        {!isLimo ? (
          <div>
            <label className="text-sm font-medium">Job address</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={jobAddress}
              onChange={(e) => setJobAddress(e.target.value)}
              placeholder="123 Main St, City, State (or City only)"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Pickup</label>
              <input className="mt-1 w-full rounded-lg border p-2" value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Dropoff</label>
              <input className="mt-1 w-full rounded-lg border p-2" value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <input type="date" className="mt-1 w-full rounded-lg border p-2" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Start time</label>
              <input type="time" className="mt-1 w-full rounded-lg border p-2" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Vehicle</label>
              <input className="mt-1 w-full rounded-lg border p-2" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Passengers</label>
              <input type="number" min={1} className="mt-1 w-full rounded-lg border p-2" value={passengers} onChange={(e) => setPassengers(Number(e.target.value || 1))} />
            </div>
            <div>
              <label className="text-sm font-medium">Est hours</label>
              <input type="number" min={0} step={0.25} className="mt-1 w-full rounded-lg border p-2" value={estHours} onChange={(e) => setEstHours(Number(e.target.value || 0))} />
            </div>
            <div>
              <label className="text-sm font-medium">Est miles</label>
              <input type="number" min={0} step={1} className="mt-1 w-full rounded-lg border p-2" value={estMiles} onChange={(e) => setEstMiles(Number(e.target.value || 0))} />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Notes (optional)</label>
          <textarea className="mt-1 w-full rounded-lg border p-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Services */}
      <div className="rounded-xl border p-4 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Services</h2>
          <button className="rounded-lg bg-gray-900 text-white px-3 py-2 text-sm" onClick={() => addLine("services")} type="button">
            + Add Service
          </button>
        </div>

        {services.map((s) => (
          <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 border rounded-lg p-3">
            <div className="md:col-span-5">
              <label className="text-xs font-medium text-gray-600">Service</label>
              <input className="mt-1 w-full rounded-lg border p-2" value={s.name} onChange={(e) => updateLine("services", s.id, { name: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Unit</label>
              <select className="mt-1 w-full rounded-lg border p-2 bg-white" value={s.unit} onChange={(e) => updateLine("services", s.id, { unit: e.target.value as Unit })}>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Qty</label>
              <input type="number" min={0} step={0.01} className="mt-1 w-full rounded-lg border p-2" value={s.qty} onChange={(e) => updateLine("services", s.id, { qty: Number(e.target.value || 0) })} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Amount / Unit</label>
              <input type="number" min={0} step={0.01} className="mt-1 w-full rounded-lg border p-2" value={s.unitPrice} onChange={(e) => updateLine("services", s.id, { unitPrice: Number(e.target.value || 0) })} />
            </div>

            <div className="md:col-span-1 flex items-end justify-end">
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => {
                  if (services.length <= 1) {
                    updateLine("services", s.id, { name: "", qty: 0, unitPrice: 0 });
                    return;
                  }
                  removeLine("services", s.id);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-end text-sm">
          <span className="mr-2 text-gray-600">Services subtotal:</span>
          <span className="font-semibold">{money(servicesSubtotal)}</span>
        </div>
      </div>

      {/* Add-ons */}
      <div className="rounded-xl border p-4 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add-ons (optional)</h2>
          <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm" onClick={() => addLine("addons")} type="button">
            + Add Add-on
          </button>
        </div>

        {addons.length === 0 ? (
          <p className="text-sm text-gray-600">No add-ons.</p>
        ) : (
          addons.map((a) => (
            <div key={a.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 border rounded-lg p-3">
              <div className="md:col-span-5">
                <label className="text-xs font-medium text-gray-600">Add-on</label>
                <input className="mt-1 w-full rounded-lg border p-2" value={a.name} onChange={(e) => updateLine("addons", a.id, { name: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Unit</label>
                <select className="mt-1 w-full rounded-lg border p-2 bg-white" value={a.unit} onChange={(e) => updateLine("addons", a.id, { unit: e.target.value as Unit })}>
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Qty</label>
                <input type="number" min={0} step={0.01} className="mt-1 w-full rounded-lg border p-2" value={a.qty} onChange={(e) => updateLine("addons", a.id, { qty: Number(e.target.value || 0) })} />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-600">Amount / Unit</label>
                <input type="number" min={0} step={0.01} className="mt-1 w-full rounded-lg border p-2" value={a.unitPrice} onChange={(e) => updateLine("addons", a.id, { unitPrice: Number(e.target.value || 0) })} />
              </div>

              <div className="md:col-span-1 flex items-end justify-end">
                <button type="button" className="text-sm text-red-600" onClick={() => removeLine("addons", a.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}

        <div className="flex justify-end text-sm">
          <span className="mr-2 text-gray-600">Add-ons subtotal:</span>
          <span className="font-semibold">{money(addonsSubtotal)}</span>
        </div>
      </div>

      {/* Total + Save */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Estimated total</p>
            <p className="text-2xl font-bold">{money(total)}</p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-gray-900 text-white px-4 py-3 font-medium disabled:opacity-60"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save Quote"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
