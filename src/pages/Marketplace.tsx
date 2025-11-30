import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, TrendingUp, Clock, Star } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { VoiceMetadata } from "@/hooks/useVoiceMetadata";
import { useMultipleVoiceMetadata } from "@/hooks/useMultipleVoiceMetadata";
import { VoiceMarketplaceCard } from "@/components/voice/VoiceMarketplaceCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { getVoiceAddresses } from "@/lib/voiceRegistry";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const filterTabs = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "newest", label: "Newest", icon: Clock },
  { id: "top-rated", label: "Top Rated", icon: Star },
];

// Mock voices for testing - these simulate registered voices on-chain
const MOCK_VOICES: VoiceMetadata[] = [
  {
    owner: "0xed25fa42116e7247381a3168b0de39af2eb7bedf4db94364c41fc7699b1c1a71",
    voiceId: "1",
    name: "Alex Sterling",
    modelUri: "openai:alloy",
    rights: "commercial",
    pricePerUse: 0.1,
    createdAt: Date.now() - 86400000,
  },
  {
    owner: "0x0bf154dc582a43ec543711fba16c44e02cec2f660868f1fa164f1816fa7f1952",
    voiceId: "2",
    name: "Luna Rivers",
    modelUri: "openai:echo",
    rights: "commercial",
    pricePerUse: 0.15,
    createdAt: Date.now() - 172800000,
  },
  {
    owner: "0xed25fa42116e7247381a3168b0de39af2eb7bedf4db94364c41fc7699b1c1a71",
    voiceId: "3",
    name: "Marcus Deep",
    modelUri: "openai:fable",
    rights: "personal",
    pricePerUse: 0.08,
    createdAt: Date.now() - 259200000,
  },
  {
    owner: "0x0bf154dc582a43ec543711fba16c44e02cec2f660868f1fa164f1816fa7f1952",
    voiceId: "4",
    name: "Aria Voice",
    modelUri: "openai:onyx",
    rights: "commercial",
    pricePerUse: 0.12,
    createdAt: Date.now() - 345600000,
  },
  {
    owner: "0xed25fa42116e7247381a3168b0de39af2eb7bedf4db94364c41fc7699b1c1a71",
    voiceId: "5",
    name: "Zen Master",
    modelUri: "openai:nova",
    rights: "commercial",
    pricePerUse: 0.2,
    createdAt: Date.now() - 432000000,
  },
  {
    owner: "0x0bf154dc582a43ec543711fba16c44e02cec2f660868f1fa164f1816fa7f1952",
    voiceId: "6",
    name: "Ember Spark",
    modelUri: "openai:shimmer",
    rights: "commercial",
    pricePerUse: 0.09,
    createdAt: Date.now() - 518400000,
  },
];

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("trending");
  const [voiceAddresses, setVoiceAddresses] = useState<string[]>([]);
  
  // TTS Dialog state
  const [selectedVoice, setSelectedVoice] = useState<VoiceMetadata | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const [showTTSDialog, setShowTTSDialog] = useState(false);
  const [ttsText, setTtsText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  // Load voice addresses from registry
  useEffect(() => {
    const addresses = getVoiceAddresses();
    setVoiceAddresses(addresses);
  }, []);

  // Fetch metadata for all registered voices using the optimized hook
  const { voices: onChainVoices, isLoading: isLoadingOnChain } = useMultipleVoiceMetadata(voiceAddresses);
  
  // Combine on-chain voices with mock data (mocks fill in when no real voices exist)
  const voices = onChainVoices.length > 0 ? onChainVoices : MOCK_VOICES;
  const isLoading = isLoadingOnChain;

  const handleVoiceSelected = (voice: VoiceMetadata, txHash: string) => {
    setSelectedVoice(voice);
    setPaymentTxHash(txHash);
    setShowTTSDialog(true);
    setGeneratedAudioUrl(null);
    setTtsText("");
  };

  const handleGenerateTTS = async () => {
    if (!ttsText.trim() || !selectedVoice) {
      toast.error("Please enter text to generate");
      return;
    }

    setIsGenerating(true);

    try {
      // Check if it's an OpenAI voice
      if (selectedVoice.modelUri.startsWith("openai:")) {
        const voiceId = selectedVoice.modelUri.replace("openai:", "");
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            voice: voiceId,
            input: ttsText,
          }),
        });

        if (!response.ok) throw new Error("TTS generation failed");
        const blob = await response.blob();
        setGeneratedAudioUrl(URL.createObjectURL(blob));
        toast.success("Audio generated successfully!");
      } else {
        // For custom voices, show a message
        toast.info("Custom voice inference requires additional setup. Using default voice for demo.");
        
        // You could implement Gradio client here for custom voices
        // const client = await Client.connect("ResembleAI/Chatterbox");
        // ... etc
      }
    } catch (error: any) {
      toast.error("Generation failed", {
        description: error.message || "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedAudioUrl) return;
    const a = document.createElement("a");
    a.href = generatedAudioUrl;
    a.download = `voicevault-${selectedVoice?.name}-${Date.now()}.wav`;
    a.click();
  };

  return (
    <>
      <Helmet>
        <title>Voice Marketplace - VoiceVault</title>
        <meta name="description" content="Discover and license AI voice models from creators worldwide. Find the perfect voice for your project." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="max-w-2xl mb-8">
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Voice <span className="gradient-text">Marketplace</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Discover unique AI voice models from creators around the world. License instantly, pay per use.
              </p>
            </div>



            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search voices by name, creator, or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-card border-border"
                />
              </div>
              <Button variant="outline" className="h-12">
                <SlidersHorizontal className="h-5 w-5 mr-2" />
                Filters
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeFilter === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Voice Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : voices.length === 0 ? (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  No voices available yet. Be the first to register your voice!
                  <br />
                  <span className="text-xs text-muted-foreground mt-2 block">
                    Go to the Upload page to register your voice on-chain.
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {voices
                  .filter((voice) =>
                    searchQuery
                      ? voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        voice.owner.toLowerCase().includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((voice) => (
                    <VoiceMarketplaceCard
                      key={`${voice.owner}-${voice.voiceId}`}
                      voice={voice}
                      onPaymentSuccess={(txHash, voice) => handleVoiceSelected(voice, txHash)}
                    />
                  ))}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* TTS Generation Dialog (shown after payment) */}
      <Dialog open={showTTSDialog} onOpenChange={setShowTTSDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Speech with {selectedVoice?.name}</DialogTitle>
            <DialogDescription>
              Payment successful! Transaction: {paymentTxHash?.slice(0, 8)}...{paymentTxHash?.slice(-6)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tts-text">Enter text to generate</Label>
              <Textarea
                id="tts-text"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Type your text here..."
                className="min-h-[150px]"
              />
            </div>

            <Button
              onClick={handleGenerateTTS}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Speech
                </>
              )}
            </Button>

            {generatedAudioUrl && (
              <div className="bg-muted/50 p-6 rounded-xl space-y-4">
                <audio src={generatedAudioUrl} controls className="w-full" />
                <Button onClick={handleDownload} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Audio
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Marketplace;
