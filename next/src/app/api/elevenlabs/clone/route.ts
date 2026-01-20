import { NextRequest, NextResponse } from "next/server";
import FormData from "form-data";

export async function POST(request: NextRequest) {
  try {
    const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVEN_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    // Validate required fields
    if (!audioFile) {
      return NextResponse.json(
        { 
          error: "Audio file is required",
          received: {
            hasFile: false,
            contentType: request.headers.get("content-type") || "not set"
          }
        },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { 
          error: "Voice name is required",
          message: "Please provide a 'name' field in the form data",
          debug: {
            contentType: request.headers.get("content-type") || "not set",
            hasFile: !!audioFile,
            fileName: audioFile?.name
          }
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Prepare form data for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append("files", audioBuffer, {
      filename: audioFile.name || "audio.wav",
      contentType: audioFile.type || "audio/wav",
    });
    elevenLabsFormData.append("name", name);
    
    // Description can include sample text to help with voice cloning quality
    if (description && description.trim()) {
      elevenLabsFormData.append("description", description.trim());
    }

    // Call ElevenLabs voice cloning API
    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_KEY,
        ...elevenLabsFormData.getHeaders(),
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Voice Clone] ElevenLabs API error:", errorText);
      return NextResponse.json(
        { 
          error: "Voice cloning failed", 
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      voice_id: data.voice_id,
      name: data.name,
      message: "Voice cloned successfully! You can now use this voice for TTS.",
    });
  } catch (err: any) {
    console.error("[Voice Clone] Error:", err);
    const errorMessage = err?.message || err?.toString() || "Unknown error occurred";
    return NextResponse.json(
      { 
        error: "Voice cloning failed", 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}