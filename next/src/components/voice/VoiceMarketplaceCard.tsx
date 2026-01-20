"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceMetadata } from "@/hooks/useVoiceMetadata";

interface VoiceMarketplaceCardProps {
  voice: VoiceMetadata;
  onPurchaseSuccess: (voice: VoiceMetadata, txHash: string) => void;
}

export function VoiceMarketplaceCard({ voice, onPurchaseSuccess }: VoiceMarketplaceCardProps) {
  const handlePurchase = async () => {
    // Placeholder for purchase logic
    console.log('Purchase voice:', voice.voiceId);
    // Simulate successful purchase
    onPurchaseSuccess(voice, 'mock-tx-hash');
  };

  return (
    <Card className="glass-card-hover">
      <CardHeader>
        <CardTitle className="text-lg">{voice.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          by {voice.owner.slice(0, 6)}...{voice.owner.slice(-4)}
        </p>
      </CardHeader>
      <CardContent>
        {voice.description && (
          <p className="text-sm text-muted-foreground mb-4">{voice.description}</p>
        )}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">{voice.pricePerUse} APT</span>
          <Button onClick={handlePurchase}>
            Purchase
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}