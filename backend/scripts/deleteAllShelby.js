/**
 * Script to delete all Shelby storage files
 * Run with: node backend/scripts/deleteAllShelby.js
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_ROOT = path.resolve(__dirname, "..", "storage", "shelby");

async function deleteDirectory(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await deleteDirectory(fullPath);
      } else {
        await fs.unlink(fullPath);
        console.log(`  Deleted file: ${entry.name}`);
      }
    }
    
    await fs.rmdir(dirPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false; // Directory doesn't exist
    }
    throw error;
  }
}

async function deleteAllShelbyFiles() {
  try {
    console.log(`🗑️  Deleting all Shelby files from: ${STORAGE_ROOT}\n`);
    
    // Check if storage directory exists
    try {
      await fs.access(STORAGE_ROOT);
    } catch {
      console.log("✓ No Shelby storage directory found. Nothing to delete.");
      return;
    }
    
    // Read all accounts
    const accounts = await fs.readdir(STORAGE_ROOT);
    
    if (accounts.length === 0) {
      console.log("✓ No accounts found. Storage is already empty.");
      return;
    }
    
    let totalDeleted = 0;
    
    for (const account of accounts) {
      const accountPath = path.join(STORAGE_ROOT, account);
      console.log(`📁 Processing account: ${account}`);
      
      // Read namespaces
      const namespaces = await fs.readdir(accountPath);
      
      for (const namespace of namespaces) {
        const namespacePath = path.join(accountPath, namespace);
        console.log(`  📂 Processing namespace: ${namespace}`);
        
        // Read voice IDs
        const voiceIds = await fs.readdir(namespacePath);
        
        for (const voiceId of voiceIds) {
          const voicePath = path.join(namespacePath, voiceId);
          console.log(`    🗣️  Deleting voice: ${voiceId}`);
          
          if (await deleteDirectory(voicePath)) {
            totalDeleted++;
            console.log(`    ✓ Deleted voice: ${voiceId}`);
          }
        }
        
        // Try to remove namespace directory
        try {
          await fs.rmdir(namespacePath);
          console.log(`  ✓ Removed namespace: ${namespace}`);
        } catch (err) {
          // Ignore if not empty
        }
      }
      
      // Try to remove account directory
      try {
        await fs.rmdir(accountPath);
        console.log(`✓ Removed account directory: ${account}`);
      } catch (err) {
        // Ignore if not empty
      }
    }
    
    // Try to remove shelby directory
    try {
      await fs.rmdir(STORAGE_ROOT);
      console.log(`✓ Removed shelby storage directory`);
    } catch (err) {
      // Ignore if not empty
    }
    
    console.log(`\n✅ Successfully deleted ${totalDeleted} voice(s) from Shelby storage!`);
  } catch (error) {
    console.error("❌ Error deleting Shelby files:", error);
    process.exit(1);
  }
}

// Run the script
deleteAllShelbyFiles();

