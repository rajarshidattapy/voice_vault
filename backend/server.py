import os
import re
import math
import time
from pathlib import Path

from fastapi import FastAPI, Request, UploadFile, File, Form, Header
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import httpx
import uvicorn

import shelby as shelby_module
import voice_model

# Load .env from project root (one level up from backend/)
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BACKEND_DIR.parent / ".env")

# API Keys
ELEVEN_KEY = os.environ.get("ELEVENLABS_API_KEY")

if not ELEVEN_KEY:
    print("⚠️ Missing ELEVENLABS_API_KEY")

# Shared async HTTP client (created/closed via lifespan)
http_client: httpx.AsyncClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=120.0)
    yield
    await http_client.aclose()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ElevenLabs TTS ====================

# 1️⃣ Get available ElevenLabs voices
@app.get("/api/elevenlabs/voices")
async def get_elevenlabs_voices():
    try:
        if not ELEVEN_KEY:
            return JSONResponse({"error": "ElevenLabs API key not configured"}, status_code=500)

        response = await http_client.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": ELEVEN_KEY},
        )

        if response.status_code != 200:
            return Response(content=response.text, status_code=response.status_code)

        return response.json()
    except Exception as err:
        return JSONResponse({"error": "Failed to fetch voices", "message": str(err)}, status_code=500)


# 2️⃣ TTS with ElevenLabs voice
@app.post("/api/elevenlabs/speak")
async def elevenlabs_speak(request: Request):
    try:
        if not ELEVEN_KEY:
            return JSONResponse({"error": "ElevenLabs API key not configured"}, status_code=500)

        data = await request.json()
        voice_id = data.get("voiceId")
        text = data.get("text")
        if not voice_id:
            return JSONResponse({"error": "voiceId missing"}, status_code=400)
        if not text:
            return JSONResponse({"error": "text missing"}, status_code=400)

        response = await http_client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.85},
            },
        )

        if response.status_code != 200:
            return Response(content=response.text, status_code=response.status_code)

        return Response(content=response.content, media_type="audio/mpeg")
    except Exception as err:
        return JSONResponse({"error": "TTS failed", "message": str(err)}, status_code=500)


# ==================== ElevenLabs Voice Cloning ====================

# 4️⃣ Clone a voice using ElevenLabs
@app.post("/api/elevenlabs/clone")
async def elevenlabs_clone(
    audio: UploadFile = File(...),
    name: str = Form(None),
    description: str = Form(None),
):
    try:
        if not ELEVEN_KEY:
            return JSONResponse({"error": "ElevenLabs API key not configured"}, status_code=500)

        audio_bytes = await audio.read()

        print(f"[Voice Clone] After parsing: hasFile=True, "
              f"fileSize={len(audio_bytes)}, fileName={audio.filename}, "
              f"contentType={audio.content_type}")

        if not audio_bytes:
            return JSONResponse({
                "error": "Audio file is required",
                "received": {"hasFile": False, "contentType": audio.content_type or "not set"},
            }, status_code=400)

        if not name or not name.strip():
            print(f"[Voice Clone] Missing or invalid name")
            return JSONResponse({
                "error": "Voice name is required",
                "message": "Please provide a 'name' field in the form data",
                "debug": {
                    "bodyExists": True,
                    "hasFile": True,
                    "fileName": audio.filename,
                },
            }, status_code=400)

        # Prepare form data for ElevenLabs API
        files = {"files": (audio.filename or "audio.wav", audio_bytes, audio.content_type or "audio/wav")}
        form_data = {"name": name}
        if description and description.strip():
            form_data["description"] = description.strip()

        response = await http_client.post(
            "https://api.elevenlabs.io/v1/voices/add",
            headers={"xi-api-key": ELEVEN_KEY},
            files=files,
            data=form_data,
        )

        if response.status_code != 200:
            error_text = response.text
            print(f"[Voice Clone] ElevenLabs API error: {error_text}")
            return JSONResponse({"error": "Voice cloning failed", "details": error_text}, status_code=response.status_code)

        resp_data = response.json()
        return {
            "success": True,
            "voice_id": resp_data.get("voice_id"),
            "name": resp_data.get("name"),
            "message": "Voice cloned successfully! You can now use this voice for TTS.",
        }
    except Exception as err:
        print(f"[Voice Clone] Error: {err}")
        return JSONResponse({"error": "Voice cloning failed", "message": str(err)}, status_code=500)


# ==================== Unified TTS Endpoint ====================

