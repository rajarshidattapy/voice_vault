/**
 * Voice Model Generation Pipeline
 * 
 * Converts raw audio into embedding-based voice models:
 * 1. Audio normalization (16kHz, mono, WAV)
 * 2. Embedding generation (voice characteristics extraction)
 * 3. Bundle creation (embedding.bin, config.json, meta.json, preview.wav)
 * 
 * NOTE: This is a simplified implementation. In production, you would:
 * - Use actual voice embedding models (e.g., Resemblyzer, GE2E, etc.)
 * - Handle longer audio files with chunking
 * - Support multiple embedding formats
 */

import { spawn } from "child_process";
import crypto from "crypto";

/**
 * Normalize audio file: Convert to WAV, 16kHz, mono
 * Uses ffmpeg if available, otherwise falls back to basic processing
 */
export async function normalizeAudio(audioBuffer: Buffer, mimeType = "audio/wav"): Promise<Buffer> {
  try {
    // Check if ffmpeg is available
    const ffmpegAvailable = await checkFFmpeg();
    
    if (ffmpegAvailable) {
      return await normalizeWithFFmpeg(audioBuffer, mimeType);
    } else {
      // Fallback: return as-is (assume already normalized)
      // In production, you'd want a proper fallback or require ffmpeg
      console.warn("[VoiceModel] FFmpeg not available, using audio as-is");
      return audioBuffer;
    }
  } catch (error: any) {
    console.error("[VoiceModel] Audio normalization error:", error);
    throw new Error(`Audio normalization failed: ${error.message}`);
  }
}

/**
 * Check if ffmpeg is available
 */
async function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-version"]);
    ffmpeg.on("error", () => resolve(false));
    ffmpeg.on("close", (code) => resolve(code === 0));
  });
}

/**
 * Normalize audio using ffmpeg
 */
async function normalizeWithFFmpeg(audioBuffer: Buffer, mimeType: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",           // Input from stdin
      "-ar", "16000",            // Sample rate: 16kHz
      "-ac", "1",                // Channels: mono
      "-f", "wav",               // Format: WAV
      "-acodec", "pcm_s16le",    // Codec: PCM 16-bit little-endian
      "pipe:1",                  // Output to stdout
    ]);

    const chunks: Buffer[] = [];
    let errorOutput = "";

    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(new Error(`FFmpeg error: ${error.message}`));
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });

    // Write audio buffer to ffmpeg stdin
    ffmpeg.stdin.write(audioBuffer);
    ffmpeg.stdin.end();
  });
}

/**
 * Generate voice embedding from normalized audio
 * 
 * NOTE: This is a placeholder. In production, you would:
 * - Use a trained embedding model (e.g., Resemblyzer, GE2E, etc.)
 * - Extract voice characteristics as a fixed-size vector
 * - Return binary embedding data
 * 
 * For now, we generate a deterministic hash-based "embedding"
 * (This is NOT secure/production-ready, just for demonstration)
 */
export async function generateEmbedding(normalizedAudio: Buffer) {
  try {
    // TODO: Replace with actual embedding model inference
    // Example: const embedding = await embeddingModel.encode(normalizedAudio);
    
    // Placeholder: Generate deterministic "embedding" from audio hash
    // In production, use actual voice embedding models
    const hash = crypto.createHash("sha256").update(normalizedAudio).digest();
    
    // Create a 256-dimensional embedding (placeholder)
    // Real embeddings would be from a trained model
    const embeddingSize = 256;
    const embedding = Buffer.alloc(embeddingSize * 4); // float32 = 4 bytes
    
    // Fill with deterministic values based on hash
    for (let i = 0; i < embeddingSize; i++) {
      const hashIndex = i % hash.length;
      const value = (hash[hashIndex] / 255.0 - 0.5) * 2.0; // Normalize to [-1, 1]
      embedding.writeFloatLE(value, i * 4);
    }

    return {
      data: embedding,
      size: embeddingSize,
      format: "float32",
    };
  } catch (error: any) {
    console.error("[VoiceModel] Embedding generation error:", error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Create voice model bundle
 */
export async function createVoiceBundle(params: {
  name: string;
  description?: string;
  owner: string;
  voiceId: string;
  normalizedAudio: Buffer;
  embedding: { data: Buffer; size: number; format: string };
  previewAudio?: Buffer;
}) {
  const {
    name,
    description,
    owner,
    voiceId,
    normalizedAudio,
    embedding,
    previewAudio,
  } = params;

  // Create config.json
  const config = {
    modelVersion: "1.0.0",
    sampleRate: 16000,
    channels: 1,
    format: "wav",
    embeddingSize: embedding.size,
    embeddingFormat: embedding.format,
  };

  // Create meta.json
  const meta = {
    name,
    description: description || "",
    owner,
    voiceId,
    createdAt: Date.now(),
    modelVersion: config.modelVersion,
  };

  // Build bundle files
  const bundleFiles: Record<string, Buffer> = {
    "embedding.bin": embedding.data,
    "config.json": Buffer.from(JSON.stringify(config, null, 2)),
    "meta.json": Buffer.from(JSON.stringify(meta, null, 2)),
  };

  // Add preview.wav if provided
  if (previewAudio) {
    bundleFiles["preview.wav"] = previewAudio;
  }

  return {
    files: bundleFiles,
    config,
    meta,
  };
}

/**
 * Process audio file and generate voice model bundle
 * Main entry point for voice model generation
 */
export async function processVoiceModel(params: {
  audioBuffer: Buffer;
  mimeType: string;
  name: string;
  description?: string;
  owner: string;
  voiceId: string;
}) {
  const {
    audioBuffer,
    mimeType,
    name,
    description,
    owner,
    voiceId,
  } = params;

  try {
    // Step 1: Normalize audio
    console.log("[VoiceModel] Normalizing audio...");
    const normalizedAudio = await normalizeAudio(audioBuffer, mimeType);

    // Step 2: Generate embedding
    console.log("[VoiceModel] Generating voice embedding...");
    const embedding = await generateEmbedding(normalizedAudio);

    // Step 3: Extract preview (first 5 seconds, optional)
    let previewAudio: Buffer | undefined = undefined;
    try {
      // Extract first 5 seconds for preview (16kHz mono WAV = 16000 * 2 bytes/second * 5)
      const previewDuration = 5; // seconds
      const previewSize = 16000 * 2 * previewDuration; // 16-bit PCM = 2 bytes/sample
      if (normalizedAudio.length > previewSize) {
        previewAudio = normalizedAudio.slice(0, previewSize);
      }
    } catch (error) {
      console.warn("[VoiceModel] Preview extraction failed, continuing without preview:", error);
    }

    // Step 4: Create bundle
    console.log("[VoiceModel] Creating voice bundle...");
    const bundle = await createVoiceBundle({
      name,
      description,
      owner,
      voiceId,
      normalizedAudio,
      embedding,
      previewAudio,
    });

    return bundle;
  } catch (error) {
    console.error("[VoiceModel] Voice model processing failed:", error);
    throw error;
  }
}