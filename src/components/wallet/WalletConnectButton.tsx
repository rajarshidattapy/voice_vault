import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";

export const WalletConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <Button
          variant="default"
          onClick={openConnectModal}
          className="w-full"
        >
          Connect Wallet
        </Button>
      )}
    </ConnectButton.Custom>
  );
};
