import { useAccount } from "wagmi";

/**
 * Thin wrapper to keep the existing `useWallet` API shape
 * while sourcing connection state from RainbowKit / wagmi.
 */
export function useWallet() {
  const { address, isConnected } = useAccount();

  return {
    connected: isConnected,
    account: address ? { address } : undefined,
  };
}
