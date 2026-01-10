import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VoiceRegistrationForm } from "@/components/voice/VoiceRegistrationForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Download, Loader2, Mic2, Upload as UploadIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPurchasedVoices } from "@/lib/purchasedVoices";
import { useAptosWallet } from "@/hooks/useAptosWallet";
// Note: buildShelbyUri is imported but not used directly as backend handles URI generation

const Upload = () => {
  // ------------------- TTS with Purchased Voices -------------------
  const [ttsText, setTtsText] = useState("");
  const [selectedPurchasedVoice, setSelectedPurchasedVoice] = useState<string>(""); // modelUri of selected voice
  const [purchasedVoices, setPurchasedVoices] = useState<Array<{ voiceId: string; name: string; modelUri: string; owner: string }>>([]);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  // ------------------- Voice Model Processing (Shelby) -------------------
  const { address, isConnected } = useAptosWallet();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceName, setVoiceName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [processingLoading, setProcessingLoading] = useState(false);
  const [processedVoiceUri, setProcessedVoiceUri] = useState<string | null>(null);

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

  // ------------------- Load purchased voices on mount -------------------
  useEffect(() => {
    const loadPurchasedVoices = () => {
      try {
        const purchased = getPurchasedVoices();
        const voices = purchased.map((v) => ({
          voiceId: v.voiceId,
          name: v.name,
          modelUri: v.modelUri,
          owner: v.owner,
        }));
        setPurchasedVoices(voices);
        // Set default voice if available and none is selected
        if (voices.length > 0 && !selectedPurchasedVoice) {
          setSelectedPurchasedVoice(voices[0].modelUri);
        }
      } catch (error) {
        console.error("Error loading purchased voices:", error);
        setPurchasedVoices([]);
      }
    };
    loadPurchasedVoices();
    
    // Refresh when storage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "voicevault_purchased_voices") {
        loadPurchasedVoices();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for same-tab changes (e.g., after purchase)
    const interval = setInterval(loadPurchasedVoices, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []); // Empty deps - only run on mount

  // ------------------- TTS Generation with Purchased Voices -------------------
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) {
      toast.error("Please enter text to generate");
      return;
    }
    if (!selectedPurchasedVoice) {
      toast.error("Please select a purchased voice");
      return;
    }
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to use purchased voices");
      return;
    }

    setTtsLoading(true);
    try {
      const { backendApi } = await import("@/lib/api");
      toast.info("Generating speech...");
      
      // Use unified TTS endpoint with requesterAccount for Shelby URIs
      // The backend will verify Aptos access before loading from Shelby
      const audioBlob = await backendApi.generateTTS(
        selectedPurchasedVoice, 
        ttsText,
        address.toString() // Pass requester account for access verification
      );
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

  // ------------------- Process Audio and Upload to Shelby -------------------
  const handleProcessVoice = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!selectedFile) {
      toast.error("Please record or upload an audio file first");
      return;
    }

    if (!voiceName.trim()) {
      toast.error("Please enter a voice name");
      return;
    }

    setProcessingLoading(true);
    try {
      const { backendApi } = await import("@/lib/api");
      
      // Generate unique voice ID
      const voiceId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const account = address.toString();
      const namespace = "voices";

      // Process audio, generate voice model bundle, and upload to Shelby (all in one step)
      toast.info("Processing audio and generating voice model...");
      const processResult = await backendApi.processVoiceModel(
        selectedFile,
        voiceName.trim(),
        account,
        voiceId,
        voiceDescription.trim() || undefined
      );

      // Auto-fill Registration form with Shelby URI
      setAutoName(voiceName.trim());
      setAutoModelUri(processResult.uri);
      setProcessedVoiceUri(processResult.uri);

      toast.success("Voice model processed and uploaded to Shelby successfully!", {
        description: `URI: ${processResult.uri}`,
        duration: 5000,
      });
    } catch (err: any) {
      console.error("Voice processing error:", err);
      toast.error(err.message || "Failed to process voice model");
    } finally {
      setProcessingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Create Voice - VoiceVault</title></Helmet>
      <Navbar />
      <main className="pt-32 pb-16">
        <div className="container max-w-5xl mx-auto px-4 space-y-16">

          {/* ------------------- TTS with Purchased Voices Section ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Text → Speech with Purchased Voices</CardTitle>
              <CardDescription>
                Generate speech using voices you've purchased from the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Please connect your wallet to use purchased voices.
                  </p>
                </div>
              )}

              {purchasedVoices.length === 0 ? (
                <div className="p-6 border-2 border-dashed rounded-lg text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No purchased voices yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Visit the Marketplace to buy voices and use them here for TTS generation.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/marketplace";
                    }}
                    className="mt-2"
                  >
                    Go to Marketplace
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="purchased-voice">Select Purchased Voice</Label>
                    <Select value={selectedPurchasedVoice} onValueChange={setSelectedPurchasedVoice}>
                      <SelectTrigger id="purchased-voice">
                        <SelectValue placeholder="Select a purchased voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchasedVoices.map((voice) => (
                          <SelectItem key={voice.modelUri} value={voice.modelUri}>
                            {voice.name} ({voice.modelUri.startsWith("shelby://") ? "Shelby" : "Other"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Type text here to generate speech with your purchased voice..."
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleGenerateTTS} 
                    disabled={ttsLoading || !selectedPurchasedVoice || !isConnected} 
                    className="w-full"
                  >
                    {ttsLoading ? (
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
                </>
              )}
            </CardContent>
          </Card>

          {/* ------------------- Voice Model Processing (Shelby) ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Process Your Voice Model</CardTitle>
              <CardDescription>
                Upload audio → Generate voice embedding → Store on Shelby → Register on Aptos blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isConnected && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Please connect your wallet to process and register your voice model.
                  </p>
                </div>
              )}

              {/* Audio Input Options */}
              <div className="space-y-4">
                <Label>Audio Input (Record or Upload)</Label>
                
                {/* Mic Recording */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                  {!recording ? (
                    <Button onClick={startRecording} disabled={!isConnected} className="w-full">
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
                      disabled={!isConnected}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("audio-upload")?.click()}
                      className="w-full"
                      disabled={!isConnected}
                    >
                      <UploadIcon className="h-5 w-5 mr-2" />
                      Upload Audio File
                    </Button>
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-muted/40 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: MP3, WAV, Opus
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Name Input */}
              <div className="space-y-2">
                <Label htmlFor="voice-name">
                  Voice Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="voice-name"
                  placeholder="e.g., My Professional Voice"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  disabled={!isConnected}
                  required
                />
              </div>

              {/* Voice Description Input */}
              <div className="space-y-2">
                <Label htmlFor="voice-description">Voice Description (Optional)</Label>
                <Textarea
                  id="voice-description"
                  placeholder="Describe your voice model..."
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  className="min-h-[80px]"
                  disabled={!isConnected}
                />
              </div>

              {/* Process Button */}
              <Button 
                onClick={handleProcessVoice} 
                disabled={processingLoading || !selectedFile || !voiceName.trim() || !isConnected} 
                className="w-full"
              >
                {processingLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing & Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Process Voice & Upload to Shelby
                  </>
                )}
              </Button>

              {/* Success Message */}
              {processedVoiceUri && (
                <div className="space-y-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ Voice model processed and uploaded to Shelby successfully!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 break-all">
                    Shelby URI: {processedVoiceUri}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    The Model URI has been auto-filled in the registration form below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------------- Registration Form (AUTOFILLS) ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Register Your Voice Model on Aptos Blockchain</CardTitle>
              <CardDescription>
                After processing and uploading your voice model to Shelby, register it on Aptos blockchain to make it available in the marketplace.
                <br />
                {autoModelUri && (
                  <span className="text-sm text-primary mt-2 block">
                    ✓ Model URI auto-filled: <code className="text-xs bg-muted px-1 py-0.5 rounded">{autoModelUri}</code>
                  </span>
                )}
                {!autoModelUri && (
                  <span className="text-sm text-muted-foreground mt-2 block">
                    Complete Step 2 above to process your voice model and get a Shelby URI.
                  </span>
                )}
              </CardDescription>
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
