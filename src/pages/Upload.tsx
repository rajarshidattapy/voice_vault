import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VoiceRegistrationForm } from "@/components/voice/VoiceRegistrationForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Download, Loader2, Mic2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Upload = () => {
  // ------------------- ElevenLabs TTS -------------------
  const [ttsText, setTtsText] = useState("");
  const [ttsVoiceId, setTtsVoiceId] = useState<string>("21m00Tcm4TlvDq8ikWAM"); // Default: Rachel
  const [availableVoices, setAvailableVoices] = useState<Array<{ voice_id: string; name: string }>>([]);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  // ------------------- Voice Cloning with ElevenLabs -------------------
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [cloneText, setCloneText] = useState("");
  const [cloneLoading, setCloneLoading] = useState(false);
  const [clonedUrl, setClonedUrl] = useState<string | null>(null);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(localStorage.getItem("eleven_voice_id"));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ------------------- Registration Autofill -------------------
  const [autoName, setAutoName] = useState("");
  const [autoModelUri, setAutoModelUri] = useState("");

  // ------------------- Mic Record -------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const file = new File([blob], "mic.wav", { type: "audio/wav" });
        setSelectedFile(file);
      };

      recorder.start();
      setRecording(true);
      toast.info("Recording started");
    } catch {
      toast.error("Mic permission denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    toast.info("Recording stopped");
  };

  // ------------------- Load available ElevenLabs voices on mount -------------------
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const { backendApi } = await import("@/lib/api");
        const voicesData = await backendApi.getElevenLabsVoices();
        setAvailableVoices(voicesData.voices || []);
        // Set default voice if available
        if (voicesData.voices?.length > 0 && !ttsVoiceId) {
          setTtsVoiceId(voicesData.voices[0].voice_id);
        }
      } catch (err) {
        console.error("Failed to load voices:", err);
        // Continue with default voice
      }
    };
    loadVoices();
  }, []);

  // ------------------- ElevenLabs TTS -------------------
  const handleElevenLabsTTS = async () => {
    if (!ttsText.trim()) {
      toast.error("Please enter text to generate");
      return;
    }
    if (!ttsVoiceId) {
      toast.error("Please select a voice");
      return;
    }

    setTtsLoading(true);
    try {
      const { backendApi } = await import("@/lib/api");
      toast.info("Generating speech...");
      const audioBlob = await backendApi.generateElevenLabsSpeech(ttsVoiceId, ttsText);
      const url = URL.createObjectURL(audioBlob);
      setTtsAudioUrl(url);
      toast.success("Speech generated successfully!");
    } catch (err: any) {
      console.error("TTS error:", err);
      toast.error(err.message || "Failed to generate speech");
    } finally {
      setTtsLoading(false);
    }
  };

  // ------------------- File Upload Handler -------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("audio/")) {
        setSelectedFile(file);
        toast.success("Audio file selected");
      } else {
        toast.error("Please select an audio file");
      }
    }
  };

  // ------------------- Generate TTS with Voice Cloning -------------------
  const handleGenerateTTS = async () => {
    if (!cloneText.trim()) {
      toast.error("Please enter text to generate");
      return;
    }
    if (!selectedFile && !savedVoiceId) {
      toast.error("Please record or upload an audio file first");
      return;
    }

    setCloneLoading(true);
    try {
      const { backendApi } = await import("@/lib/api");
      let voiceId = savedVoiceId;

      // Clone voice if we don't have a saved voice ID
      if (!voiceId) {
        if (!selectedFile) {
          throw new Error("No audio file selected");
        }

        toast.info("Cloning voice...");
        const cloneResult = await backendApi.cloneVoice(
          `VoiceVault_${Date.now()}`,
          [selectedFile]
        );

        voiceId = cloneResult.voice_id;
        localStorage.setItem("eleven_voice_id", voiceId);
        setSavedVoiceId(voiceId);
        toast.success("Voice cloned successfully!");
      }

      // Auto-fill Registration form
      setAutoName(`VoiceVault ${voiceId.slice(0, 4)}`);
      setAutoModelUri(`eleven:${voiceId}`);

      // Generate speech with cloned voice
      toast.info("Generating speech...");
      try {
        const audioBlob = await backendApi.generateElevenLabsSpeech(voiceId, cloneText);
        const url = URL.createObjectURL(audioBlob);
        setClonedUrl(url);
        toast.success("Audio generated successfully!");
      } catch (ttsError: any) {
        // If voice not found, clear saved voice and re-clone
        if (ttsError.message?.includes('voice_not_found') || ttsError.message?.includes('not found')) {
          console.warn("Saved voice ID is invalid, clearing and re-cloning...");
          localStorage.removeItem("eleven_voice_id");
          setSavedVoiceId(null);
          
          if (!selectedFile) {
            throw new Error("The saved voice no longer exists. Please record or upload a new audio file to clone.");
          }

          toast.info("Voice expired, cloning new voice...");
          const cloneResult = await backendApi.cloneVoice(
            `VoiceVault_${Date.now()}`,
            [selectedFile]
          );

          voiceId = cloneResult.voice_id;
          localStorage.setItem("eleven_voice_id", voiceId);
          setSavedVoiceId(voiceId);
          toast.success("Voice re-cloned successfully!");

          // Retry TTS with new voice
          const audioBlob = await backendApi.generateElevenLabsSpeech(voiceId, cloneText);
          const url = URL.createObjectURL(audioBlob);
          setClonedUrl(url);
          toast.success("Audio generated successfully!");
        } else {
          throw ttsError;
        }
      }
    } catch (err: any) {
      console.error("Clone/TTS error:", err);
      toast.error(err.message || "Failed to clone voice or generate audio");
    } finally {
      setCloneLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Create Voice - VoiceVault</title></Helmet>
      <Navbar />
      <main className="pt-32 pb-16">
        <div className="container max-w-5xl mx-auto px-4 space-y-16">

          {/* ------------------- ElevenLabs TTS Section ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Text → Speech</CardTitle>
              <CardDescription>Generate speech using Text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tts-voice">Select Voice</Label>
                <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                  <SelectTrigger id="tts-voice">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.length > 0 ? (
                      availableVoices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          {voice.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={ttsVoiceId}>Rachel (Default)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Type text here to generate speech..."
                className="min-h-[100px]"
              />
              <Button onClick={handleElevenLabsTTS} disabled={ttsLoading} className="w-full">
                {ttsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Generate Speech
              </Button>
              {ttsAudioUrl && (
                <div className="space-y-3 bg-muted/40 p-4 rounded-xl">
                  <audio controls src={ttsAudioUrl} className="w-full" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = ttsAudioUrl;
                      a.download = `voicevault-tts-${Date.now()}.mp3`;
                      a.click();
                    }}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Audio
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------------- Voice Cloning Section (ElevenLabs) ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Clone Your Voice</CardTitle>
              <CardDescription>Record or upload audio → Clone your voice → Generate unlimited speech</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Audio Input Options */}
              <div className="space-y-4">
                <Label>Audio Reference (Record or Upload)</Label>
                
                {/* Mic Recording */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                  {!recording ? (
                    <Button onClick={startRecording} className="w-full">
                      <Mic2 className="h-5 w-5 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} className="w-full" variant="destructive">
                      ⏹ Stop Recording
                    </Button>
                  )}
                  
                  <div className="text-sm text-muted-foreground">OR</div>
                  
                  {/* File Upload */}
                  <div>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="audio-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("audio-upload")?.click()}
                      className="w-full"
                    >
                      📁 Upload Audio File
                    </Button>
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-muted/40 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <Label htmlFor="clone-text">Text to speak with your cloned voice</Label>
                <Textarea
                  id="clone-text"
                  value={cloneText}
                  onChange={(e) => setCloneText(e.target.value)}
                  placeholder="Enter the text you want to generate in your voice..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerateTTS} 
                disabled={cloneLoading || !selectedFile || !cloneText.trim()} 
                className="w-full"
              >
                {cloneLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Speech
                  </>
                )}
              </Button>

              {/* Audio Output */}
              {clonedUrl && (
                <div className="space-y-3 bg-muted/40 p-6 rounded-xl">
                  <audio controls src={clonedUrl} className="w-full" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = clonedUrl;
                      a.download = `voicevault-cloned-${Date.now()}.wav`;
                      a.click();
                    }}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Audio
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------------- Registration Form (AUTOFILLS) ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Register Your Voice Model</CardTitle>
              <CardDescription>Register your cloned voice on-chain</CardDescription>
            </CardHeader>
            <CardContent>
              <VoiceRegistrationForm
                autoName={autoName}
                autoModelUri={autoModelUri}
              />
            </CardContent>
          </Card>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Upload;
