import { NextRequest, NextResponse } from "next/server";
import { downloadFromShelby, verifyAccess, FileNotFoundError } from "@/lib/server/shelby";

export async function POST(request: NextRequest) {
  try {
    const { uri, filename, requesterAccount } = await request.json();

    if (!uri || !filename) {
      return NextResponse.json(
        { error: "URI and filename are required" },
        { status: 400 }
      );
    }

    // Verify access (if requesterAccount provided)
    if (requesterAccount) {
      const hasAccess = await verifyAccess(uri, requesterAccount);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Download from Shelby
    const fileBuffer = await downloadFromShelby(uri, filename);

    // Set appropriate content type
    let contentType = "application/octet-stream";
    if (filename.endsWith(".json")) {
      contentType = "application/json";
    } else if (filename.endsWith(".wav")) {
      contentType = "audio/wav";
    } else if (filename.endsWith(".bin")) {
      contentType = "application/octet-stream";
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (err: any) {
    console.error("[API] Shelby download error:", {
      name: err.name,
      code: err.code,
      message: err.message,
      stack: err.stack?.split('\n')[0]
    });
    
    // Check if it's a file not found error (404)
    const isFileNotFound = 
      err.name === "FileNotFoundError" || 
      err.code === "ENOENT" || 
      (err.message && err.message.toLowerCase().includes("not found")) ||
      (err.message && err.message.toLowerCase().includes("enoent"));
    
    if (isFileNotFound) {
      console.log("[API] Returning 404 for file not found");
      return NextResponse.json(
        { 
          error: "File not found", 
          message: err.message || `File ${filename} not found in ${uri}` 
        },
        { status: 404 }
      );
    }
    
    // Other errors return 500
    console.log("[API] Returning 500 for other error");
    return NextResponse.json(
      { error: "Shelby download failed", message: err.message },
      { status: 500 }
    );
  }
}