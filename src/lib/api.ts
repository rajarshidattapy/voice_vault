// Backend API Configuration
const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_PROXY_URL || import.meta.env.VITE_API_URL;
  const defaultUrl = 'http://localhost:3000';
  const url = envUrl || defaultUrl;
  console.log('[API Config] Backend URL:', url, { envUrl, defaultUrl });
  return url;
};

export const BACKEND_CONFIG = {
  get BASE_URL() {
    return getBackendUrl();
  },
  ENDPOINTS: {
    // ElevenLabs TTS & Voice Cloning
    ELEVENLABS_VOICES: '/api/elevenlabs/voices',
    ELEVENLABS_SPEAK: '/api/elevenlabs/speak',
    ELEVENLABS_CLONE: '/api/elevenlabs/clone',
  },
};

/**
 * Convert File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}

/**
 * Backend API client for voice operations (ElevenLabs TTS & Voice Cloning)
 */
export const backendApi = {
  /**
   * Get available ElevenLabs voices
   * @returns List of available voices
   */
  async getElevenLabsVoices(): Promise<{ voices: Array<{ voice_id: string; name: string }> }> {
    const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ELEVENLABS_VOICES}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to fetch voices' };
      }
      throw new Error(errorData.error || errorData.message || 'Failed to fetch voices');
    }

    return response.json();
  },

  /**
   * Generate speech using ElevenLabs TTS
   * @param voiceId ElevenLabs voice ID
   * @param text Text to convert to speech
   * @returns Audio blob (MP3)
   */
  async generateElevenLabsSpeech(voiceId: string, text: string): Promise<Blob> {
    const url = `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ELEVENLABS_SPEAK}`;
    console.log('[API] Generating ElevenLabs speech:', { url, voiceId, textLength: text.length });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId, text }),
    });

    console.log('[API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `TTS generation failed (${response.status})` };
      }
      throw new Error(errorData.detail?.message || errorData.error || errorData.message || `TTS generation failed: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  },

  /**
   * Clone a voice using ElevenLabs API via backend
   * @param name Voice name
   * @param files Array of audio files to clone from
   * @returns Voice ID from ElevenLabs
   */
  async cloneVoice(name: string, files: File[]): Promise<{ voice_id: string }> {
    const url = `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ELEVENLABS_CLONE}`;
    console.log('[API] Cloning voice:', { url, name, fileCount: files.length });
    
    const base64Files = await Promise.all(files.map(file => fileToBase64(file)));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        files: base64Files.map(base64 => ({ base64 })),
      }),
    });

    console.log('[API] Clone response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Clone error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Clone failed' };
      }
      throw new Error(errorData.error || errorData.message || errorData.detail?.message || 'Voice cloning failed');
    }

    const result = await response.json();
    console.log('[API] Voice cloned successfully:', result.voice_id);
    return result;
  },
};
