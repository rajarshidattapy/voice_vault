import { useState, useEffect } from "react";
import { aptosClient } from "./useAptosWallet";
import { CONTRACTS, octasToApt } from "@/lib/contracts";
import { VoiceMetadata } from "./useVoiceMetadata";

/**
 * Fetch metadata for multiple voice addresses in parallel
 * More efficient than calling useVoiceMetadata in a loop
 */
export function useMultipleVoiceMetadata(addresses: string[]) {
  const [voices, setVoices] = useState<VoiceMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addresses || addresses.length === 0) {
      setVoices([]);
      setIsLoading(false);
      return;
    }

    const fetchAllMetadata = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Create promises for all addresses
        const promises = addresses.map(async (address) => {
          try {
            const result = await aptosClient.view({
              payload: {
                function: `${CONTRACTS.VOICE_IDENTITY.address}::${CONTRACTS.VOICE_IDENTITY.module}::get_metadata`,
                typeArguments: [],
                functionArguments: [address],
              },
            });

            // Parse the result tuple
            const [owner, voiceId, name, modelUri, rights, priceInOctas, createdAt] = result;

            return {
              owner: owner as string,
              voiceId: voiceId as string,
              name: name as string,
              modelUri: modelUri as string,
              rights: rights as string,
              pricePerUse: octasToApt(Number(priceInOctas)),
              createdAt: Number(createdAt),
            } as VoiceMetadata;
          } catch (err) {
            console.warn(`Failed to fetch metadata for ${address}:`, err);
            return null;
          }
        });

        // Wait for all promises to settle
        const results = await Promise.all(promises);

        // Filter out null results (failed fetches)
        const validVoices = results.filter((v): v is VoiceMetadata => v !== null);

        setVoices(validVoices);
      } catch (err: any) {
        console.error("Error fetching multiple voice metadata:", err);
        setError(err.message || "Failed to fetch voices");
        setVoices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllMetadata();
  }, [addresses.join(",")]); // Only re-fetch if addresses change

  return { voices, isLoading, error };
}
