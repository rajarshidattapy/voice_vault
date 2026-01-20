import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVEN_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: { "xi-api-key": ELEVEN_KEY },
    });

    if (!response.ok) {
      const text = await response.text();
      return new NextResponse(text, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch voices", message: err.message },
      { status: 500 }
    );
  }
}