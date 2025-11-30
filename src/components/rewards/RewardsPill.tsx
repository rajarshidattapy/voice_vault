import { useRewards } from "@/contexts/RewardsContext";
import { Coins, Percent } from "lucide-react";

export const RewardsPill = () => {
    const { patBalance, discountPercentage, isAuthenticated } = useRewards();

    if (!isAuthenticated) return null;

    return (
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-yellow-400">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-medium">{patBalance} PAT</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 text-green-400">
                <Percent className="w-4 h-4" />
                <span className="text-sm font-medium">{discountPercentage}% OFF</span>
            </div>
        </div>
    );
};