# Helper function: Generate TTS with a generic/default voice (fallback)
async def generate_tts_with_generic_voice(text):
    try:
        if not ELEVEN_KEY:
            return JSONResponse({
                "error": "TTS generation failed",
                "message": "ElevenLabs API key not configured",
            }, status_code=500)

        response = await http_client.post(
            "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
            headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
        )

        if response.status_code == 200:
            return Response(content=response.content, media_type="audio/mpeg")

        error_text = response.text
        return JSONResponse({
            "error": "TTS generation failed",
            "message": f"ElevenLabs TTS failed: {error_text}",
        }, status_code=response.status_code)
    except Exception as error:
        print(f"[TTS] Generic voice generation error: {error}")
        return JSONResponse({
            "error": "TTS generation failed",
            "message": str(error),
        }, status_code=500)


# 5️⃣ Unified TTS endpoint that handles different voice providers based on model URI
# NOTE: This endpoint must verify Aptos access for Shelby URIs before loading models
@app.post("/api/tts/generate")
async def tts_generate(request: Request):
    try:
        data = await request.json()
        model_uri = data.get("modelUri")
        text = data.get("text")
        requester_account = data.get("requesterAccount")

        if not model_uri:
            return JSONResponse({"error": "modelUri parameter missing"}, status_code=400)
        if not text:
            return JSONResponse({"error": "text parameter missing"}, status_code=400)

        # Handle Shelby URIs (voice models stored on Shelby)
        if model_uri.startswith("shelby://"):
            # Verify access on Aptos before loading model
            if not requester_account:
                return JSONResponse({"error": "requesterAccount required for Shelby URIs"}, status_code=400)

            # For Shelby URIs, verify access (owner or purchased)
            # Note: In production, this would query Aptos contract for purchase verification
            has_access = shelby_module.verify_access(model_uri, requester_account)
            if not has_access:
                return JSONResponse({
                    "error": "Access denied",
                    "message": "You must purchase this voice from the marketplace to use it.",
                }, status_code=403)

            # Download voice model bundle from Shelby
            try:
                embedding_buffer = shelby_module.download_from_shelby(model_uri, "embedding.bin")
            except Exception:
                embedding_buffer = None
            try:
                config_buffer = shelby_module.download_from_shelby(model_uri, "config.json")
            except Exception:
                config_buffer = None
            try:
                preview_buffer = shelby_module.download_from_shelby(model_uri, "preview.wav")
            except Exception:
                preview_buffer = None

            if not embedding_buffer or not config_buffer:
                return JSONResponse({"error": "Voice model files not found on Shelby"}, status_code=404)

            # For MVP: Use ElevenLabs voice cloning API with the preview audio
            # In production, you would load the embedding into a TTS engine directly
            if not ELEVEN_KEY:
                return JSONResponse({
                    "error": "ElevenLabs API key not configured",
                    "message": "ElevenLabs is required for Shelby voice model TTS generation",
                }, status_code=500)

            # Strategy: Use ElevenLabs voice cloning with preview audio
            # If preview is available, create a temporary voice clone and use it for TTS
            if preview_buffer and len(preview_buffer) > 0:
                try:
                    # Step 1: Create a voice clone using the preview audio
                    files = {"files": ("preview.wav", preview_buffer, "audio/wav")}
                    clone_data_form = {"name": f"shelby-voice-{int(time.time() * 1000)}"}

                    clone_response = await http_client.post(
                        "https://api.elevenlabs.io/v1/voices/add",
                        headers={"xi-api-key": ELEVEN_KEY},
                        files=files,
                        data=clone_data_form,
                    )

                    if clone_response.status_code != 200:
                        error_text = clone_response.text
                        print(f"[TTS] Voice cloning failed: {error_text}")
                        # Fallback to generic voice
                        return await generate_tts_with_generic_voice(text)

                    clone_resp_data = clone_response.json()
                    cloned_voice_id = clone_resp_data.get("voice_id")

                    # Step 2: Use the cloned voice for TTS generation
                    tts_response = await http_client.post(
                        f"https://api.elevenlabs.io/v1/text-to-speech/{cloned_voice_id}",
                        headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
                        json={
                            "text": text,
                            "model_id": "eleven_multilingual_v2",
                            "voice_settings": {"stability": 0.5, "similarity_boost": 0.85},
                        },
                    )

                    if tts_response.status_code != 200:
                        error_text = tts_response.text
                        print(f"[TTS] TTS generation with cloned voice failed: {error_text}")
                        # Fallback to generic voice
                        return await generate_tts_with_generic_voice(text)

                    return Response(content=tts_response.content, media_type="audio/mpeg")

                    # TODO: Optionally delete the temporary cloned voice after use

                except Exception as clone_error:
                    print(f"[TTS] Error during voice cloning process: {clone_error}")
                    # Fallback to generic voice
                    return await generate_tts_with_generic_voice(text)
            else:
                # No preview audio available - use generic voice
                return await generate_tts_with_generic_voice(text)

        # Parse model URI to determine provider
        if model_uri.startswith("eleven:"):
            # ElevenLabs voice
            voice_id = model_uri.replace("eleven:", "", 1)
            if not ELEVEN_KEY:
                return JSONResponse({"error": "ElevenLabs API key not configured"}, status_code=500)

            response = await http_client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.85},
                },
            )

            if response.status_code != 200:
                error_text = response.text
                return JSONResponse({"error": "ElevenLabs TTS failed", "details": error_text}, status_code=response.status_code)

            return Response(content=response.content, media_type="audio/mpeg")

        else:
            return JSONResponse({
                "error": "Unsupported model URI format",
                "message": "Supported formats: 'shelby://...' or 'eleven:...'",
            }, status_code=400)

    except Exception as err:
        return JSONResponse({"error": "TTS generation failed", "message": str(err)}, status_code=500)


