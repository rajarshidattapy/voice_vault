import { NextRequest, NextResponse } from "next/server";
import { uploadToShelby } from "@/lib/server/shelby";

export async function POST(request: NextRequest) {
  try {
    const uri = request.headers.get("x-shelby-uri");
    const account = request.headers.get("x-aptos-account");

    if (!uri || !account) {
      return NextResponse.json(
        { error: "Shelby URI and Aptos account are required" },
        { status: 400 }
      );
    }

    // Parse URI
    const match = uri.match(/^shelby:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid Shelby URI format" },
        { status: 400 }
      );
    }

    const [, parsedAccount, namespace, voiceId] = match;

    // Verify account matches
    if (parsedAccount.toLowerCase() !== account.toLowerCase()) {
      return NextResponse.json(
        { error: "Account mismatch" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();

    // Prepare bundle files
    const bundleFiles: Record<string, Buffer> = {};
    
    const embeddingFile = formData.get("embedding.bin") as File;
    if (embeddingFile) {
      bundleFiles["embedding.bin"] = Buffer.from(await embeddingFile.arrayBuffer());
    }

    const configFile = formData.get("config.json") as File;
    if (configFile) {
      bundleFiles["config.json"] = Buffer.from(await configFile.arrayBuffer());
    }

    const metaFile = formData.get("meta.json") as File;
    if (metaFile) {
      bundleFiles["meta.json"] = Buffer.from(await metaFile.arrayBuffer());
    }

    const previewFile = formData.get("preview.wav") as File;
    if (previewFile) {
      bundleFiles["preview.wav"] = Buffer.from(await previewFile.arrayBuffer());
    }

    if (Object.keys(bundleFiles).length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Upload to Shelby
    const result = await uploadToShelby(account, namespace, voiceId, bundleFiles);

    return NextResponse.json({
      success: true,
      uri: result.uri,
      cid: result.cid,
      size: result.size,
    });
  } catch (err: any) {
    console.error("[API] Shelby upload error:", err);
    return NextResponse.json(
      { error: "Shelby upload failed", message: err.message },
      { status: 500 }
    );
  }
}