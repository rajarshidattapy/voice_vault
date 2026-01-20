// Placeholder for voice metadata hook
export interface VoiceMetadata {
  voiceId: string;
  name: string;
  description?: string;
  owner: string;
  modelUri: string;
  pricePerUse: number;
  rights?: string;
}

export function useVoiceMetadata(address: string) {
  // This would normally fetch from Aptos blockchain
  return {
    voice: null as VoiceMetadata | null,
    isLoading: false,
    error: null,
  };
}