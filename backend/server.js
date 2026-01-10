import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import multer from "multer";
import * as shelby from "./shelby.js";
import * as voiceModel from "./voiceModel.js";

// Get the directory of the current file (backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (one level up from backend/)
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const app = express();
app.use(cors());

// Parse JSON only for application/json content type
// Multer handles multipart/form-data
// express.urlencoded handles application/x-www-form-urlencoded
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    express.json({ limit: "200mb" })(req, res, next);
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    express.urlencoded({ extended: true, limit: "200mb" })(req, res, next);
  } else {
    // For multipart/form-data, let multer handle it
    next();
  }
});

// Multer for file uploads - explicitly configured to handle both files and text fields
const upload = multer({ 
  storage: multer.memoryStorage(),
  // Ensure text fields are parsed and available in req.body
});

// API Keys
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVEN_KEY) console.warn("⚠️ Missing ELEVENLABS_API_KEY");

// ==================== ElevenLabs TTS ====================

// 1️⃣ Get available ElevenLabs voices
app.get("/api/elevenlabs/voices", async (req, res) => {
  try {
    if (!ELEVEN_KEY) {
      return res.status(500).json({ error: "ElevenLabs API key not configured" });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: { "xi-api-key": ELEVEN_KEY },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch voices", message: err.message });
  }
});

// 2️⃣ TTS with ElevenLabs voice
app.post("/api/elevenlabs/speak", async (req, res) => {
  try {
    if (!ELEVEN_KEY) {
      return res.status(500).json({ error: "ElevenLabs API key not configured" });
    }

    const { voiceId, text } = req.body;
    if (!voiceId) return res.status(400).json({ error: "voiceId missing" });
    if (!text) return res.status(400).json({ error: "text missing" });

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
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    const audio = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audio));
  } catch (err) {
    res.status(500).json({ error: "TTS failed", message: err.message });
  }
});

// ==================== ElevenLabs Voice Cloning ====================

// 3️⃣ Clone voice using ElevenLabs
app.post("/api/elevenlabs/clone", async (req, res) => {
  try {
    if (!ELEVEN_KEY) {
      return res.status(500).json({ error: "ElevenLabs API key not configured" });
    }

    const { name, files } = req.body;
    if (!files?.length) return res.status(400).json({ error: "No audio provided" });

    const form = new FormData();
    form.append("name", name);
    files.forEach((f, i) => form.append("files", Buffer.from(f.base64, "base64"), `sample${i}.wav`));

    const cloneRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY },
      body: form,
    });

    const text = await cloneRes.text();
    if (!cloneRes.ok) return res.status(cloneRes.status).send(text);

    const data = JSON.parse(text);
    res.json({ voice_id: data.voice_id });
  } catch (err) {
    res.status(500).json({ error: "Clone failed", message: err.message });
  }
});

// ==================== ElevenLabs Voice Cloning ====================

// 4️⃣ Clone a voice using ElevenLabs (for fun/testing)
// Use upload.single() which processes the file and all text fields
app.post("/api/elevenlabs/clone", upload.single("audio"), async (req, res) => {
  try {
    if (!ELEVEN_KEY) {
      return res.status(500).json({ error: "ElevenLabs API key not configured" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    // Multer puts text fields in req.body
    // Handle both direct access and bracket notation for safety
    const name = (req.body && (req.body.name || req.body['name'])) || null;
    const description = (req.body && (req.body.description || req.body['description'])) || null;
    
    if (!name) {
      const contentType = req.headers['content-type'] || 'not set';
      console.error("[Voice Clone] Missing name in req.body:", { 
        body: req.body, 
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : 'req.body is undefined',
        contentType: contentType,
        hasFile: !!req.file,
        fileSize: req.file?.size
      });
      return res.status(400).json({ 
        error: "Voice name is required. Please ensure you're sending 'name' field in the form data.",
        debug: {
          contentType: contentType,
          bodyExists: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : []
        }
      });
    }

    // Prepare form data for ElevenLabs API
    const formData = new FormData();
    formData.append("files", req.file.buffer, {
      filename: req.file.originalname || "audio.wav",
      contentType: req.file.mimetype || "audio/wav",
    });
    formData.append("name", name);
    // Description can include sample text to help with voice cloning quality
    if (description && description.trim()) {
      formData.append("description", description.trim());
    }

    // Call ElevenLabs voice cloning API
    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_KEY,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Voice Clone] ElevenLabs API error:", errorText);
      return res.status(response.status).json({ 
        error: "Voice cloning failed", 
        details: errorText 
      });
    }

    const data = await response.json();
    res.json({
      success: true,
      voice_id: data.voice_id,
      name: data.name,
      message: "Voice cloned successfully! You can now use this voice for TTS.",
    });
  } catch (err) {
    console.error("[Voice Clone] Error:", err);
    res.status(500).json({ error: "Voice cloning failed", message: err.message });
  }
});

// ==================== Unified TTS Endpoint ====================

// Helper function: Generate TTS with a generic/default voice (fallback)
async function generateTTSWithGenericVoice(text, res) {
  try {
    if (!ELEVEN_KEY) {
      return res.status(500).json({ 
        error: "TTS generation failed",
        message: "ElevenLabs API key not configured"
      });
    }

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
      res.set("Content-Type", "audio/mpeg");
      return res.send(Buffer.from(audio));
    }

    // If ElevenLabs fails, return error
    const errorText = await response.text();
    return res.status(response.status).json({ 
      error: "TTS generation failed",
      message: `ElevenLabs TTS failed: ${errorText}`
    });
  } catch (error) {
    console.error("[TTS] Generic voice generation error:", error);
    return res.status(500).json({ 
      error: "TTS generation failed",
      message: error.message 
    });
  }
}

