import { useState, useEffect } from "react";
import { aptosClient } from "./useAptosWallet";
import { CONTRACTS, octasToApt } from "@/lib/contracts";

export interface VoiceMetadata {
  owner: string;
  voiceId: string;
  name: string;
  modelUri: string;
  rights: string;
  pricePerUse: number; // in APT
  createdAt: number; // timestamp
}

/**
 * Fetch voice metadata for a specific owner address
 */
export function useVoiceMetadata(ownerAddress: string | null) {
  const [metadata, setMetadata] = useState<VoiceMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerAddress) {
      setMetadata(null);
      return;
    }

    const fetchMetadata = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Call view function to get metadata
        const result = await aptosClient.view({
          payload: {
            function: `${CONTRACTS.VOICE_IDENTITY.address}::${CONTRACTS.VOICE_IDENTITY.module}::get_metadata`,
            typeArguments: [],
            functionArguments: [ownerAddress],
          },
        });

        // Parse the result tuple: (owner, voice_id, name, model_uri, rights, price_per_use, created_at)
        const [owner, voiceId, name, modelUri, rights, priceInOctas, createdAt] = result;

        setMetadata({
          owner: owner as string,
          voiceId: voiceId as string,
          name: name as string,
          modelUri: modelUri as string,
          rights: rights as string,
          pricePerUse: octasToApt(Number(priceInOctas)),
          createdAt: Number(createdAt),
        });
      } catch (err: any) {
        console.error("Error fetching voice metadata:", err);
        setError(err.message || "Failed to fetch metadata");
        setMetadata(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [ownerAddress]);

  return { metadata, isLoading, error };
}

/**
 * Fetch voice ID for a specific owner
 */
export async function getVoiceId(ownerAddress: string): Promise<string | null> {
  try {
    const result = await aptosClient.view({
      payload: {
        function: `${CONTRACTS.VOICE_IDENTITY.address}::${CONTRACTS.VOICE_IDENTITY.module}::get_voice_id`,
        typeArguments: [],
        functionArguments: [ownerAddress],
      },
    });

    return result[0] as string;
  } catch (error) {
    console.error("Error fetching voice ID:", error);
    return null;
  }
}
