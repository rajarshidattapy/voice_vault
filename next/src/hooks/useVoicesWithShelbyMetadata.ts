import { VoiceMetadata } from "./useVoiceMetadata";

export function useVoicesWithShelbyMetadata(addresses: string[]) {
  // This would normally fetch voices from Aptos and enrich with Shelby metadata
  return {
    voices: [] as VoiceMetadata[],
    isLoading: false,
    error: null,
  };
}