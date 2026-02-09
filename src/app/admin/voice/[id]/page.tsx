import { supabase } from "@/lib/supabaseClient";

async function fetchLog(id: string) {
  const { data } = await supabase
    .from("job_logs")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

export default async function VoiceLogDetail({
  params,
}: {
  params: { id: string };
}) {
  const log = await fetchLog(params.id);

  if (!log) {
    return (
      <main className="p-8">
        Log not found.
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          Job Log
        </h1>

        <p className="text-zinc-500">
          {log.company_context.toUpperCase()}
        </p>
      </header>

      <section className="bg-white border rounded-xl p-6 whitespace-pre-wrap">
        {log.transcript}
      </section>

      <section className="text-xs text-zinc-500">
        Created:
        {" "}
        {new Date(
          log.created_at
        ).toLocaleString()}
      </section>
    </main>
  );
}
