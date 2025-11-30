import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { photonService, PhotonUser } from '@/services/photon';
import { toast } from 'sonner';

interface RewardsContextType {
    patBalance: number;
    discountPercentage: number;
    photonUserId: string | null;
    isAuthenticated: boolean;
    refreshBalance: () => Promise<void>;
    logEvent: (eventType: string, metadata?: any) => Promise<void>;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

// Discount logic: 0-100 PAT = 5%, 100-500 = 10%, 500+ = 20%
const calculateDiscount = (balance: number): number => {
    if (balance >= 500) return 20;
    if (balance >= 100) return 10;
    if (balance > 0) return 5;
    return 0;
};

export const RewardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { connected, account } = useWallet();
    const [patBalance, setPatBalance] = useState<number>(0);
    const [photonUserId, setPhotonUserId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Load persisted state on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('photon_access_token');
        const storedUser = localStorage.getItem('photon_user_id');
        const storedBalance = localStorage.getItem('photon_pat_balance');

        if (storedToken && storedUser) {
            photonService.setAccessToken(storedToken);
            setPhotonUserId(storedUser);
            setPatBalance(storedBalance ? parseInt(storedBalance) : 0);
            setIsAuthenticated(true);
        }
    }, []);

    // Handle Wallet Connection -> Photon Registration
    useEffect(() => {
        const initPhoton = async () => {
            if (connected && account?.address && !isAuthenticated) {
                try {
                    // Check if we already have a session for this address
                    const addressStr = account.address.toString();
                    const storedAddress = localStorage.getItem('photon_wallet_address');

                    if (storedAddress === addressStr && photonUserId) {
                        // Already logged in, just refresh
                        return;
                    }

                    toast.loading("Connecting to Rewards Network...", { id: "photon-auth" });

                    const { user, accessToken } = await photonService.register(addressStr);

                    // Update State
                    setPhotonUserId(user.id);
                    setPatBalance(user.patBalance);
                    setIsAuthenticated(true);
                    photonService.setAccessToken(accessToken);

                    // Persist
                    localStorage.setItem('photon_access_token', accessToken);
                    localStorage.setItem('photon_user_id', user.id);
                    localStorage.setItem('photon_wallet_address', addressStr);
                    localStorage.setItem('photon_pat_balance', user.patBalance.toString());

                    toast.success("Rewards Active!", {
                        id: "photon-auth",
                        description: `Welcome! You have ${user.patBalance} PAT.`
                    });

                } catch (error) {
                    console.error("Photon auth failed", error);
                    toast.error("Failed to connect to rewards", { id: "photon-auth" });
                }
            } else if (!connected) {
                // Cleanup on disconnect
                setIsAuthenticated(false);
                setPhotonUserId(null);
                setPatBalance(0);
                localStorage.removeItem('photon_access_token');
                localStorage.removeItem('photon_user_id');
                localStorage.removeItem('photon_pat_balance');
                localStorage.removeItem('photon_wallet_address');
            }
        };

        initPhoton();
    }, [connected, account, isAuthenticated, photonUserId]);

    const refreshBalance = async () => {
        if (!isAuthenticated) return;
        try {
            // In a real app, we fetch from API. 
            // For mock, we just read local state or assume the service returns something useful.
            // Since our service mock is stateless, we'll just keep the current state 
            // or maybe increment it slightly to show "activity" if we wanted.
            // For now, we trust the local state updates from logEvent.
        } catch (error) {
            console.error("Failed to refresh balance", error);
        }
    };

    const logEvent = async (eventType: string, metadata?: any) => {
        if (!isAuthenticated) return;
        try {
            const { success, rewardEarned } = await photonService.logEvent(eventType, metadata);
            if (success && rewardEarned > 0) {
                const newBalance = patBalance + rewardEarned;
                setPatBalance(newBalance);
                localStorage.setItem('photon_pat_balance', newBalance.toString());
            }
        } catch (error) {
            console.error("Failed to log event", error);
        }
    };

    const discountPercentage = calculateDiscount(patBalance);

    return (
        <RewardsContext.Provider value={{
            patBalance,
            discountPercentage,
            photonUserId,
            isAuthenticated,
            refreshBalance,
            logEvent
        }}>
            {children}
        </RewardsContext.Provider>
    );
};

export const useRewards = () => {
    const context = useContext(RewardsContext);
    if (context === undefined) {
        throw new Error('useRewards must be used within a RewardsProvider');
    }
    return context;
};
