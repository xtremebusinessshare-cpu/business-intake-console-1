"use client";

import { v4 as uuid } from "uuid";

export function LimoLineItems({
  items,
  setItems,
  addons,
  setAddons,
}: any) {
  function addItem() {
    setItems([
      ...items,
      {
        id: uuid(),
        serviceCategory: "",
        vehicleType: "",
        passengerCount: 1,
        unit: "hrs",
        quantity: 1,
        estimatedServiceAmount: 0,
      },
    ]);
  }

  function updateItem(id: string, field: string, value: any) {
    setItems(
      items.map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Limo Services</h2>

      {items.map((item: any) => (
        <div
          key={item.id}
          className="grid grid-cols-6 gap-2 border p-3 rounded"
        >
          <select
            value={item.serviceCategory}
            onChange={(e) =>
              updateItem(item.id, "serviceCategory", e.target.value)
            }
          >
            <option value="">Service</option>
            <option value="hourly">Hourly Rental</option>
            <option value="airport">Airport Transfer</option>
            <option value="event">Special Event</option>
          </select>

          <select
            value={item.vehicleType}
            onChange={(e) =>
              updateItem(item.id, "vehicleType", e.target.value)
            }
          >
            <option value="">Vehicle</option>
            <option value="Sprinter">Sprinter</option>
            <option value="SUV">SUV</option>
            <option value="Sedan">Sedan</option>
            <option value="Stretch Limo">Stretch Limo</option>
          </select>

          <input
            type="number"
            placeholder="Passengers"
            value={item.passengerCount}
            onChange={(e) =>
              updateItem(item.id, "passengerCount", Number(e.target.value))
            }
          />

          <input
            type="number"
            placeholder="Qty"
            value={item.quantity}
            onChange={(e) =>
              updateItem(item.id, "quantity", Number(e.target.value))
            }
          />

          <input
            type="number"
            placeholder="Est. $"
            value={item.estimatedServiceAmount}
            onChange={(e) =>
              updateItem(
                item.id,
                "estimatedServiceAmount",
                Number(e.target.value)
              )
            }
          />

        </div>
      ))}

      <button
        onClick={addItem}
        className="px-3 py-1 border rounded text-sm"
      >
        + Add Limo Service
      </button>
    </section>
  );
}
