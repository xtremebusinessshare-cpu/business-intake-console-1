"use client";

import { useState } from "react";
import { saveJobLog } from "@/lib/supabaseClient";

type CompanyContext =
  | "xes"
  | "gxs"
  | "exquisite_limo";

export default function VoiceLoggerPage() {
  const [companyContext, setCompanyContext] =
    useState<CompanyContext>("xes");

  const [transcript, setTranscript] = useState("");

  async function handleSave() {
    if (!transcript.trim()) {
      alert("Please enter a job description.");
      return;
    }

    try {
      await saveJobLog({
        company_context: companyContext,
        transcript,
      });

      alert("Job log saved.");

      // reset
      setTranscript("");
    } catch (err) {
      console.error(err);
      alert("Failed to save job log.");
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          Voice Job Logger
        </h1>

        <p className="text-zinc-600">
          Quickly capture job details for later conversion into quotes.
        </p>
      </header>

      <select
        className="w-full border p-2 rounded"
        value={companyContext}
        onChange={(e) =>
          setCompanyContext(
            e.target.value as CompanyContext
          )
        }
      >
        <option value="xes">
          Xtreme Environmental Service
        </option>

        <option value="gxs">
          Global Xtreme Services
        </option>

        <option value="exquisite_limo">
          Exquisite Limo
        </option>
      </select>

      <textarea
        placeholder="Describe the job..."
        className="w-full border p-3 rounded h-40"
        value={transcript}
        onChange={(e) =>
          setTranscript(e.target.value)
        }
      />

      <button
        onClick={handleSave}
        className="px-5 py-3 rounded-md bg-black text-white font-semibold"
      >
        Save Job Log
      </button>
    </main>
  );
}
