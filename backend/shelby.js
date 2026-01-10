/**
 * Shelby RPC integration for backend
 * Handles actual Shelby RPC calls and blob operations
 * 
 * Note: This is a placeholder implementation. In production, you would
 * integrate with actual Shelby RPC endpoints based on their protocol.
 */

import fetch from "node-fetch";
import FormData from "form-data";

// Shelby RPC configuration
const SHELBY_RPC_URL = process.env.SHELBY_RPC_URL || "https://rpc-testnet.shelby.net";
const SHELBY_NETWORK = process.env.SHELBY_NETWORK || "testnet";

/**
 * Upload bundle to Shelby via RPC
 * 
 * In production, this would use Shelby's actual RPC protocol:
 * - POST to /rpc/v1/upload
 * - Include authentication/signing
 * - Handle chunking for large files
 * - Return immutable content-addressed URI
 */
export async function uploadToShelby(account, namespace, voiceId, bundleFiles) {
  try {
    // Parse Shelby URI
    const uri = `shelby://${account}/${namespace}/${voiceId}`;

    // Prepare multipart form data
    const form = new FormData();
    
    // Add all bundle files
    for (const [filename, buffer] of Object.entries(bundleFiles)) {
      form.append(filename, buffer, { filename });
    }

    // Upload to Shelby RPC
    // NOTE: This is a placeholder. Actual Shelby RPC would have:
    // - Authentication headers (Aptos signature)
    // - Specific endpoint structure
    // - Content-addressing/immutability guarantees
    const response = await fetch(`${SHELBY_RPC_URL}/rpc/v1/upload`, {
      method: "POST",
      headers: {
        ...form.getHeaders(),
        "X-Aptos-Account": account,
        "X-Shelby-Namespace": namespace,
        "X-Voice-Id": voiceId,
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shelby upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    // Shelby returns the immutable URI (may differ from requested URI if content-addressed)
    return {
      uri: result.uri || uri,
      cid: result.cid, // Content ID if content-addressed
      size: result.size,
      uploadedAt: Date.now(),
    };
  } catch (error) {
    console.error("[Shelby] Upload error:", error);
    throw error;
  }
}

/**
 * Download file from Shelby via RPC
 * 
 * All reads go through Shelby RPC, never directly to Storage Providers
 */
export async function downloadFromShelby(uri, filename) {
  try {
    // Parse URI
    const match = uri.match(/^shelby:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid Shelby URI: ${uri}`);
    }

    const [, account, namespace, voiceId] = match;

    // Download from Shelby RPC
    // NOTE: This is a placeholder. Actual Shelby RPC would:
    // - Verify access permissions via Aptos
    // - Handle range requests for streaming
    // - Return file chunks from Storage Providers
    const response = await fetch(`${SHELBY_RPC_URL}/rpc/v1/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uri,
        filename,
        account,
        namespace,
        voiceId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shelby download failed: ${response.status} ${errorText}`);
    }

    return response.buffer();
  } catch (error) {
    console.error("[Shelby] Download error:", error);
    throw error;
  }
}

/**
 * Check if account has access to a Shelby resource
 * Verifies permissions by checking Aptos payment contract
 * 
 * Architecture:
 * - Owner always has access
 * - Other users must have purchased access (verified via Aptos contract)
 * 
 * Note: For MVP, we rely on frontend localStorage tracking.
 * In production, you should query Aptos contract events to verify purchases on-chain.
 */
export async function verifyAccess(uri, requesterAccount) {
  try {
    // Parse URI
    const match = uri.match(/^shelby:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) {
      return false;
    }

    const [, ownerAccount] = match;

    // Owner always has access
    if (ownerAccount.toLowerCase() === requesterAccount.toLowerCase()) {
      return true;
    }

    // TODO: Query Aptos payment contract events to verify purchase
    // For MVP, we trust frontend localStorage tracking + payment transaction
    // In production, you would:
    // 1. Query payment contract events for PaymentMade events
    // 2. Filter by requesterAccount and ownerAccount
    // 3. Verify transaction exists and is confirmed
    // 4. Check that payment was for this specific voice (via modelUri)
    
    // For now, allow access (frontend will have verified purchase via localStorage)
    // This is acceptable for MVP but should be hardened in production
    return true;
  } catch (error) {
    console.error("[Shelby] Access verification error:", error);
    return false;
  }
}

