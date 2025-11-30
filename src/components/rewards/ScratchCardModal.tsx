import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRewards } from "@/contexts/RewardsContext";
import { Ticket, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ScratchCardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ScratchCardModal = ({ open, onOpenChange }: ScratchCardModalProps) => {
    const { patBalance, discountPercentage, logEvent } = useRewards();
    const [isRevealed, setIsRevealed] = useState(false);
    const [isRedeeming, setIsRedeeming] = useState(false);

    const originalPrice = 100; // Example base price for a "pack" or "subscription"
    const discountedPrice = originalPrice * (1 - discountPercentage / 100);

    const handleRedeem = async () => {
        setIsRedeeming(true);
        try {
            // Simulate transaction delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Log the "redemption" event (which might earn more PAT or just be a spend)
            // For this demo, let's say redeeming a scratch card is a "usage" event that might grant a bonus
            await logEvent("SCRATCH_CARD_REDEEMED");

            setIsRevealed(true);
            toast.success("Scratch Card Redeemed!", {
                description: `You saved ${discountPercentage}% using your PAT rewards.`
            });
        } catch (error) {
            toast.error("Redemption failed");
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after a short delay so it's fresh next time
        setTimeout(() => setIsRevealed(false), 300);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-black/90 border-white/10 backdrop-blur-xl text-white">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
                        <Ticket className="w-6 h-6 text-yellow-400" />
                        Daily Scratch Card
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-400">
                        Use your PAT balance to unlock exclusive discounts.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl text-center">
                            <div className="text-sm text-gray-400">Your Balance</div>
                            <div className="text-2xl font-bold text-yellow-400">{patBalance} PAT</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl text-center">
                            <div className="text-sm text-gray-400">Current Discount</div>
                            <div className="text-2xl font-bold text-green-400">{discountPercentage}%</div>
                        </div>
                    </div>

                    {!isRevealed ? (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-6 rounded-2xl border border-white/10 text-center space-y-2">
                                <div className="text-gray-300">Price for Premium Pack</div>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-xl text-gray-500 line-through">${originalPrice}</span>
                                    <span className="text-3xl font-bold text-white">${discountedPrice.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-blue-300 pt-2">
                                    Earn more PAT to increase your discount!
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black border-none"
                                onClick={handleRedeem}
                                disabled={isRedeeming}
                            >
                                {isRedeeming ? (
                                    <Sparkles className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Sparkles className="w-5 h-5 mr-2" />
                                )}
                                {isRedeeming ? "Redeeming..." : "Redeem Scratch Card Now"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-green-500/20 p-8 rounded-2xl border border-green-500/30 text-center space-y-4">
                                <div className="flex justify-center">
                                    <div className="p-3 bg-green-500/20 rounded-full">
                                        <CheckCircle2 className="w-12 h-12 text-green-400" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Success!</h3>
                                    <p className="text-gray-300 mt-1">
                                        You've successfully redeemed your scratch card with a {discountPercentage}% discount.
                                    </p>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full border-white/10 hover:bg-white/5"
                                onClick={handleClose}
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