# ==================== Payment Breakdown Calculation ====================

# 6️⃣ Calculate payment breakdown (platform fee, royalty, creator amount)
@app.post("/api/payment/breakdown")
async def payment_breakdown(request: Request):
    try:
        data = await request.json()
        amount = data.get("amount")  # Amount in APT

        if not isinstance(amount, (int, float)) or amount <= 0:
            return JSONResponse({"error": "Invalid amount. Must be a positive number"}, status_code=400)

        # Convert APT to Octas (1 APT = 100,000,000 Octas)
        amount_in_octas = math.floor(amount * 100_000_000)

        # Fixed platform fee: 2.5% (250 basis points)
        PLATFORM_FEE_BPS = 250
        platform_fee = math.floor((amount_in_octas * 250) / 10_000)
        remaining_after_platform = amount_in_octas - platform_fee

        # Fixed royalty: 10% (1000 basis points)
        ROYALTY_BPS = 1000
        royalty_amount = math.floor((remaining_after_platform * 1000) / 10_000)
        creator_amount = remaining_after_platform - royalty_amount

        return {
            "totalAmount": amount,
            "totalAmountOctas": amount_in_octas,
            "breakdown": {
                "platformFee": {
                    "amount": platform_fee / 100_000_000,
                    "amountOctas": platform_fee,
                    "percentage": 2.5,
                    "basisPoints": PLATFORM_FEE_BPS,
                },
                "royalty": {
                    "amount": royalty_amount / 100_000_000,
                    "amountOctas": royalty_amount,
                    "percentage": 10,
                    "basisPoints": ROYALTY_BPS,
                },
                "creator": {
                    "amount": creator_amount / 100_000_000,
                    "amountOctas": creator_amount,
                },
            },
        }
    except Exception as err:
        return JSONResponse({"error": "Failed to calculate payment breakdown", "message": str(err)}, status_code=500)


# ==================== Shelby Storage Integration ====================

# 7️⃣ Process audio, generate voice model bundle, and upload to Shelby
@app.post("/api/voice/process")
async def voice_process(
    audio: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(None),
    owner: str = Form(...),
    voiceId: str = Form(...),
):
    try:
        audio_buffer = await audio.read()
        mime_type = audio.content_type

        # Step 1: Process audio and generate voice model bundle
        print("[API] Processing voice model...")
        bundle = voice_model.process_voice_model(
            audio_buffer=audio_buffer,
            mime_type=mime_type,
            name=name,
            description=description,
            owner=owner,
            voice_id=voiceId,
        )

        # Step 2: Build Shelby URI
        namespace = "voices"
        shelby_uri = f"shelby://{owner}/{namespace}/{voiceId}"

        # Step 3: Upload bundle to Shelby
        print("[API] Uploading bundle to Shelby...")
        upload_result = shelby_module.upload_to_shelby(owner, namespace, voiceId, bundle["files"])

        return {
            "success": True,
            "uri": upload_result.get("uri", shelby_uri),
            "cid": upload_result["cid"],
            "bundle": {
                "config": bundle["config"],
                "meta": bundle["meta"],
            },
        }
    except Exception as err:
        print(f"[API] Voice processing error: {err}")
        return JSONResponse({"error": "Voice processing failed", "message": str(err)}, status_code=500)


