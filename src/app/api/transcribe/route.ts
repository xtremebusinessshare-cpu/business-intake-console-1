import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY env var." }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio file received. Expected form-data key 'file'." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const result = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
    });

    return NextResponse.json({ text: (result as any)?.text ?? "" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Transcription failed." }, { status: 500 });
  }
}
