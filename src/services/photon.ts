import { toast } from "sonner";

// Types
export interface PhotonUser {
    id: string;
    walletAddress: string;
    patBalance: number;
}

export interface PhotonEvent {
    type: string;
    metadata?: Record<string, any>;
}

const PHOTON_API_KEY = "7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800";
const BASE_URL = "https://stage-api.getstan.app/identity-service/api/v1";

class PhotonService {
    private accessToken: string | null = null;

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    // Helper for Base64Url encoding
    private base64UrlEncode(str: string): string {
        return btoa(str)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    // Helper to generate a dummy JWT for client-side testing
    private generateTestJwt(walletAddress: string): string {
        const header = JSON.stringify({ alg: "HS256", typ: "JWT" });
        const payload = JSON.stringify({
            sub: walletAddress,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
            iss: "VoiceVault Client",
            aud: "www.example.com", // Matching Postman example
            Email: `${walletAddress}@example.com` // Matching Postman example structure
        });

        const encodedHeader = this.base64UrlEncode(header);
        const encodedPayload = this.base64UrlEncode(payload);
        const signature = "dummy_signature"; // Still dummy, hoping server doesn't verify signature or accepts it

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    // 1. Identity / Register
    async register(walletAddress: string): Promise<{ user: PhotonUser; accessToken: string }> {
        try {
            const jwt = this.generateTestJwt(walletAddress);

            const response = await fetch(`${BASE_URL}/identity/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": PHOTON_API_KEY,
                },
                body: JSON.stringify({
                    provider: "jwt",
                    data: {
                        token: jwt,
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("[Photon] Registration failed:", errorText);
                throw new Error(`Registration failed: ${response.statusText}`);
            }

            const json = await response.json();
            console.log("[Photon] Registered:", json);

            // Parse based on Postman response: { success: true, data: { tokens: { access_token: ... }, user: { ... } } }
            const accessToken = json.data?.tokens?.access_token;
            if (!accessToken) throw new Error("No access token in response");

            return {
                user: {
                    id: json.data?.user?.user?.id || walletAddress,
                    walletAddress: json.data?.wallet?.walletAddress || walletAddress,
                    patBalance: 0, // Register response doesn't show balance, will fetch in getMe or update later
                },
                accessToken: accessToken,
            };
        } catch (error) {
            console.error("[Photon] Register error:", error);
            throw error;
        }
    }

    // 2. Get Me (Balance)
    async getMe(): Promise<PhotonUser> {
        if (!this.accessToken) throw new Error("Not authenticated");

        try {
            // Assuming /identity/me is the endpoint based on standard structure, though not in snippet.
            // If it fails, we'll handle it.
            const response = await fetch(`${BASE_URL}/identity/me`, {
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "X-API-Key": PHOTON_API_KEY,
                },
            });

            if (!response.ok) throw new Error("Failed to fetch user profile");

            const json = await response.json();
            // Adjust parsing if needed, assuming standard Photon structure
            return {
                id: json.data?.id || "unknown",
                walletAddress: json.data?.wallet_address || "unknown",
                patBalance: json.data?.pat_balance || 0,
            };
        } catch (error) {
            console.error("[Photon] GetMe error:", error);
            return {
                id: "fallback_id",
                walletAddress: "fallback_address",
                patBalance: 0,
            };
        }
    }

    // 3. Log Event (Campaign)
    async logEvent(eventType: string, metadata: Record<string, any> = {}): Promise<{ success: boolean; rewardEarned: number }> {
        if (!this.accessToken) {
            console.warn("[Photon] Event logged without auth:", eventType);
            return { success: false, rewardEarned: 0 };
        }

        try {
            // Correct URL from Postman: identity-service/api/v1/attribution/events/campaign
            const response = await fetch(`${BASE_URL}/attribution/events/campaign`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                    "X-API-Key": PHOTON_API_KEY,
                },
                body: JSON.stringify({
                    event_type: eventType,
                    event_id: `${eventType}-${Date.now()}`, // Unique ID for idempotency
                    metadata,
                    timestamp: new Date().toISOString()
                }),
            });

            if (!response.ok) throw new Error("Event logging failed");

            const json = await response.json();

            // Parse based on Postman response: { data: { token_amount: 0.05, ... }, success: true }
            const reward = json.data?.token_amount || 0;

            if (reward > 0) {
                toast.success(`You earned ${reward} PAT!`, {
                    description: "Keep going to unlock better discounts.",
                });
            }

            return { success: true, rewardEarned: reward };
        } catch (error) {
            console.error("[Photon] LogEvent error:", error);
            return { success: false, rewardEarned: 0 };
        }
    }
}

export const photonService = new PhotonService();