// 5️⃣ Unified TTS endpoint that handles different voice providers based on model URI
// NOTE: This endpoint must verify Aptos access for Shelby URIs before loading models
app.post("/api/tts/generate", async (req, res) => {
  try {
    const { modelUri, text, requesterAccount } = req.body;
    
    if (!modelUri) return res.status(400).json({ error: "modelUri parameter missing" });
    if (!text) return res.status(400).json({ error: "text parameter missing" });

    // Handle Shelby URIs (voice models stored on Shelby)
    if (modelUri.startsWith("shelby://")) {
      // Verify access on Aptos before loading model
      if (!requesterAccount) {
        return res.status(400).json({ error: "requesterAccount required for Shelby URIs" });
      }

      // For Shelby URIs, verify access (owner or purchased)
      // Note: In production, this would query Aptos contract for purchase verification
      const hasAccess = await shelby.verifyAccess(modelUri, requesterAccount);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You must purchase this voice from the marketplace to use it." 
        });
      }

      // Download voice model bundle from Shelby
      const embeddingBuffer = await shelby.downloadFromShelby(modelUri, "embedding.bin").catch(() => null);
      const configBuffer = await shelby.downloadFromShelby(modelUri, "config.json").catch(() => null);
      const previewBuffer = await shelby.downloadFromShelby(modelUri, "preview.wav").catch(() => null);
      
      if (!embeddingBuffer || !configBuffer) {
        return res.status(404).json({ error: "Voice model files not found on Shelby" });
      }

      // For MVP: Use ElevenLabs voice cloning API with the preview audio
      // In production, you would load the embedding into a TTS engine directly
      if (!ELEVEN_KEY) {
        return res.status(500).json({ 
          error: "ElevenLabs API key not configured",
          message: "ElevenLabs is required for Shelby voice model TTS generation"
        });
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
            return await generateTTSWithGenericVoice(text, res);
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
            return await generateTTSWithGenericVoice(text, res);
          }

          const audio = await ttsResponse.arrayBuffer();
          res.set("Content-Type", "audio/mpeg");
          res.send(Buffer.from(audio));

          // TODO: Optionally delete the temporary cloned voice after use
          // This would require storing the voice_id temporarily and cleaning up
          
          return;
        } catch (cloneError) {
          console.error("[TTS] Error during voice cloning process:", cloneError);
          // Fallback to generic voice
          return await generateTTSWithGenericVoice(text, res);
        }
      } else {
        // No preview audio available - use generic voice
        return await generateTTSWithGenericVoice(text, res);
      }
    }

    // Parse model URI to determine provider
    if (modelUri.startsWith("eleven:")) {
      // ElevenLabs voice
      const voiceId = modelUri.replace("eleven:", "");
      if (!ELEVEN_KEY) {
        return res.status(500).json({ error: "ElevenLabs API key not configured" });
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
        return res.status(response.status).json({ error: "ElevenLabs TTS failed", details: errorText });
      }

      const audio = await response.arrayBuffer();
      res.set("Content-Type", "audio/mpeg");
      res.send(Buffer.from(audio));
      
    } else {
      return res.status(400).json({ 
        error: "Unsupported model URI format", 
        message: "Supported formats: 'shelby://...' or 'eleven:...'" 
      });
    }
  } catch (err) {
    res.status(500).json({ error: "TTS generation failed", message: err.message });
  }
});

// ==================== Payment Breakdown Calculation ====================

