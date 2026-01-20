"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, TrendingUp, Clock, Star, RefreshCw } from "lucide-react";
import { VoiceMetadata } from "@/hooks/useVoiceMetadata";
import { useVoicesWithShelbyMetadata } from "@/hooks/useVoicesWithShelbyMetadata";
import { VoiceMarketplaceCard } from "@/components/voice/VoiceMarketplaceCard";
import { toast } from "sonner";
import { getVoiceAddresses } from "@/lib/voiceRegistry";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

const filterTabs = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "newest", label: "Newest", icon: Clock },
  { id: "top-rated", label: "Top Rated", icon: Star },
];

function MarketplacePage() {
  const { address } = useAptosWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("trending");
  const [voiceAddresses, setVoiceAddresses] = useState<string[]>([]);

  // Load voice addresses from localStorage registry
  // Note: These are addresses that have registered voices on-chain
  // The actual voice metadata is fetched from Aptos (on-chain) and Shelby (meta.json)
  // In the future, we could query blockchain events to discover all registered voices
  useEffect(() => {
    const addresses = getVoiceAddresses();
    setVoiceAddresses(addresses);
  }, []);

  // Fetch voices with metadata from both Aptos (on-chain) and Shelby (meta.json)
  // Aptos provides: owner, price, rights, modelUri
  // Shelby provides: name, description, preview audio
  const { voices: enrichedVoices, isLoading: isLoadingVoices } = useVoicesWithShelbyMetadata(voiceAddresses);
  
  // Only show voices registered on-chain (no mock data, no ElevenLabs voices)
  const voices = enrichedVoices;
  const isLoading = isLoadingVoices;

  const handlePurchaseSuccess = async (voice: VoiceMetadata, txHash: string) => {
    // Track purchased voice in localStorage
    const { addPurchasedVoice } = await import("@/lib/purchasedVoices");
    addPurchasedVoice({
      voiceId: voice.voiceId,
      name: voice.name,
      modelUri: voice.modelUri,
      owner: voice.owner,
      price: voice.pricePerUse,
      purchasedAt: Date.now(),
      txHash: txHash,
    });

    toast.success("Voice purchased successfully!", {
      description: "You can now use this voice in the Upload page for TTS generation.",
      duration: 5000,
      action: {
        label: "Go to Upload",
        onClick: () => {
          window.location.href = "/upload";
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-2xl mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Voice <span className="gradient-text">Marketplace</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover unique AI voice models registered on Aptos blockchain. License instantly, pay per use.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm text-muted-foreground">
                Showing <strong>{voices.length}</strong> voice{voices.length !== 1 ? 's' : ''} registered on-chain
              </p>
              {voices.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  • All voices verified on Aptos blockchain
                </span>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search voices by name or creator address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="default">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeFilter === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveFilter(tab.id)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card p-6">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-4" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && voices.length === 0 && (
            <div className="text-center py-16">
              <div className="glass-card p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No voices found</h3>
                <p className="text-muted-foreground mb-4">
                  No voices have been registered on the blockchain yet. Be the first to create and register a voice!
                </p>
                <Button asChild>
                  <a href="/upload">Create Voice</a>
                </Button>
              </div>
            </div>
          )}

          {/* Voice Grid */}
          {!isLoading && voices.length > 0 && (
            <>
              <Alert className="mb-6">
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  All voices are registered on Aptos blockchain with transparent pricing and ownership. 
                  Purchase once, use forever with per-generation payments.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {voices
                  .filter((voice) => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      voice.name.toLowerCase().includes(query) ||
                      voice.owner.toLowerCase().includes(query) ||
                      (voice.description && voice.description.toLowerCase().includes(query))
                    );
                  })
                  .map((voice) => (
                    <VoiceMarketplaceCard
                      key={voice.voiceId}
                      voice={voice}
                      onPurchaseSuccess={handlePurchaseSuccess}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Marketplace() {
  return (
    <ProtectedRoute>
      <MarketplacePage />
    </ProtectedRoute>
  );
}