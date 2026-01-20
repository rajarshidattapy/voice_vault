// Purchased voices management for localStorage

export interface PurchasedVoice {
  voiceId: string;
  name: string;
  modelUri: string;
  owner: string;
  price: number;
  purchasedAt: number;
  txHash: string;
}

export function getPurchasedVoices(): PurchasedVoice[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('purchasedVoices');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addPurchasedVoice(voice: PurchasedVoice): void {
  if (typeof window === 'undefined') return;
  
  try {
    const voices = getPurchasedVoices();
    const existing = voices.find(v => v.voiceId === voice.voiceId);
    
    if (!existing) {
      voices.push(voice);
      localStorage.setItem('purchasedVoices', JSON.stringify(voices));
    }
  } catch (error) {
    console.error('Failed to add purchased voice:', error);
  }
}

export function isPurchased(voiceId: string): boolean {
  const voices = getPurchasedVoices();
  return voices.some(v => v.voiceId === voiceId);
}