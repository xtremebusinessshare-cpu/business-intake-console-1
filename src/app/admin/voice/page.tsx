import { supabase } from "@/lib/supabaseClient";

export default async function AdminVoicePage() {
  const { data: logs, error } = await supabase
    .from("voice_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Admin — Voice Logs</h1>
        <p className="text-red-600">Failed to load voice logs.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin — Voice Logs</h1>

      {logs.length === 0 ? (
        <p className="text-zinc-500">No job logs yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border rounded-xl p-4 bg-white"
            >
              <p className="whitespace-pre-line text-sm">
                {log.transcript}
              </p>

              <p className="text-xs text-zinc-500 mt-2">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
