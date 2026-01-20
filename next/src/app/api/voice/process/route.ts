import { NextRequest, NextResponse } from "next/server";
import { processVoiceModel } from "@/lib/server/voiceModel";
import { uploadToShelby } from "@/lib/server/shelby";

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const owner = formData.get("owner") as string;
    const voiceId = formData.get("voiceId") as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    if (!name || !owner || !voiceId) {
      return NextResponse.json(
        { error: "name, owner, and voiceId are required" },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type;

    // Step 1: Process audio and generate voice model bundle
    console.log("[API] Processing voice model...");
    const bundle = await processVoiceModel({
      audioBuffer,
      mimeType,
      name,
      description,
      owner,
      voiceId,
    });

    // Step 2: Build Shelby URI
    const namespace = "voices";
    const shelbyUri = `shelby://${owner}/${namespace}/${voiceId}`;

    // Step 3: Upload bundle to Shelby
    console.log("[API] Uploading bundle to Shelby...");
    const uploadResult = await uploadToShelby(owner, namespace, voiceId, bundle.files);

    return NextResponse.json({
      success: true,
      uri: uploadResult.uri || shelbyUri,
      cid: uploadResult.cid,
      bundle: {
        config: bundle.config,
        meta: bundle.meta,
      },
    });
  } catch (err: any) {
    console.error("[API] Voice processing error:", err);
    return NextResponse.json(
      { error: "Voice processing failed", message: err.message },
      { status: 500 }
    );
  }
}