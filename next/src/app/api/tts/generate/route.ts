import { NextRequest, NextResponse } from "next/server";
import { downloadFromShelby, verifyAccess } from "@/lib/server/shelby";
import FormData from "form-data";

// Helper function: Generate TTS with a generic/default voice (fallback)
async function generateTTSWithGenericVoice(text: string) {
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  
  if (!ELEVEN_KEY) {
    return NextResponse.json(
      { 
        error: "TTS generation failed",
        message: "ElevenLabs API key not configured"
      },
      { status: 500 }
    );
  }

  try {
    // Use ElevenLabs default voice (Rachel) as fallback
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }),
    });

    if (response.ok) {
      const audio = await response.arrayBuffer();
      return new NextResponse(Buffer.from(audio), {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    }

    // If ElevenLabs fails, return error
    const errorText = await response.text();
    return NextResponse.json(
      { 
        error: "TTS generation failed",
        message: `ElevenLabs TTS failed: ${errorText}`
      },
      { status: response.status }
    );
  } catch (error: any) {
    console.error("[TTS] Generic voice generation error:", error);
    return NextResponse.json(
      { 
        error: "TTS generation failed",
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { modelUri, text, requesterAccount } = await request.json();
    
    if (!modelUri) {
      return NextResponse.json({ error: "modelUri parameter missing" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "text parameter missing" }, { status: 400 });
    }

    // Handle Shelby URIs (voice models stored on Shelby)
    if (modelUri.startsWith("shelby://")) {
      // Verify access on Aptos before loading model
      if (!requesterAccount) {
        return NextResponse.json(
          { error: "requesterAccount required for Shelby URIs" },
          { status: 400 }
        );
      }

      // For Shelby URIs, verify access (owner or purchased)
      // Note: In production, this would query Aptos contract for purchase verification
      const hasAccess = await verifyAccess(modelUri, requesterAccount);
      if (!hasAccess) {
        return NextResponse.json(
          { 
            error: "Access denied", 
            message: "You must purchase this voice from the marketplace to use it." 
          },
          { status: 403 }
        );
      }

      // Download voice model bundle from Shelby
      let embeddingBuffer: Buffer | null = null;
      let configBuffer: Buffer | null = null;
      let previewBuffer: Buffer | null = null;

      try {
        embeddingBuffer = await downloadFromShelby(modelUri, "embedding.bin");
      } catch (e) {
        embeddingBuffer = null;
      }

      try {
        configBuffer = await downloadFromShelby(modelUri, "config.json");
      } catch (e) {
        configBuffer = null;
      }

      try {
        previewBuffer = await downloadFromShelby(modelUri, "preview.wav");
      } catch (e) {
        previewBuffer = null;
      }
      
      if (!embeddingBuffer || !configBuffer) {
        return NextResponse.json(
          { error: "Voice model files not found on Shelby" },
          { status: 404 }
        );
      }

      // For MVP: Use ElevenLabs voice cloning API with the preview audio
      // In production, you would load the embedding into a TTS engine directly
      const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
      if (!ELEVEN_KEY) {
        return NextResponse.json(
          { 
            error: "ElevenLabs API key not configured",
            message: "ElevenLabs is required for Shelby voice model TTS generation"
          },
          { status: 500 }
        );
      }

      // Strategy: Use ElevenLabs voice cloning with preview audio
      // If preview is available, create a temporary voice clone and use it for TTS
      if (previewBuffer && previewBuffer.length > 0) {
        try {
          // Step 1: Create a voice clone using the preview audio
          const formData = new FormData();
          formData.append("files", previewBuffer, {
            filename: "preview.wav",
            contentType: "audio/wav",
          });
          formData.append("name", `shelby-voice-${Date.now()}`);

          const cloneResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
            method: "POST",
            headers: { 
              "xi-api-key": ELEVEN_KEY,
              ...formData.getHeaders(), // Get proper Content-Type and boundary headers
            },
            body: formData,
          });

          if (!cloneResponse.ok) {
            const errorText = await cloneResponse.text();
            console.error("[TTS] Voice cloning failed:", errorText);
            // Fallback to generic voice
            return await generateTTSWithGenericVoice(text);
          }

          const cloneData = await cloneResponse.json();
          const clonedVoiceId = cloneData.voice_id;

          // Step 2: Use the cloned voice for TTS generation
          const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${clonedVoiceId}`, {
            method: "POST",
            headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.5, similarity_boost: 0.85 }
            }),
          });

          if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error("[TTS] TTS generation with cloned voice failed:", errorText);
            // Fallback to generic voice
            return await generateTTSWithGenericVoice(text);
          }

          const audio = await ttsResponse.arrayBuffer();
          return new NextResponse(Buffer.from(audio), {
            headers: {
              "Content-Type": "audio/mpeg",
            },
          });

          // TODO: Optionally delete the temporary cloned voice after use
          // This would require storing the voice_id temporarily and cleaning up
          
        } catch (cloneError) {
          console.error("[TTS] Error during voice cloning process:", cloneError);
          // Fallback to generic voice
          return await generateTTSWithGenericVoice(text);
        }
      } else {
        // No preview audio available - use generic voice
        return await generateTTSWithGenericVoice(text);
      }
    }

    // Parse model URI to determine provider
    if (modelUri.startsWith("eleven:")) {
      // ElevenLabs voice
      const voiceId = modelUri.replace("eleven:", "");
      const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
      
      if (!ELEVEN_KEY) {
        return NextResponse.json(
          { error: "ElevenLabs API key not configured" },
          { status: 500 }
        );
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
        const errorText = await response.text();
        return NextResponse.json(
          { error: "ElevenLabs TTS failed", details: errorText },
          { status: response.status }
        );
      }

      const audio = await response.arrayBuffer();
      return new NextResponse(Buffer.from(audio), {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
      
    } else {
      return NextResponse.json(
        { 
          error: "Unsupported model URI format", 
          message: "Supported formats: 'shelby://...' or 'eleven:...'" 
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "TTS generation failed", message: err.message },
      { status: 500 }
    );
  }
}