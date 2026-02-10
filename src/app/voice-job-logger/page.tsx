"use client";
import Link from "next/link";

import { useEffect, useRef, useState } from "react";
import { saveJobLog } from "@/lib/supabaseClient";

type CompanyContext = "xes" | "gxs" | "exquisite_limo";

export default function VoiceLoggerPage() {
  const [companyContext, setCompanyContext] = useState<CompanyContext>("xes");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Transcript (manual for now)
  const [transcript, setTranscript] = useState("");

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);

    try {
      // Ask for microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a mimeType the browser supports
      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType =
        preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);

        if (audioURL) URL.revokeObjectURL(audioURL);
        const url = URL.createObjectURL(blob);
        setAudioURL(url);

        // Stop mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "Microphone permission denied or unavailable. Please allow mic access."
      );
      setIsRecording(false);
    }
  }

  function stopRecording() {
    setError(null);

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== "inactive") recorder.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  function clearRecording() {
    setError(null);
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    setAudioBlob(null);
    chunksRef.current = [];
  }

  async function transcribeRecording() {
  if (!audioBlob) {
    setError("Record audio first, then transcribe.");
    return;
  }

  setError(null);

  try {
    const fd = new FormData();
    fd.append("file", audioBlob, "audio.webm");

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Transcription failed.");

    const text = (data?.text ?? "").toString().trim();
    if (!text) throw new Error("No text returned from transcription.");

    setTranscript(text);
  } catch (err: any) {
    setError(err?.message || "Transcription failed.");
  }
}


  async function handleSave() {
    setError(null);

    // For now, we save the transcript text (typed or transcribed later).
    if (!transcript.trim()) {
      setError("Please type a short job description (or transcribe audio) before saving.");
      return;
    }

    setSaving(true);
    try {
      await saveJobLog({
        company_context: companyContext,
        transcript,
      });

      // Reset
      setTranscript("");
      clearRecording();
      alert("Job log saved.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save job log.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Voice Job Logger</h1>
        <p className="text-zinc-600">
          Record a voice note, then type or transcribe a summary and save it as a job log.
        </p>
      </header>
<header className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Voice Job Logger</h1>
    <p className="text-zinc-600">
      Record or type job details, then save to logs.
    </p>
  </div>

  <div className="flex gap-2">
    <Link href="/" className="px-4 py-2 rounded bg-zinc-100 font-semibold">
      Home
    </Link>
    <Link
      href="/admin/voice"
      className="px-4 py-2 rounded bg-black text-white font-semibold"
    >
      View Logs
    </Link>
  </div>
</header>

      <section className="rounded-xl border bg-white p-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Business</label>
          <select
            className="mt-1 w-full border p-2 rounded"
            value={companyContext}
            onChange={(e) => setCompanyContext(e.target.value as CompanyContext)}
          >
            <option value="xes">Xtreme Environmental Service</option>
            <option value="gxs">Global Xtreme Services</option>
            <option value="exquisite_limo">Exquisite Limo</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-4 py-2 rounded bg-black text-white font-semibold"
              type="button"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-4 py-2 rounded bg-red-600 text-white font-semibold"
              type="button"
            >
              Stop Recording
            </button>
          )}

          <button
            onClick={clearRecording}
            className="px-4 py-2 rounded bg-zinc-100 font-semibold"
            type="button"
            disabled={isRecording || (!audioBlob && !audioURL)}
          >
            Clear
          </button>

          <button
            onClick={transcribeRecording}
            className="px-4 py-2 rounded bg-zinc-100 font-semibold"
            type="button"
            disabled={!audioBlob || isRecording}
            title="Next step: wire Whisper transcription"
          >
            Transcribe (next)
          </button>

          {isRecording && (
            <span className="text-sm text-red-600 font-semibold">● Recording…</span>
          )}
        </div>

        {audioURL && (
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-sm font-medium mb-2">Playback</p>
            <audio controls src={audioURL} className="w-full" />
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 space-y-3">
        <label className="text-sm font-medium">
          Job description / transcript (required for saving)
        </label>
        <textarea
          placeholder="Type the job details here (or paste transcription)..."
          className="w-full border p-3 rounded h-44"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />

        <button
          onClick={handleSave}
          className="px-5 py-3 rounded-md bg-black text-white font-semibold disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Job Log"}
        </button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
