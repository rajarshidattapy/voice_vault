// Contract addresses and module names for deployed Move contracts
export const CONTRACTS = {
  PAYMENT: {
    address: "0xed25fa42116e7247381a3168b0de39af2eb7bedf4db94364c41fc7699b1c1a71",
    module: "payment_contract",
  },
  VOICE_IDENTITY: {
    address: "0x0bf154dc582a43ec543711fba16c44e02cec2f660868f1fa164f1816fa7f1952",
    module: "voice_identity",
  },
  PLATFORM_ADDRESS: "0xed25fa42116e7247381a3168b0de39af2eb7bedf4db94364c41fc7699b1c1a71", // Platform fee recipient
} as const;

// Fee structure (matching Move contract)
export const FEE_STRUCTURE = {
  PLATFORM_FEE_BPS: 250, // 2.5%
  ROYALTY_BPS: 1000, // 10%
} as const;

// Helper to calculate payment breakdown
export function calculatePaymentBreakdown(totalAmount: number) {
  const platformFee = Math.floor((totalAmount * FEE_STRUCTURE.PLATFORM_FEE_BPS) / 10_000);
  const remainingAfterPlatform = totalAmount - platformFee;
  const royaltyAmount = Math.floor((remainingAfterPlatform * FEE_STRUCTURE.ROYALTY_BPS) / 10_000);
  const creatorAmount = remainingAfterPlatform - royaltyAmount;

  return {
    totalAmount,
    platformFee,
    royaltyAmount,
    creatorAmount,
  };
}

// Convert APT to Octas (1 APT = 100,000,000 Octas)
export function aptToOctas(apt: number): number {
  return Math.floor(apt * 100_000_000);
}

// Convert Octas to APT
export function octasToApt(octas: number): number {
  return octas / 100_000_000;
}