// 6️⃣ Calculate payment breakdown (platform fee, royalty, creator amount)
app.post("/api/payment/breakdown", async (req, res) => {
  try {
    const { amount } = req.body; // Amount in APT
    
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount. Must be a positive number" });
    }

    // Convert APT to Octas (1 APT = 100,000,000 Octas)
    const amountInOctas = Math.floor(amount * 100_000_000);
    
    // Fixed platform fee: 2.5% (250 basis points)
    const platformFee = Math.floor((amountInOctas * 250) / 10_000);
    const remainingAfterPlatform = amountInOctas - platformFee;
    
    // Fixed royalty: 10% (1000 basis points)
    const royaltyAmount = Math.floor((remainingAfterPlatform * 1000) / 10_000);
    const creatorAmount = remainingAfterPlatform - royaltyAmount;

    // Convert back to APT for response
    const PLATFORM_FEE_BPS = 250;
    const ROYALTY_BPS = 1000;

    res.json({
      totalAmount: amount,
      totalAmountOctas: amountInOctas,
      breakdown: {
        platformFee: {
          amount: platformFee / 100_000_000,
          amountOctas: platformFee,
          percentage: 2.5,
          basisPoints: PLATFORM_FEE_BPS,
        },
        royalty: {
          amount: royaltyAmount / 100_000_000,
          amountOctas: royaltyAmount,
          percentage: 10,
          basisPoints: ROYALTY_BPS,
        },
        creator: {
          amount: creatorAmount / 100_000_000,
          amountOctas: creatorAmount,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to calculate payment breakdown", message: err.message });
  }
});

// ==================== Shelby Storage Integration ====================

// 7️⃣ Process audio, generate voice model bundle, and upload to Shelby
app.post("/api/voice/process", upload.single("audio"), async (req, res) => {
  try {
    const { name, description, owner, voiceId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    if (!name || !owner || !voiceId) {
      return res.status(400).json({ error: "name, owner, and voiceId are required" });
    }

    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Step 1: Process audio and generate voice model bundle
    console.log("[API] Processing voice model...");
    const bundle = await voiceModel.processVoiceModel({
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
    const uploadResult = await shelby.uploadToShelby(owner, namespace, voiceId, bundle.files);

    res.json({
      success: true,
      uri: uploadResult.uri || shelbyUri,
      cid: uploadResult.cid,
      bundle: {
        config: bundle.config,
        meta: bundle.meta,
      },
    });
  } catch (err) {
    console.error("[API] Voice processing error:", err);
    res.status(500).json({ error: "Voice processing failed", message: err.message });
  }
});

// 8️⃣ Upload voice bundle to Shelby
app.post("/api/shelby/upload", upload.fields([
  { name: "embedding.bin", maxCount: 1 },
  { name: "config.json", maxCount: 1 },
  { name: "meta.json", maxCount: 1 },
  { name: "preview.wav", maxCount: 1 },
]), async (req, res) => {
  try {
    const uri = req.headers["x-shelby-uri"];
    const account = req.headers["x-aptos-account"];

    if (!uri || !account) {
      return res.status(400).json({ error: "Shelby URI and Aptos account are required" });
    }

    // Parse URI
    const match = uri.match(/^shelby:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid Shelby URI format" });
    }

    const [, parsedAccount, namespace, voiceId] = match;

    // Verify account matches
    if (parsedAccount.toLowerCase() !== account.toLowerCase()) {
      return res.status(403).json({ error: "Account mismatch" });
    }

    // Prepare bundle files
    const bundleFiles = {};
    if (req.files["embedding.bin"]) {
      bundleFiles["embedding.bin"] = req.files["embedding.bin"][0].buffer;
    }
    if (req.files["config.json"]) {
      bundleFiles["config.json"] = req.files["config.json"][0].buffer;
    }
    if (req.files["meta.json"]) {
      bundleFiles["meta.json"] = req.files["meta.json"][0].buffer;
    }
    if (req.files["preview.wav"]) {
      bundleFiles["preview.wav"] = req.files["preview.wav"][0].buffer;
    }

    if (Object.keys(bundleFiles).length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    // Upload to Shelby
    const result = await shelby.uploadToShelby(account, namespace, voiceId, bundleFiles);

    res.json({
      success: true,
      uri: result.uri,
      cid: result.cid,
      size: result.size,
    });
  } catch (err) {
    console.error("[API] Shelby upload error:", err);
    res.status(500).json({ error: "Shelby upload failed", message: err.message });
  }
});

// 9️⃣ Download file from Shelby
app.post("/api/shelby/download", async (req, res) => {
  try {
    const { uri, filename, requesterAccount } = req.body;

    if (!uri || !filename) {
      return res.status(400).json({ error: "URI and filename are required" });
    }

    // Verify access (if requesterAccount provided)
    if (requesterAccount) {
      const hasAccess = await shelby.verifyAccess(uri, requesterAccount);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Download from Shelby
    const fileBuffer = await shelby.downloadFromShelby(uri, filename);

    // Set appropriate content type
    let contentType = "application/octet-stream";
    if (filename.endsWith(".json")) {
      contentType = "application/json";
    } else if (filename.endsWith(".wav")) {
      contentType = "audio/wav";
    } else if (filename.endsWith(".bin")) {
      contentType = "application/octet-stream";
    }

    res.set("Content-Type", contentType);
    res.send(fileBuffer);
  } catch (err) {
    console.error("[API] Shelby download error:", err);
    res.status(500).json({ error: "Shelby download failed", message: err.message });
  }
});

// ==================== Voice Metadata from Blockchain ====================
// Note: Voice registry is stored on Aptos blockchain (contract2)
// This endpoint can query blockchain directly if needed (future enhancement)
// For now, frontend queries blockchain directly using useVoiceMetadata hook

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Voice server running → http://localhost:${PORT}`);
  console.log(`   - ElevenLabs TTS & Voice Cloning: ${ELEVEN_KEY ? '✅' : '❌ (API key missing)'}`);
});
