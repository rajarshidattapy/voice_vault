import type { ReactNode } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { WagmiConfig } from "wagmi";
import { mainnet, sepolia } from "viem/chains";

interface RainbowWalletProviderProps {
  children: ReactNode;
}

const config = getDefaultConfig({
  appName: "VoiceVault",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
  chains: [mainnet, sepolia],
  ssr: false,
});

export function RainbowWalletProvider({ children }: RainbowWalletProviderProps) {
  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}


