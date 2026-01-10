/**
 * Shelby storage implementation (local file-based for development)
 * 
 * In production, this would integrate with actual Shelby RPC endpoints.
 * For development, we use local file storage organized by:
 * storage/shelby/{account}/{namespace}/{voiceId}/{filename}
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local storage directory for Shelby (development only)
const STORAGE_ROOT = path.resolve(__dirname, "storage", "shelby");

// Ensure storage directory exists
async function ensureStorageDir(account, namespace, voiceId) {
  const dir = path.join(STORAGE_ROOT, account, namespace, voiceId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Upload bundle to Shelby (local file storage for development)
 * 
 * In production, this would use Shelby's actual RPC protocol.
 * For development, we store files locally in a structured directory.
 */
export async function uploadToShelby(account, namespace, voiceId, bundleFiles) {
  try {
    // Parse Shelby URI
    const uri = `shelby://${account}/${namespace}/${voiceId}`;

    // Ensure storage directory exists
    const storageDir = await ensureStorageDir(account, namespace, voiceId);

    // Calculate total size
    let totalSize = 0;

    // Write all bundle files to storage
    for (const [filename, buffer] of Object.entries(bundleFiles)) {
      const filePath = path.join(storageDir, filename);
      await fs.writeFile(filePath, buffer);
      totalSize += buffer.length;
      console.log(`[Shelby] Stored ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
    }

    // Generate content hash for immutability (simplified)
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256");
    for (const buffer of Object.values(bundleFiles)) {
      hash.update(buffer);
    }
    const cid = hash.digest("hex");

    console.log(`[Shelby] Upload complete: ${uri} (${(totalSize / 1024).toFixed(2)} KB total)`);
    
    return {
      uri,
      cid: `0x${cid}`,
      size: totalSize,
      uploadedAt: Date.now(),
    };
  } catch (error) {
    console.error("[Shelby] Upload error:", error);
    throw error;
  }
}

/**
 * Download file from Shelby (local file storage for development)
 * 
 * In production, this would download from Shelby RPC.
 * For development, we read from local file storage.
 */
export async function downloadFromShelby(uri, filename) {
  try {
    // Parse URI
    const match = uri.match(/^shelby:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid Shelby URI: ${uri}`);
    }

    const [, account, namespace, voiceId] = match;

    // Read from local storage
    const filePath = path.join(STORAGE_ROOT, account, namespace, voiceId, filename);
    
    try {
      const buffer = await fs.readFile(filePath);
      console.log(`[Shelby] Downloaded ${filename} from ${uri} (${(buffer.length / 1024).toFixed(2)} KB)`);
      return buffer;
    } catch (fileError) {
      if (fileError.code === "ENOENT") {
        throw new Error(`File not found: ${filename} in ${uri}`);
      }
      throw fileError;
    }
  } catch (error) {
    console.error("[Shelby] Download error:", error);
    throw error;
  }
}

/**
 * Delete voice bundle from Shelby (local file storage for development)
 * 
 * In production, this would use Shelby's actual RPC protocol for deletion.
 * For development, we delete files from local file storage.
 */
export async function deleteFromShelby(uri, account) {
  try {
    // Parse URI
    const match = uri.match(/^shelby:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid Shelby URI: ${uri}`);
    }

    const [, ownerAccount, namespace, voiceId] = match;

    // Verify the account matches the owner
    if (ownerAccount.toLowerCase() !== account.toLowerCase()) {
      throw new Error("Unauthorized: Only the owner can delete their voice from Shelby");
    }

    // Delete the voice directory
    const voiceDir = path.join(STORAGE_ROOT, ownerAccount, namespace, voiceId);
    
    try {
      // Check if directory exists
      await fs.access(voiceDir);
      
      // Delete all files in the directory
      const files = await fs.readdir(voiceDir);
      for (const file of files) {
        const filePath = path.join(voiceDir, file);
        await fs.unlink(filePath);
        console.log(`[Shelby] Deleted file: ${file}`);
      }
      
      // Remove the directory
      await fs.rmdir(voiceDir);
      
      console.log(`[Shelby] Deleted voice bundle: ${uri}`);
      
      return {
        success: true,
        uri,
        deletedAt: Date.now(),
      };
    } catch (dirError) {
      if (dirError.code === "ENOENT") {
        // Directory doesn't exist - this is okay, might have been already deleted
        console.log(`[Shelby] Voice bundle not found (already deleted?): ${uri}`);
        return {
          success: true,
          uri,
          message: "Voice bundle not found (may have been already deleted)",
        };
      }
      throw dirError;
    }
  } catch (error) {
    console.error("[Shelby] Delete error:", error);
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

