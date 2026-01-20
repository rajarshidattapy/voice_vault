import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVEN_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const { voiceId, text } = await request.json();
    
    if (!voiceId) {
      return NextResponse.json({ error: "voiceId missing" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "text missing" }, { status: 400 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.85 }
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new NextResponse(text, { status: response.status });
    }

    const audio = await response.arrayBuffer();
    return new NextResponse(Buffer.from(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "TTS failed", message: err.message },
      { status: 500 }
    );
  }
}