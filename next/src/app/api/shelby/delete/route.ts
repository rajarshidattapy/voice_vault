import { NextRequest, NextResponse } from "next/server";
import { deleteFromShelby } from "@/lib/server/shelby";

export async function POST(request: NextRequest) {
  try {
    const { uri, account } = await request.json();

    if (!uri || !account) {
      return NextResponse.json(
        { error: "URI and account are required" },
        { status: 400 }
      );
    }

    // Verify it's a Shelby URI
    if (!uri.startsWith("shelby://")) {
      return NextResponse.json(
        { error: "Invalid URI format. Must be a Shelby URI (shelby://...)" },
        { status: 400 }
      );
    }

    // Delete from Shelby (this function verifies ownership)
    const result = await deleteFromShelby(uri, account);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API] Shelby delete error:", err);
    return NextResponse.json(
      { error: "Shelby delete failed", message: err.message },
      { status: 500 }
    );
  }
}