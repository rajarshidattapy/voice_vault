import { useState } from "react";
import { useVoiceRegister } from "@/hooks/useVoiceRegister";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

export function VoiceRegistrationForm() {
  const { registerVoice, isRegistering } = useVoiceRegister();
  const [formData, setFormData] = useState({
    name: "",
    modelUri: "",
    rights: "commercial",
    pricePerUse: "0.1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await registerVoice({
      name: formData.name,
      modelUri: formData.modelUri,
      rights: formData.rights,
      pricePerUse: parseFloat(formData.pricePerUse),
    });

    if (result?.success) {
      // Reset form on success
      setFormData({
        name: "",
        modelUri: "",
        rights: "commercial",
        pricePerUse: "0.1",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Your Voice</CardTitle>
        <CardDescription>
          Register your voice model on-chain to start earning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Voice Name</Label>
            <Input
              id="name"
              placeholder="e.g., Alex Sterling"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelUri">Model URI</Label>
            <Input
              id="modelUri"
              placeholder="e.g., ipfs://... or voice-model-id"
              value={formData.modelUri}
              onChange={(e) => setFormData({ ...formData, modelUri: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              This can be an IPFS hash, model ID, or any identifier for your voice
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rights">Usage Rights</Label>
            <Input
              id="rights"
              placeholder="e.g., commercial, personal, limited"
              value={formData.rights}
              onChange={(e) => setFormData({ ...formData, rights: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price Per Use (APT)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.1"
              value={formData.pricePerUse}
              onChange={(e) => setFormData({ ...formData, pricePerUse: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={isRegistering} className="w-full">
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Register Voice
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
