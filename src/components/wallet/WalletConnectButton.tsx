import { useWallet } from '@/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';

export const WalletConnectButton = () => {
  const { connected, connect } = useWallet();

  const handleConnect = async () => {
    try {
      await connect('Petra');
      toast.success('Wallet Connected', {
        description: 'Successfully connected to Petra wallet',
      });
    } catch (error) {
      console.error('Connection error:', error);
      if (error instanceof Error) {
        toast.error('Connection Failed', {
          description: error.message,
        });
      }
    }
  };

  if (connected) return null;

  return (
    <Button
      variant="default"
      size="default"
      onClick={handleConnect}
      className="flex items-center gap-2"
    >
      <Wallet className="h-4 w-4" />
      Connect Petra
    </Button>
  );
};
