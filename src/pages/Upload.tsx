import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VoiceRegistrationForm } from "@/components/voice/VoiceRegistrationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Download, Loader2, Mic2, ShoppingBag } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Client } from "@gradio/client";
import { useRewards } from "@/contexts/RewardsContext";
import { getPurchasedOpenAIVoices } from "@/lib/purchasedVoices";

const Upload = () => {
  const { logEvent } = useRewards();
  const [purchasedVoices, setPurchasedVoices] = useState<any[]>([]);

  // ---------- OPENAI TTS ----------
  const [openaiText, setOpenaiText] = useState("");
  const [openaiVoice, setOpenaiVoice] = useState("alloy");
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [openaiAudioUrl, setOpenaiAudioUrl] = useState<string | null>(null);

  // ---------- VOICE CLONING ----------
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneText, setCloneText] = useState("");
  const [clonedUrl, setClonedUrl] = useState<string | null>(null);

  // Load purchased voices on mount
  useEffect(() => {
    const purchased = getPurchasedOpenAIVoices();
    setPurchasedVoices(purchased);
    console.log("[Upload] Loaded purchased voices:", purchased);
  }, []);

  // Map purchased voices to dropdown format
  const availableVoices = purchasedVoices.length > 0
    ? purchasedVoices.map((v) => ({
      id: v.modelUri.replace("openai:", ""),
      name: v.name,
      description: `Purchased for ${v.price} APT`,
    }))
    : [
      // Default voices if none purchased (for testing)
      { id: "alloy", name: "Alex Sterling", description: "Demo voice" },
      { id: "echo", name: "Luna Rivers", description: "Demo voice" },
      { id: "fable", name: "Marcus Deep", description: "Demo voice" },
      { id: "onyx", name: "Aria Voice", description: "Demo voice" },
      { id: "nova", name: "Zen Master", description: "Demo voice" },
      { id: "shimmer", name: "Ember Spark", description: "Demo voice" },
    ];

  // ---------- Microphone recording ----------
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  let chunks: Blob[] = [];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        const file = new File([audioBlob], "mic_recording.wav", { type: "audio/wav" });
        setSelectedFile(file);
        toast.success("Microphone audio captured");
      };

      recorder.start();
      setRecording(true);
      toast.info("Recording started...");
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    toast.info("Recording stopped");
  };

  // Load purchased voices on mount
  useEffect(() => {
    const purchased = getPurchasedOpenAIVoices();
    setPurchasedVoices(purchased);
    console.log("[Upload] Loaded purchased voices:", purchased);
  }, []);



  // ---------- OPENAI TEXT TO SPEECH ----------
  const handleOpenAITTS = async () => {
    if (!openaiText.trim()) {
      toast.error("Please enter some text");
      return;
    }

    setOpenaiLoading(true);
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: openaiVoice,
          input: openaiText,
        }),
      });

      if (!response.ok) throw new Error("TTS request failed");
      const blob = await response.blob();
      setOpenaiAudioUrl(URL.createObjectURL(blob));

      toast.success("Audio generated successfully!");
      await logEvent("TTS_GENERATED");
    } catch (err) {
      toast.error("OpenAI Error", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setOpenaiLoading(false);
    }
  };

  // ---------- NEW VOICE CLONE ----------
  const handleVoiceClone = async () => {
    if (!selectedFile) {
      toast.error("Record your voice first");
      return;
    }
    if (!cloneText.trim()) {
      toast.error("Enter text to synthesize");
      return;
    }

    setCloneLoading(true);
    try {
      const client = await Client.connect("tonyassi/voice-clone");

      const result = await client.predict("/predict", {
        text: cloneText,
        audio: selectedFile,
      });

      const audio = result.data[0];
      setClonedUrl(audio.url);

      const a = document.createElement("a");
      a.href = audio.url;
      a.download = `voiceclone-${Date.now()}.wav`;
      a.click();

      toast.success("Voice clone generated!");
      await logEvent("VOICE_CLONED");
    } catch (err) {
      toast.error("Voice cloning error", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCloneLoading(false);
    }
  };

  const handleDownload = (audioUrl: string | null, prefix: string) => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${prefix}-${Date.now()}.wav`;
    a.click();
  };

  return (
    <>
      <Helmet><title>Create Voice - VoiceVault</title></Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-16">
          <div className="container mx-auto px-4 max-w-5xl space-y-10">

            <div className="mb-8">
              <VoiceRegistrationForm />
            </div>

            <div className="border-t pt-8">
              <h2 className="text-2xl font-bold mb-6">Test Voice Models</h2>
            </div>

            {/* ---------- OPENAI TTS CARD ---------- */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Try Models
                  {purchasedVoices.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({purchasedVoices.length} purchased)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {purchasedVoices.length > 0
                    ? "Generate audio with your purchased voices"
                    : "Purchase voices from the marketplace to use them here"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {purchasedVoices.length === 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                    <ShoppingBag className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-500 mb-1">No voices purchased yet</p>
                      <p className="text-muted-foreground">
                        Visit the Marketplace to purchase voices. Once purchased, they'll appear here for you to use.
                      </p>
                    </div>
                  </div>
                )}

                <Select value={openaiVoice} onValueChange={setOpenaiVoice}>
                  <SelectTrigger><SelectValue placeholder="Choose a voice..." /></SelectTrigger>
                  <SelectContent>
                    {availableVoices.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {v.description}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Textarea
                  value={openaiText}
                  onChange={(e) => setOpenaiText(e.target.value)}
                  placeholder="Enter text to convert to speech..."
                  className="min-h-[150px]"
                />

                <Button onClick={handleOpenAITTS} disabled={openaiLoading} className="w-full" size="lg">
                  {openaiLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating…</>
                    : <><Sparkles className="h-5 w-5" /> Generate Speech</>}
                </Button>

                {openaiAudioUrl && (
                  <div className="bg-muted/50 p-6 rounded-xl space-y-4">
                    <audio src={openaiAudioUrl} controls className="w-full" />
                    <Button onClick={() => handleDownload(openaiAudioUrl, "openai-tts")} variant="outline" className="w-full">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ---------- VOICE CLONING CARD ---------- */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Clone Your Voice</CardTitle>
                <CardDescription>Record sample voice + generate cloned speech</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Microphone */}
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4">
                  {!recording ? (
                    <Button onClick={startRecording} className="w-full" variant="default">
                      🎤 Start Recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} className="w-full" variant="destructive">
                      ⏹ Stop Recording
                    </Button>
                  )}
                  {selectedFile && <p className="font-medium text-primary">{selectedFile.name}</p>}
                </div>

                {/* Text input */}
                <div className="space-y-2">
                  <Label>Text to Synthesize</Label>
                  <Textarea
                    value={cloneText}
                    onChange={(e) => setCloneText(e.target.value)}
                    placeholder="Enter text for cloned speech..."
                    className="min-h-[120px]"
                  />
                </div>

                <Button onClick={handleVoiceClone} disabled={cloneLoading} className="w-full" size="lg">
                  {cloneLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Cloning…</>
                    : <><Mic2 className="h-5 w-5" /> Clone With Recorded Voice</>}
                </Button>

                {clonedUrl && (
                  <div className="bg-muted/50 p-6 rounded-xl space-y-4">
                    <audio src={clonedUrl} controls className="w-full" />
                    <Button onClick={() => handleDownload(clonedUrl, "voiceclone")} variant="outline" className="w-full">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Upload;
