import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

export const runtime = "nodejs"; // important for file handling

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY env var." },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file received. Expected form-data key 'file'." },
        { status: 400 }
      );
    }

    // Convert Blob -> Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Name matters for mime/format inference
    const upload = await toFile(buffer, "audio.webm");

    const openai = new OpenAI({ apiKey });

    // Speech-to-text transcription
    // Models supported include: gpt-4o-mini-transcribe, gpt-4o-transcribe, whisper-1
    const transcription = await openai.audio.transcriptions.create({
      file: upload,
      model: "gpt-4o-mini-transcribe",
      // If you want plain text instead of JSON:
      // response_format: "text",
    });

    // openai-node returns object; for json format it's typically { text: "..." }
    const text =
      typeof transcription === "string"
        ? transcription
        : (transcription as any)?.text;

    return NextResponse.json({ text: text ?? "" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Transcription failed." },
      { status: 500 }
    );
  }
}
