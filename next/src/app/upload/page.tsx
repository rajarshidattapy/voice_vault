"use client";

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
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPurchasedVoices } from "@/lib/purchasedVoices";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { useVoiceMetadata } from "@/hooks/useVoiceMetadata";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

function UploadPage() {
  // ------------------- TTS with Purchased Voices -------------------
  const [ttsText, setTtsText] = useState("");
  const [selectedPurchasedVoice, setSelectedPurchasedVoice] = useState<string>(""); // modelUri of selected voice
  const [purchasedVoices, setPurchasedVoices] = useState<Array<{ voiceId: string; name: string; modelUri: string; owner: string; isOwned?: boolean }>>([]);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isVoiceTyping, setIsVoiceTyping] = useState(false);

  // ------------------- Voice Model Processing (Shelby) -------------------
  const { address, isConnected } = useAptosWallet();
  
  // Check if user has their own registered voice
  const { voice: ownVoiceMetadata } = useVoiceMetadata(address?.toString() || "");
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

  // Load purchased voices on mount
  useEffect(() => {
    const voices = getPurchasedVoices();
    const voiceList = voices.map(v => ({
      voiceId: v.voiceId,
      name: v.name,
      modelUri: v.modelUri,
      owner: v.owner,
    }));

    // Add user's own voice if they have one
    if (ownVoiceMetadata) {
      voiceList.unshift({
        voiceId: ownVoiceMetadata.voiceId,
        name: ownVoiceMetadata.name,
        modelUri: ownVoiceMetadata.modelUri,
        owner: ownVoiceMetadata.owner,
        isOwned: true,
      });
    }

    setPurchasedVoices(voiceList);
  }, [ownVoiceMetadata]);

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
    } catch (err) {
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  // ------------------- File Upload -------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // ------------------- Voice Processing -------------------
  const processVoiceModel = async () => {
    if (!selectedFile || !voiceName || !address) {
      toast.error("Please provide audio file, voice name, and connect wallet");
      return;
    }

    setProcessingLoading(true);
    try {
      // This would call the API to process the voice model
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockUri = `shelby://${address}/voices/${Date.now()}`;
      setProcessedVoiceUri(mockUri);
      setAutoName(voiceName);
      setAutoModelUri(mockUri);
      
      toast.success("Voice model processed successfully!");
    } catch (error) {
      toast.error("Failed to process voice model");
    } finally {
      setProcessingLoading(false);
    }
  };

  // ------------------- TTS Generation -------------------
  const generateTTS = async () => {
    if (!ttsText || !selectedPurchasedVoice) {
      toast.error("Please enter text and select a voice");
      return;
    }

    setTtsLoading(true);
    try {
      // This would call the unified TTS API
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock audio URL
      setTtsAudioUrl("data:audio/wav;base64,mock-audio-data");
      toast.success("TTS generated successfully!");
    } catch (error) {
      toast.error("Failed to generate TTS");
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-2xl mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Create & Use <span className="gradient-text">AI Voices</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload your voice, train AI models, and generate speech with purchased voices.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Voice Model Creation */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic2 className="h-5 w-5" />
                  Create Voice Model
                </CardTitle>
                <CardDescription>
                  Upload audio to train your AI voice model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="voice-name">Voice Name</Label>
                  <Input
                    id="voice-name"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder="My Professional Voice"
                  />
                </div>

                <div>
                  <Label htmlFor="voice-description">Description (Optional)</Label>
                  <Textarea
                    id="voice-description"
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                    placeholder="A professional narrator voice..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audio Input</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={recording ? "destructive" : "outline"}
                      onClick={recording ? stopRecording : startRecording}
                      className="flex-1"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      {recording ? "Stop Recording" : "Record Audio"}
                    </Button>
                    <div className="relative flex-1">
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" className="w-full pointer-events-none">
                        <UploadIcon className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={processVoiceModel}
                  disabled={processingLoading || !selectedFile || !voiceName}
                  className="w-full"
                >
                  {processingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Process Voice Model
                    </>
                  )}
                </Button>

                {processedVoiceUri && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-500 font-medium">
                      ✅ Voice model processed successfully!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      URI: {processedVoiceUri}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TTS Generation */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate Speech
                </CardTitle>
                <CardDescription>
                  Use your voices or purchased voices for TTS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="voice-select">Select Voice</Label>
                  <Select value={selectedPurchasedVoice} onValueChange={setSelectedPurchasedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a voice..." />
                    </SelectTrigger>
                    <SelectContent>
                      {purchasedVoices.map((voice) => (
                        <SelectItem key={voice.modelUri} value={voice.modelUri}>
                          {voice.name} {voice.isOwned ? "(Your Voice)" : `(by ${voice.owner.slice(0, 6)}...)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tts-text">Text to Speech</Label>
                  <Textarea
                    id="tts-text"
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter the text you want to convert to speech..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={generateTTS}
                  disabled={ttsLoading || !ttsText || !selectedPurchasedVoice}
                  className="w-full"
                >
                  {ttsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Speech
                    </>
                  )}
                </Button>

                {ttsAudioUrl && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-primary font-medium mb-2">
                      🎵 Speech generated successfully!
                    </p>
                    <audio controls className="w-full">
                      <source src={ttsAudioUrl} type="audio/wav" />
                    </audio>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Voice Registration Form */}
          {processedVoiceUri && (
            <div className="mt-8">
              <VoiceRegistrationForm
                initialName={autoName}
                initialModelUri={autoModelUri}
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Upload() {
  return (
    <ProtectedRoute>
      <UploadPage />
    </ProtectedRoute>
  );
}