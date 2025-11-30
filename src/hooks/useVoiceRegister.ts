import { useState } from "react";
import { useAptosWallet } from "./useAptosWallet";
import { CONTRACTS, aptToOctas } from "@/lib/contracts";
import { toast } from "sonner";
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export interface VoiceRegistrationData {
  name: string;
  modelUri: string;
  rights: string;
  pricePerUse: number; // in APT
}

export function useVoiceRegister() {
  const { signAndSubmitTransaction, isConnected, address } = useAptosWallet();
  const [isRegistering, setIsRegistering] = useState(false);

  const registerVoice = async (data: VoiceRegistrationData) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return null;
    }

    setIsRegistering(true);

    try {
      // Convert price to Octas
      const priceInOctas = aptToOctas(data.pricePerUse);

      // Build transaction payload
      const transaction: InputTransactionData = {
        data: {
          function: `${CONTRACTS.VOICE_IDENTITY.address}::${CONTRACTS.VOICE_IDENTITY.module}::register_voice`,
          typeArguments: [],
          functionArguments: [
            data.name,
            data.modelUri,
            data.rights,
            priceInOctas.toString(),
          ],
        },
      };

      // Sign and submit transaction
      const response = await signAndSubmitTransaction(transaction);

      // Wait for transaction confirmation
      toast.info("Waiting for transaction confirmation...");
      
      // The response contains the transaction hash
      const txHash = response.hash;

      toast.success("Voice registered successfully!", {
        description: `Transaction: ${txHash.slice(0, 8)}...${txHash.slice(-6)}`,
      });

      return {
        success: true,
        transactionHash: txHash,
      };
    } catch (error: any) {
      console.error("Voice registration error:", error);
      toast.error("Registration failed", {
        description: error.message || "Unknown error occurred",
      });
      return null;
    } finally {
      setIsRegistering(false);
    }
  };

  return {
    registerVoice,
    isRegistering,
  };
}