# 8️⃣ Upload voice bundle to Shelby
@app.post("/api/shelby/upload")
async def shelby_upload(request: Request):
    try:
        uri = request.headers.get("x-shelby-uri")
        account = request.headers.get("x-aptos-account")

        if not uri or not account:
            return JSONResponse({"error": "Shelby URI and Aptos account are required"}, status_code=400)

        # Parse URI
        match = re.match(r"^shelby://([^/]+)/([^/]+)/(.+)$", uri)
        if not match:
            return JSONResponse({"error": "Invalid Shelby URI format"}, status_code=400)

        parsed_account, namespace, voice_id = match.group(1), match.group(2), match.group(3)

        # Verify account matches
        if parsed_account.lower() != account.lower():
            return JSONResponse({"error": "Account mismatch"}, status_code=403)

        # Prepare bundle files from multipart form
        form = await request.form()
        bundle_files = {}
        for field_name in ["embedding.bin", "config.json", "meta.json", "preview.wav"]:
            f = form.get(field_name)
            if f and hasattr(f, "read"):
                bundle_files[field_name] = await f.read()

        if not bundle_files:
            return JSONResponse({"error": "No files provided"}, status_code=400)

        # Upload to Shelby
        result = shelby_module.upload_to_shelby(account, namespace, voice_id, bundle_files)

        return {
            "success": True,
            "uri": result["uri"],
            "cid": result["cid"],
            "size": result["size"],
        }
    except Exception as err:
        print(f"[API] Shelby upload error: {err}")
        return JSONResponse({"error": "Shelby upload failed", "message": str(err)}, status_code=500)


# 9️⃣ Download file from Shelby
@app.post("/api/shelby/download")
async def shelby_download(request: Request):
    try:
        data = await request.json()
        uri = data.get("uri")
        filename = data.get("filename")
        requester_account = data.get("requesterAccount")

        if not uri or not filename:
            return JSONResponse({"error": "URI and filename are required"}, status_code=400)

        # Verify access (if requesterAccount provided)
        if requester_account:
            has_access = shelby_module.verify_access(uri, requester_account)
            if not has_access:
                return JSONResponse({"error": "Access denied"}, status_code=403)

        # Download from Shelby
        file_buffer = shelby_module.download_from_shelby(uri, filename)

        # Set appropriate content type
        content_type = "application/octet-stream"
        if filename.endswith(".json"):
            content_type = "application/json"
        elif filename.endswith(".wav"):
            content_type = "audio/wav"
        elif filename.endswith(".bin"):
            content_type = "application/octet-stream"

        return Response(content=file_buffer, media_type=content_type)
    except shelby_module.FileNotFoundError as err:
        print("[API] Returning 404 for file not found")
        return JSONResponse({
            "error": "File not found",
            "message": str(err),
        }, status_code=404)
    except Exception as err:
        print(f"[API] Shelby download error: name={type(err).__name__}, message={err}")
        return JSONResponse({"error": "Shelby download failed", "message": str(err)}, status_code=500)


# 🔟 Delete voice bundle from Shelby
@app.post("/api/shelby/delete")
async def shelby_delete(request: Request):
    try:
        data = await request.json()
        uri = data.get("uri")
        account = data.get("account")

        if not uri or not account:
            return JSONResponse({"error": "URI and account are required"}, status_code=400)

        # Verify it's a Shelby URI
        if not uri.startswith("shelby://"):
            return JSONResponse({"error": "Invalid URI format. Must be a Shelby URI (shelby://...)"}, status_code=400)

        # Delete from Shelby (this function verifies ownership)
        result = shelby_module.delete_from_shelby(uri, account)

        return result
    except Exception as err:
        print(f"[API] Shelby delete error: {err}")
        return JSONResponse({"error": "Shelby delete failed", "message": str(err)}, status_code=500)


# ==================== Voice Metadata from Blockchain ====================
# Note: Voice registry is stored on Aptos blockchain (contract2)
# This endpoint can query blockchain directly if needed (future enhancement)
# For now, frontend queries blockchain directly using useVoiceMetadata hook

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print(f"🔥 Voice server running → http://localhost:{port}")
    print(f"   - ElevenLabs TTS & Voice Cloning: {'✅' if ELEVEN_KEY else '❌ (API key missing)'}")
    uvicorn.run(app, host="0.0.0.0", port=port)
