import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VoiceRegistrationForm } from "@/components/voice/VoiceRegistrationForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Download, Loader2, Mic2, Upload as UploadIcon, Mic } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPurchasedVoices } from "@/lib/purchasedVoices";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { useVoiceMetadata } from "@/hooks/useVoiceMetadata";
import { getClonedVoice, addClonedVoice, type ClonedVoice } from "@/lib/clonedVoices";
// Note: buildShelbyUri is imported but not used directly as backend handles URI generation

const Upload = () => {
  // ------------------- TTS with Purchased Voices -------------------
  const [ttsText, setTtsText] = useState("");
  const [selectedPurchasedVoice, setSelectedPurchasedVoice] = useState<string>(""); // modelUri of selected voice
  const [purchasedVoices, setPurchasedVoices] = useState<Array<{ voiceId: string; name: string; modelUri: string; owner: string; isOwned?: boolean }>>([]);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isVoiceTyping, setIsVoiceTyping] = useState(false);
  const [isVoiceTypingCloned, setIsVoiceTypingCloned] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const speechRecognitionClonedRef = useRef<any>(null);

  // ------------------- Voice Model Processing (Shelby) -------------------
  const { address, isConnected } = useAptosWallet();
  
  // Check if user has their own registered voice
  const { metadata: ownVoiceMetadata } = useVoiceMetadata(address?.toString() || null);
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

  // ------------------- Voice Cloning (ElevenLabs) -------------------
  const [cloneRecording, setCloneRecording] = useState(false);
  const [cloneRecordedAudio, setCloneRecordedAudio] = useState<File | null>(null);
  const [cloneVoiceName, setCloneVoiceName] = useState("");
  const [cloneSampleText, setCloneSampleText] = useState("");
  const [cloneLoading, setCloneLoading] = useState(false);
  const [clonedVoice, setClonedVoice] = useState<ClonedVoice | null>(null);
  const [ttsTextForCloned, setTtsTextForCloned] = useState("");
  const [ttsLoadingForCloned, setTtsLoadingForCloned] = useState(false);
  const [ttsAudioUrlForCloned, setTtsAudioUrlForCloned] = useState<string | null>(null);

  const cloneMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cloneAudioChunksRef = useRef<Blob[]>([]);

  // Load cloned voice on mount
  useEffect(() => {
    const saved = getClonedVoice();
    if (saved) {
      setClonedVoice(saved);
    }
  }, []);

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

  // ------------------- Load available voices (owned + purchased) -------------------
  useEffect(() => {
    const loadAvailableVoices = async () => {
      try {
        const allVoices: Array<{ voiceId: string; name: string; modelUri: string; owner: string; isOwned?: boolean }> = [];
        
        // Helper function to check if a Shelby URI is accessible
        const checkShelbyUriExists = async (uri: string, requesterAccount?: string): Promise<boolean> => {
          if (!uri.startsWith("shelby://")) {
            // Not a Shelby URI, assume it exists (e.g., ElevenLabs voices)
            return true;
          }
          
          try {
            const { backendApi } = await import("@/lib/api");
            // Try to download meta.json to verify the voice exists in Shelby
            await backendApi.downloadFromShelby(uri, "meta.json", requesterAccount);
            return true;
          } catch (error) {
            // File doesn't exist or access denied
            console.warn(`Voice not accessible in Shelby: ${uri}`, error);
            return false;
          }
        };
        
        // Add own voice if user has registered one and it exists in Shelby
        if (ownVoiceMetadata && address) {
          const exists = await checkShelbyUriExists(ownVoiceMetadata.modelUri, address.toString());
          if (exists) {
            allVoices.push({
              voiceId: ownVoiceMetadata.voiceId,
              name: ownVoiceMetadata.name,
              modelUri: ownVoiceMetadata.modelUri,
              owner: ownVoiceMetadata.owner,
              isOwned: true, // Mark as owned
            });
          } else {
            console.log(`Own voice ${ownVoiceMetadata.name} not found in Shelby, skipping`);
          }
        }
        
        // Add purchased voices (validate they exist in Shelby)
        const purchased = getPurchasedVoices();
        const validPurchasedVoices: Array<{ voiceId: string; name: string; modelUri: string; owner: string; isOwned?: boolean }> = [];
        
        for (const v of purchased) {
          const exists = await checkShelbyUriExists(v.modelUri, address?.toString());
          if (exists) {
            validPurchasedVoices.push({
              voiceId: v.voiceId,
              name: v.name,
              modelUri: v.modelUri,
              owner: v.owner,
              isOwned: false, // Mark as purchased
            });
          } else {
            console.log(`Purchased voice ${v.name} not found in Shelby, removing from list`);
            // Optionally remove from localStorage if it doesn't exist
            // But we'll leave it in case it's just temporarily unavailable
          }
        }
        
        // Combine owned and purchased (owned first)
        const combinedVoices = [...allVoices, ...validPurchasedVoices];
        setPurchasedVoices(combinedVoices);
        
        // Set default voice if available and none is selected (prefer owned voice)
        // Also clear selection if current selection is no longer valid
        if (selectedPurchasedVoice) {
          const isStillValid = combinedVoices.some(v => v.modelUri === selectedPurchasedVoice);
          if (!isStillValid) {
            setSelectedPurchasedVoice("");
          }
        }
        
        if (combinedVoices.length > 0 && !selectedPurchasedVoice) {
          setSelectedPurchasedVoice(combinedVoices[0].modelUri);
        }
      } catch (error) {
        console.error("Error loading available voices:", error);
        setPurchasedVoices([]);
      }
    };
    
    loadAvailableVoices();
    
    // Refresh when storage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "voicevault_purchased_voices") {
        loadAvailableVoices();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for same-tab changes (e.g., after purchase or registration)
    const interval = setInterval(loadAvailableVoices, 5000); // Check every 5 seconds
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [ownVoiceMetadata, address, selectedPurchasedVoice]); // Include ownVoiceMetadata in deps

  // ------------------- Voice Typing (Speech-to-Text) -------------------
  // Check if Speech Recognition API is available
  const isSpeechRecognitionAvailable = () => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  };

  const getSpeechRecognition = (): any => {
    if ('SpeechRecognition' in window) {
      return new (window as any).SpeechRecognition();
    } else if ('webkitSpeechRecognition' in window) {
      return new (window as any).webkitSpeechRecognition();
    }
    return null;
  };

  // Start voice typing for purchased voices TTS
  const startVoiceTyping = () => {
    if (!isSpeechRecognitionAvailable()) {
      toast.error("Voice typing is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      toast.error("Speech recognition not available");
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsVoiceTyping(true);
      toast.info("Listening... Speak now");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTtsText((prev) => prev + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'no-speech') {
        toast.error("No speech detected. Please try again.");
      } else if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied. Please allow microphone access.");
      } else {
        toast.error(`Speech recognition error: ${event.error}`);
      }
      stopVoiceTyping();
    };

    recognition.onend = () => {
      setIsVoiceTyping(false);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceTyping = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsVoiceTyping(false);
  };

  // Start voice typing for cloned voice TTS
  const startVoiceTypingCloned = () => {
    if (!isSpeechRecognitionAvailable()) {
      toast.error("Voice typing is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      toast.error("Speech recognition not available");
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsVoiceTypingCloned(true);
      toast.info("Listening... Speak now");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTtsTextForCloned((prev) => prev + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'no-speech') {
        toast.error("No speech detected. Please try again.");
      } else if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied. Please allow microphone access.");
      } else {
        toast.error(`Speech recognition error: ${event.error}`);
      }
      stopVoiceTypingCloned();
    };

    recognition.onend = () => {
      setIsVoiceTypingCloned(false);
    };

    speechRecognitionClonedRef.current = recognition;
    recognition.start();
  };

  const stopVoiceTypingCloned = () => {
    if (speechRecognitionClonedRef.current) {
      speechRecognitionClonedRef.current.stop();
      speechRecognitionClonedRef.current = null;
    }
    setIsVoiceTypingCloned(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceTyping();
      stopVoiceTypingCloned();
    };
  }, []);

  // ------------------- TTS Generation with Available Voices -------------------
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) {
      toast.error("Please enter text to generate");
      return;
    }
    if (!selectedPurchasedVoice) {
      toast.error("Please select a voice");
      return;
    }
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to use voices");
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

  // ------------------- Voice Cloning Recording (supports wav/mp3/webm) -------------------
  const startCloneRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use the best supported format
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      }
      
      const recorder = new MediaRecorder(stream, { mimeType });
      cloneMediaRecorderRef.current = recorder;
      cloneAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          cloneAudioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(cloneAudioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "wav";
        const file = new File([blob], `voice-recording-${Date.now()}.${extension}`, { type: mimeType });
        setCloneRecordedAudio(file);
      };

      recorder.start(100); // Collect data every 100ms
      setCloneRecording(true);
      toast.info("Recording started");
    } catch (err: any) {
      console.error("Recording error:", err);
      toast.error("Mic permission denied or recording failed");
    }
  };

  const stopCloneRecording = () => {
    if (cloneMediaRecorderRef.current) {
      cloneMediaRecorderRef.current.stop();
      cloneMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setCloneRecording(false);
    toast.success("Recording stopped");
  };

  // ------------------- File Upload for Cloning (accepts wav/mp3/webm) -------------------
  const handleCloneFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept audio files (wav, mp3, webm, etc.)
      if (file.type.startsWith("audio/") || 
          file.name.match(/\.(wav|mp3|webm|ogg|m4a)$/i)) {
        setCloneRecordedAudio(file);
        toast.success("Audio file selected");
      } else {
        toast.error("Please select an audio file (wav, mp3, or webm)");
      }
    }
  };

  // ------------------- Voice Cloning Handler -------------------
  const handleCloneVoice = async () => {
    if (!cloneRecordedAudio) {
      toast.error("Please record or upload an audio file first");
      return;
    }

    if (!cloneVoiceName.trim()) {
      toast.error("Please enter a name for your voice");
      return;
    }

    setCloneLoading(true);
    try {
      const { backendApi } = await import("@/lib/api");
      toast.info("Uploading audio and cloning voice with ElevenLabs...");
      
      const result = await backendApi.cloneVoice(
        cloneVoiceName.trim(),
        cloneRecordedAudio,
        cloneSampleText.trim() || undefined
      );
      
      // Store cloned voice
      const clonedVoiceData: ClonedVoice = {
        voiceId: result.voice_id,
        name: result.name || cloneVoiceName.trim(),
        clonedAt: Date.now(),
        audioFormat: cloneRecordedAudio.type || "unknown",
      };
      
      addClonedVoice(clonedVoiceData);
      setClonedVoice(clonedVoiceData);
      
      toast.success("Voice cloned successfully! You can now use it for text-to-speech.");
    } catch (err: any) {
      console.error("Voice cloning error:", err);
      toast.error(err.message || "Failed to clone voice");
    } finally {
      setCloneLoading(false);
    }
  };

  // ------------------- TTS with Cloned Voice Handler -------------------
  const handleGenerateTTSWithCloned = async () => {
    if (!clonedVoice) {
      toast.error("No cloned voice available. Clone a voice first.");
      return;
    }
    if (!ttsTextForCloned.trim()) {
      toast.error("Please enter text to generate");
      return;
    }

    setTtsLoadingForCloned(true);
    try {
      const { backendApi } = await import("@/lib/api");
      toast.info("Generating speech with your cloned voice...");
      
      // Backend returns audio blob, which can be directly used in HTML audio element
      const audioBlob = await backendApi.generateElevenLabsSpeech(
        clonedVoice.voiceId,
        ttsTextForCloned
      );
      
      // Create object URL for direct playback
      const url = URL.createObjectURL(audioBlob);
      setTtsAudioUrlForCloned(url);
      toast.success("Speech generated successfully!");
    } catch (err: any) {
      console.error("TTS error:", err);
      toast.error(err.message || "Failed to generate speech");
    } finally {
      setTtsLoadingForCloned(false);
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

          {/* ------------------- TTS with Available Voices Section ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Text → Speech with Your Voices</CardTitle>
              <CardDescription>
                Generate speech using your own registered voice or voices you've purchased from the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Please connect your wallet to use voices.
                  </p>
                </div>
              )}

              {purchasedVoices.length === 0 ? (
                <div className="p-6 border-2 border-dashed rounded-lg text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No voices available yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Register your own voice below, or visit the Marketplace to buy voices.
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      }}
                    >
                      Register Your Voice
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/marketplace";
                      }}
                    >
                      Go to Marketplace
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="purchased-voice">Select Voice</Label>
                    <Select value={selectedPurchasedVoice} onValueChange={setSelectedPurchasedVoice}>
                      <SelectTrigger id="purchased-voice">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchasedVoices.map((voice) => (
                          <SelectItem key={voice.modelUri} value={voice.modelUri}>
                            {voice.name} {voice.isOwned ? "👤 (Your Voice)" : `(Purchased)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {purchasedVoices.find(v => v.modelUri === selectedPurchasedVoice)?.isOwned && (
                      <p className="text-xs text-muted-foreground">
                        ✓ You own this voice - free to use
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tts-text">Enter Text</Label>
                      {isSpeechRecognitionAvailable() && (
                        <Button
                          type="button"
                          variant={isVoiceTyping ? "destructive" : "outline"}
                          size="sm"
                          onClick={isVoiceTyping ? stopVoiceTyping : startVoiceTyping}
                          disabled={ttsLoading}
                        >
                          {isVoiceTyping ? (
                            <>
                              <Mic className="h-4 w-4 mr-2 animate-pulse" />
                              Stop Voice Typing
                            </>
                          ) : (
                            <>
                              <Mic className="h-4 w-4 mr-2" />
                              Voice Typing
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="tts-text"
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      placeholder="Type text here or use voice typing to generate speech with your purchased voice..."
                      className="min-h-[100px]"
                    />
                    {isVoiceTyping && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mic className="h-3 w-3 animate-pulse" />
                        Listening... Speak clearly into your microphone
                      </p>
                    )}
                  </div>
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

          {/* ------------------- Voice Cloning with ElevenLabs ------------------- */}
          {/*
          <Card>
            <CardHeader>
              <CardTitle>🎤 Clone Your Voice with ElevenLabs</CardTitle>
              <CardDescription>
                Record your voice in the browser or upload an audio file (wav/mp3/webm). 
                The audio is uploaded to the backend, which creates a cloned voice in ElevenLabs. 
                Then use your cloned voice for text-to-speech generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Step 1: Record or Upload Audio File (WAV/MP3/WEBM)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                  <div className="space-y-2">
                    {!cloneRecording ? (
                      <Button onClick={startCloneRecording} className="w-full" disabled={cloneLoading}>
                        <Mic2 className="h-5 w-5 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button onClick={stopCloneRecording} className="w-full" variant="destructive">
                        <Mic2 className="h-5 w-5 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                    {cloneRecording && (
                      <div className="flex items-center justify-center space-x-2 text-red-600 dark:text-red-400">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Recording...</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">OR</div>
                  
                  <div>
                    <input
                      type="file"
                      accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a"
                      onChange={handleCloneFileUpload}
                      className="hidden"
                      id="clone-audio-upload"
                      disabled={cloneLoading}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("clone-audio-upload")?.click()}
                      className="w-full"
                      disabled={cloneLoading}
                    >
                      <UploadIcon className="h-5 w-5 mr-2" />
                      Upload Audio File (WAV/MP3/WEBM)
                    </Button>
                  </div>
                  
                  {cloneRecordedAudio && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Audio ready: {cloneRecordedAudio.name} ({(cloneRecordedAudio.size / 1024).toFixed(1)} KB)
                      </p>
                      <audio controls src={URL.createObjectURL(cloneRecordedAudio)} className="w-full" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clone-voice-name">
                  Step 2: Voice Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clone-voice-name"
                  placeholder="e.g., My Voice Clone"
                  value={cloneVoiceName}
                  onChange={(e) => setCloneVoiceName(e.target.value)}
                  disabled={cloneLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clone-sample-text">
                  Step 3: What did you say in the recording? (Optional but recommended)
                </Label>
                <Textarea
                  id="clone-sample-text"
                  value={cloneSampleText}
                  onChange={(e) => setCloneSampleText(e.target.value)}
                  placeholder="Enter the text you spoke in the recording. This helps improve voice cloning quality..."
                  className="min-h-[80px]"
                  disabled={cloneLoading || !cloneRecordedAudio}
                />
                <p className="text-xs text-muted-foreground">
                  Providing the text you spoke during recording helps ElevenLabs better understand and clone your voice characteristics.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Step 4: Upload & Clone Voice</Label>
                <Button 
                  onClick={handleCloneVoice} 
                  disabled={cloneLoading || !cloneRecordedAudio || !cloneVoiceName.trim()} 
                  className="w-full"
                >
                  {cloneLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Uploading & Cloning Voice...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Upload & Clone Voice
                    </>
                  )}
                </Button>
              </div>

              {clonedVoice && (
                <div className="space-y-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                      ✓ Voice cloned successfully!
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Voice ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{clonedVoice.voiceId}</code>
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="clone-tts-text">Step 5: Generate Text-to-Speech</Label>
                      {isSpeechRecognitionAvailable() && (
                        <Button
                          type="button"
                          variant={isVoiceTypingCloned ? "destructive" : "outline"}
                          size="sm"
                          onClick={isVoiceTypingCloned ? stopVoiceTypingCloned : startVoiceTypingCloned}
                          disabled={ttsLoadingForCloned}
                        >
                          {isVoiceTypingCloned ? (
                            <>
                              <Mic className="h-4 w-4 mr-2 animate-pulse" />
                              Stop Voice Typing
                            </>
                          ) : (
                            <>
                              <Mic className="h-4 w-4 mr-2" />
                              Voice Typing
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="clone-tts-text"
                      value={ttsTextForCloned}
                      onChange={(e) => setTtsTextForCloned(e.target.value)}
                      placeholder="Enter text you want your cloned voice to speak, or use voice typing..."
                      className="min-h-[100px]"
                    />
                    {isVoiceTypingCloned && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mic className="h-3 w-3 animate-pulse" />
                        Listening... Speak clearly into your microphone
                      </p>
                    )}
                    <Button 
                      onClick={handleGenerateTTSWithCloned} 
                      disabled={ttsLoadingForCloned || !ttsTextForCloned.trim()} 
                      className="w-full"
                    >
                      {ttsLoadingForCloned ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Generating Speech...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Generate Speech
                        </>
                      )}
                    </Button>
                    
                    {ttsAudioUrlForCloned && (
                      <div className="space-y-2 pt-2">
                        <audio controls src={ttsAudioUrlForCloned} className="w-full" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = ttsAudioUrlForCloned;
                            a.download = `cloned-voice-tts-${Date.now()}.mp3`;
                            a.click();
                          }}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Audio
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card> */}

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
