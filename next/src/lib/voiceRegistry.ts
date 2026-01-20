// Voice registry utilities for localStorage management

export function getVoiceAddresses(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('voiceRegistry');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addVoiceAddress(address: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const addresses = getVoiceAddresses();
    if (!addresses.includes(address)) {
      addresses.push(address);
      localStorage.setItem('voiceRegistry', JSON.stringify(addresses));
    }
  } catch (error) {
    console.error('Failed to add voice address:', error);
  }
}

export function removeVoiceAddress(address: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const addresses = getVoiceAddresses();
    const filtered = addresses.filter(addr => addr !== address);
    localStorage.setItem('voiceRegistry', JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove voice address:', error);
  }
}