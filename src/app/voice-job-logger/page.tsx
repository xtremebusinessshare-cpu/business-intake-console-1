"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { saveJobLog, supabase } from "@/lib/supabaseClient";

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

function canRecord() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export default function VoiceJobLoggerPage() {
  const [companyContext, setCompanyContext] = useState<CompanyContext>("xes");

  const [priority, setPriority] = useState<Priority>("Medium");
  const [important, setImportant] = useState(false);

  // User can label the log as typed vs voice (even if pasted transcript)
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

  // Audio (Mode 2)
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

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

    // Clear any previous upload proof
    setAudioUrl(null);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setAudioBlob(null);

    if (!canRecord()) {
      setError("Recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);

        // Stop mic tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mr.start();
      setRecording(true);

      // If they’re recording audio, this is a “voice” log
      setLogType("voice");
    } catch (e: any) {
      setError(e?.message || "Could not access microphone.");
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try {
      mr.stop();
    } catch {
      // ignore
    }
    setRecording(false);
  }

  function clearAudio() {
    setAudioUrl(null);
    setAudioBlob(null);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
  }

  async function uploadAudio(blob: Blob) {
    // Bucket must exist in Supabase Storage: job-audio
    // Recommended: public bucket ON (simplest)
    const key = `job-audio/${companyContext}/${Date.now()}.webm`;

    const { data, error } = await supabase.storage
      .from("job-audio")
      .upload(key, blob, { contentType: "audio/webm", upsert: false });

    if (error) throw error;

    const { data: pub } = supabase.storage.from("job-audio").getPublicUrl(data.path);
    return pub.publicUrl;
  }

  async function onSave() {
    setError(null);
    setSavedMsg(null);

    const hasAnyContent =
      !!notes.trim() ||
      actions.length > 0 ||
      !!client.trim() ||
      !!service.trim() ||
      !!city.trim() ||
      !!sqft.trim() ||
      !!audioBlob;

    if (!hasAnyContent) {
      setError("Add at least a note, an action, basic info, or record audio.");
      return;
    }

    setSaving(true);

    try {
      let finalAudioUrl: string | null = audioUrl;

      // Upload audio (only if we have a blob and not already uploaded)
      if (audioBlob && !finalAudioUrl) {
        setUploadingAudio(true);
        finalAudioUrl = await uploadAudio(audioBlob);
        setAudioUrl(finalAudioUrl);
      }

      // If audio exists, this should be saved as voice even if the user forgot
      const finalSource: LogType = finalAudioUrl ? "voice" : logType;

      await saveJobLog({
        company_context: companyContext,
        transcript: transcriptPreview,
        source: finalSource,
        audio_url: finalAudioUrl,
      });

      setSavedMsg("Saved. You can view it in Logs.");

      // Reset (keep business + priority)
      setImportant(false);
      setClient("");
      setCity("");
      setService("");
      setSqft("");
      setActions([]);
      setActionInput("");
      setNotes("");

      // Reset audio proof (keep logType as-is)
      clearAudio();
    } catch (e: any) {
      setError(e?.message || "Failed to save log.");
    } finally {
      setUploadingAudio(false);
      setSaving(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Logger</h1>
          <p className="text-zinc-600">
            Capture notes + action items and optionally enter quote-ready details (client, service, sqft).
            You can also record audio proof (no OpenAI needed).
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
          <li>
            If you record audio, the log will automatically be saved as <strong>voice</strong> and store an audio link.
          </li>
        </ul>
        <p className="text-xs text-zinc-500">
          Tip: Everything is stored as one transcript so it stays flexible now and can become “smart” later.
        </p>
      </div>

      {/* Audio Proof (Mode 2) */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Audio proof (optional)</p>
            <p className="text-xs text-zinc-500">
              Records in your browser and uploads to Supabase Storage bucket <code>job-audio</code>.
            </p>
          </div>

          <div className="flex gap-2">
            {!recording ? (
              <button
                type="button"
                className="px-4 py-2 rounded bg-zinc-100 font-semibold"
                onClick={startRecording}
              >
                Start recording
              </button>
            ) : (
              <button
                type="button"
                className="px-4 py-2 rounded bg-black text-white font-semibold"
                onClick={stopRecording}
              >
                Stop recording
              </button>
            )}

            {(audioBlob || audioUrl) && (
              <button
                type="button"
                className="px-4 py-2 rounded bg-zinc-100 font-semibold"
                onClick={clearAudio}
              >
                Clear audio
              </button>
            )}
          </div>
        </div>

        {!canRecord() ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Your browser does not support microphone recording on this page.
          </p>
        ) : null}

        {audioPreviewUrl && (
          <div className="space-y-2">
            <audio controls src={audioPreviewUrl} className="w-full" />
            {audioUrl ? (
              <p className="text-xs text-zinc-600 break-all">Uploaded URL: {audioUrl}</p>
            ) : (
              <p className="text-xs text-zinc-500">
                Audio will upload when you click <strong>Save Log</strong>.
              </p>
            )}
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
              disabled={!!audioBlob || !!audioUrl || recording} // audio implies voice
              title={audioBlob || audioUrl ? "Recording audio forces voice type." : undefined}
            >
              <option value="typed">Typed</option>
              <option value="voice">Voice</option>
            </select>
            {(audioBlob || audioUrl || recording) && (
              <p className="text-xs text-zinc-500 mt-1">Audio recorded → saved as voice.</p>
            )}
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
              <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
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
            <button type="button" className="w-full rounded-lg bg-zinc-100 px-3 py-2 font-semibold" onClick={addAction}>
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
                  <button type="button" className="text-xs text-red-600" onClick={() => setActions((p) => p.filter((_, i) => i !== idx))}>
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

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg bg-black text-white px-5 py-3 font-semibold disabled:opacity-60"
            disabled={saving || uploadingAudio}
            onClick={onSave}
          >
            {uploadingAudio ? "Uploading audio…" : saving ? "Saving…" : "Save Log"}
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
