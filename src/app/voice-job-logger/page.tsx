"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CompanyContext = "xes" | "gxs" | "exquisite_limo";
type Priority = "Low" | "Medium" | "High";
type LogType = "typed" | "voice";

function buildTranscript(input: {
  priority: Priority;
  important: boolean;
  client: string;
  city: string;
  service: string;
  sqft: string;
  actions: string[];
  notes: string;
}) {
  const lines: string[] = [];

  lines.push(`Priority: ${input.priority}`);
  if (input.important) lines.push(`Important: Yes`);

  if (input.client.trim()) lines.push(`Client: ${input.client.trim()}`);
  if (input.city.trim()) lines.push(`City: ${input.city.trim()}`);
  if (input.service.trim()) lines.push(`Service: ${input.service.trim()}`);
  if (input.sqft.trim()) lines.push(`SqFt: ${input.sqft.trim()}`);

  input.actions
    .map((a) => a.trim())
    .filter(Boolean)
    .forEach((a) => lines.push(`Action: ${a}`));

  if (input.notes.trim()) {
    lines.push("");
    lines.push(input.notes.trim());
  }

  return lines.join("\n");
}

function safeFilePart(v: string) {
  return (v || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export default function VoiceJobLoggerPage() {
  const [companyContext, setCompanyContext] = useState<CompanyContext>("xes");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [important, setImportant] = useState(false);
  const [logType, setLogType] = useState<LogType>("typed");

  const [client, setClient] = useState("");
  const [city, setCity] = useState("");
  const [service, setService] = useState("");
  const [sqft, setSqft] = useState("");

  const [actionInput, setActionInput] = useState("");
  const [actions, setActions] = useState<string[]>([]);

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Audio state ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const transcriptPreview = useMemo(() => {
    return buildTranscript({
      priority,
      important,
      client,
      city,
      service,
      sqft,
      actions,
      notes,
    });
  }, [priority, important, client, city, service, sqft, actions, notes]);

  function addAction() {
    const v = actionInput.trim();
    if (!v) return;
    setActions((p) => [...p, v]);
    setActionInput("");
  }

  async function startRecording() {
    setError(null);
    setSavedMsg(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Your browser does not support audio recording.");
        return;
      }

      // Reset any previous audio
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setAudioUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Some browsers prefer explicit mimeType; fall back if unsupported
      const options: MediaRecorderOptions = {};
      const preferred = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(preferred)) {
        options.mimeType = preferred;
      }

      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // stop tracks so mic turns off
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);

        // If you recorded, it’s a voice log
        setLogType("voice");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      setError(e?.message || "Could not start recording (mic permissions?).");
    }
  }

  function stopRecording() {
    try {
      const r = mediaRecorderRef.current;
      if (!r) return;

      if (r.state !== "inactive") r.stop();
      setIsRecording(false);
      mediaRecorderRef.current = null;
    } catch {
      setIsRecording(false);
    }
  }

  async function uploadAudio() {
    setError(null);
    setSavedMsg(null);

    if (!audioBlob) {
      setError("No audio to upload yet. Record first.");
      return;
    }

    setAudioUploading(true);
    try {
      const ext = (audioBlob.type || "").includes("webm") ? "webm" : "wav";
      const filename = `${new Date().toISOString()}_${safeFilePart(companyContext)}_${safeFilePart(
        client || "no-client"
      )}.${ext}`;

      const path = `${companyContext}/${filename}`;

      const { error: upErr } = await supabase.storage
        .from("job-audio")
        .upload(path, audioBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: audioBlob.type || "audio/webm",
        });

      if (upErr) throw upErr;

      // Public bucket -> public URL
      const pub = supabase.storage.from("job-audio").getPublicUrl(path);
      const publicUrl = pub?.data?.publicUrl;

      if (!publicUrl) throw new Error("Upload succeeded but could not generate public URL.");

      setAudioUrl(publicUrl);
      setSavedMsg("Audio uploaded and attached to this log.");
    } catch (e: any) {
      setError(e?.message || "Audio upload failed.");
    } finally {
      setAudioUploading(false);
    }
  }

  function clearAudio() {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setAudioUrl(null);
  }

  async function onSave() {
    setError(null);
    setSavedMsg(null);

    // Allow saving notes-only, or actions-only, or client/service-only
    const hasTypedInfo =
  notes.trim() ||
  actions.length > 0 ||
  client.trim() ||
  service.trim() ||
  city.trim() ||
  sqft.trim();

const hasAudio = Boolean(audioBlob) || Boolean(audioUrl);

if (!hasTypedInfo && !hasAudio) {
  setError("Add at least a note/action OR record audio.");
  return;
}


    setSaving(true);
    try {
      // Send structured columns + transcript + audio_url
      const res = await fetch("/api/job-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_context: companyContext,
          transcript: transcriptPreview,
          source: logType, // "typed" | "voice"

          priority,
          important,

          client_name: client.trim() || null,
          city: city.trim() || null,
          service_type: service.trim() || null,
          sqft: sqft.trim() || null,

          // store actions in meta too (optional, but helpful later)
          meta: { actions },

          audio_url: audioUrl ?? null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save log.");

      // If API returns id, great (you already confirmed it does)
      setSavedMsg(`Saved. Log ID: ${data?.log?.id || "ok"} (View in Logs)`);

      // Reset (keep business, priority, logType)
      setImportant(false);
      setClient("");
      setCity("");
      setService("");
      setSqft("");
      setActions([]);
      setActionInput("");
      setNotes("");

      // keep audio? usually reset after save
      clearAudio();
      setLogType("typed");
    } catch (e: any) {
      setError(e?.message || "Failed to save log.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Logger</h1>
          <p className="text-zinc-600">
            Capture notes + action items. Optional: record/upload audio proof and convert to quotes later.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/" className="px-4 py-2 rounded bg-zinc-100 font-semibold">
            Home
          </Link>
          <Link href="/admin/voice" className="px-4 py-2 rounded bg-black text-white font-semibold">
            View Logs
          </Link>
        </div>
      </header>

      {/* Instructions */}
      <div className="rounded-xl border bg-white p-4 space-y-2">
        <p className="font-semibold">How to use this</p>
        <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
          <li>Use this like a “central notes + tasks” hub for the business.</li>
          <li>Enter client/service/sqft when you want to convert into a quote later.</li>
          <li>Use Actions for reminders: “find invoice”, “adjust water meter”, “check shelves”.</li>
          <li>Mark Important + set Priority so you can sort and focus fast in Logs.</li>
          <li>Record audio if you want “proof / reference”. Upload attaches a link to the log.</li>
        </ul>
        <p className="text-xs text-zinc-500">
          Tip: Everything is saved as transcript + structured fields so quotes can prefill later.
        </p>
      </div>

      {/* Audio Proof */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold">Audio Proof (optional)</p>
            <p className="text-xs text-zinc-500">
              Record → (optional) Upload → Save Log. Upload creates an audio_url stored in job_logs.
            </p>
          </div>

          <div className="flex gap-2">
            {!isRecording ? (
              <button
                type="button"
                className="rounded-lg bg-black text-white px-4 py-2 font-semibold"
                onClick={startRecording}
              >
                Start Recording
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg bg-red-600 text-white px-4 py-2 font-semibold"
                onClick={stopRecording}
              >
                Stop
              </button>
            )}

            <button
              type="button"
              className="rounded-lg bg-zinc-100 px-4 py-2 font-semibold disabled:opacity-60"
              onClick={uploadAudio}
              disabled={audioUploading || !audioBlob}
            >
              {audioUploading ? "Uploading…" : "Upload Audio"}
            </button>

            <button
              type="button"
              className="rounded-lg bg-zinc-100 px-4 py-2 font-semibold disabled:opacity-60"
              onClick={clearAudio}
              disabled={!audioBlob && !audioUrl}
            >
              Clear
            </button>
          </div>
        </div>

        {audioPreviewUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <audio controls src={audioPreviewUrl} className="w-full" />
          </div>
        )}

        {audioUrl && (
          <div className="text-sm">
            <p className="font-medium">Attached audio link</p>
            <a className="text-blue-600 underline break-all" href={audioUrl} target="_blank" rel="noreferrer">
              {audioUrl}
            </a>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium">Business</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={companyContext}
              onChange={(e) => setCompanyContext(e.target.value as CompanyContext)}
            >
              <option value="xes">XES</option>
              <option value="gxs">GXS</option>
              <option value="exquisite_limo">Exquisite Limo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Log type</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={logType}
              onChange={(e) => setLogType(e.target.value as LogType)}
            >
              <option value="typed">Typed</option>
              <option value="voice">Voice</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Priority</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={important}
                onChange={(e) => setImportant(e.target.checked)}
              />
              Mark as Important
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium">Client (optional)</label>
            <input className="mt-1 w-full rounded-lg border p-2" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">City (optional)</label>
            <input className="mt-1 w-full rounded-lg border p-2" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Service (optional)</label>
            <input className="mt-1 w-full rounded-lg border p-2" value={service} onChange={(e) => setService(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">SqFt (optional)</label>
            <input className="mt-1 w-full rounded-lg border p-2" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="e.g. 1200" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-10">
            <label className="text-sm font-medium">Action item (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="e.g. find invoice for customer"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAction();
                }
              }}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              type="button"
              className="w-full rounded-lg bg-zinc-100 px-3 py-2 font-semibold"
              onClick={addAction}
            >
              + Add
            </button>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="text-sm">
            <p className="font-semibold">Actions</p>
            <ul className="list-disc pl-5 text-zinc-700">
              {actions.map((a, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3">
                  <span>{a}</span>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => setActions((p) => p.filter((_, i) => i !== idx))}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Notes (what happened / what to remember)</label>
          <textarea
            className="mt-1 w-full rounded-lg border p-2"
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type notes here (or paste in voice transcript later)."
          />
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-zinc-50 border p-3">
          <p className="text-sm font-semibold mb-2">Saved transcript preview</p>
          <pre className="whitespace-pre-wrap text-xs text-zinc-700">{transcriptPreview}</pre>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            className="rounded-lg bg-black text-white px-5 py-3 font-semibold disabled:opacity-60"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save Log"}
          </button>

          {savedMsg && <span className="text-sm text-green-700">{savedMsg}</span>}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
