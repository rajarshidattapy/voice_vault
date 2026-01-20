"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Link2 } from "lucide-react";

interface VoiceRegistrationFormProps {
  initialName?: string;
  initialModelUri?: string;
}

export function VoiceRegistrationForm({ 
  initialName = "", 
  initialModelUri = "" 
}: VoiceRegistrationFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [modelUri, setModelUri] = useState(initialModelUri);
  const [pricePerUse, setPricePerUse] = useState("0.05");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!name || !modelUri || !pricePerUse) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsRegistering(true);
    try {
      // This would call the Aptos contract to register the voice
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Voice registered on blockchain successfully!");
      
      // Reset form
      setName("");
      setDescription("");
      setModelUri("");
      setPricePerUse("0.05");
    } catch (error) {
      toast.error("Failed to register voice on blockchain");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Register Voice on Blockchain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="reg-name">Voice Name *</Label>
          <Input
            id="reg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Professional Voice"
          />
        </div>

        <div>
          <Label htmlFor="reg-description">Description</Label>
          <Textarea
            id="reg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A professional narrator voice for audiobooks and presentations..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="reg-uri">Model URI *</Label>
          <Input
            id="reg-uri"
            value={modelUri}
            onChange={(e) => setModelUri(e.target.value)}
            placeholder="shelby://0x.../voices/..."
          />
        </div>

        <div>
          <Label htmlFor="reg-price">Price per Use (APT) *</Label>
          <Input
            id="reg-price"
            type="number"
            step="0.01"
            min="0"
            value={pricePerUse}
            onChange={(e) => setPricePerUse(e.target.value)}
            placeholder="0.05"
          />
        </div>

        <Button
          onClick={handleRegister}
          disabled={isRegistering || !name || !modelUri || !pricePerUse}
          className="w-full"
        >
          {isRegistering ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Registering on Blockchain...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-2" />
              Register Voice
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          * Registration requires wallet connection and APT for gas fees
        </p>
      </CardContent>
    </Card>
  );
}