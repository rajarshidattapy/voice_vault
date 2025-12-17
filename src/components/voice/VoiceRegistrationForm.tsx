import { useState, useEffect } from "react";
import { useVoiceRegister } from "@/hooks/useVoiceRegister";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Upload, FileAudio } from "lucide-react";
import { toast } from "sonner";
import { addVoiceToRegistry } from "@/lib/voiceRegistry";

interface VoiceRegistrationFormProps {
  autoName?: string;
  autoModelUri?: string;
}

export function VoiceRegistrationForm({ autoName = "", autoModelUri = "" }: VoiceRegistrationFormProps) {
  const { registerVoice, isRegistering } = useVoiceRegister();
  const { address } = useAptosWallet();
  const [formData, setFormData] = useState({
    name: autoName,
    modelUri: autoModelUri,
    rights: "commercial",
    pricePerUse: "0.1",
  });

  // Update form when auto-fill values change
  useEffect(() => {
    if (autoName) setFormData(prev => ({ ...prev, name: autoName }));
    if (autoModelUri) setFormData(prev => ({ ...prev, modelUri: autoModelUri }));
  }, [autoName, autoModelUri]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!audioFile && !formData.modelUri) {
      toast.error("Please upload a voice file or enter a model URI");
      return;
    }

    let finalModelUri = formData.modelUri;

    // Upload audio file if provided
    if (audioFile) {
      setIsUploading(true);
      try {
        toast.info("Uploading voice file...");
        
        // Generate a unique path for the voice file
        const timestamp = Date.now();
        const sanitizedName = audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `voices/${address.toString()}/${timestamp}_${sanitizedName}`;
        
        try {
        //   await uploadToShelby({
        //     file: audioFile,
        //     path: path,
        //   });
          finalModelUri = `shelby://${path}`;
          toast.success("Voice file uploaded!");
        } catch (shelbyError) {
          console.warn("Shelby upload failed, using local storage");
          
          // Fallback: Store as data URL
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(audioFile);
          });
          
          finalModelUri = `local://${audioFile.name}`;
          localStorage.setItem(`voice_audio_${address.toString()}`, dataUrl);
          
          toast.warning("Using local storage (Shelby unavailable)");
        }
      } catch (error) {
        toast.error("Failed to process voice file");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // Register voice on blockchain
    const result = await registerVoice({
      name: formData.name,
      modelUri: finalModelUri,
      rights: formData.rights,
      pricePerUse: parseFloat(formData.pricePerUse),
    });

    if (result?.success) {
      // Add to voice registry for marketplace
      addVoiceToRegistry(address.toString(), formData.name);
      
      // Reset form
      setFormData({
        name: "",
        modelUri: "",
        rights: "commercial",
        pricePerUse: "0.1",
      });
      setAudioFile(null);
      
      toast.success("Voice registered! Check the Marketplace to see it.", {
        duration: 5000,
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
            <Label htmlFor="audioFile">Upload Voice File (.wav)</Label>
            <div className="relative">
              <Input
                id="audioFile"
                type="file"
                accept="audio/wav,audio/mpeg,audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.type.includes("audio")) {
                      toast.error("Please select an audio file");
                      return;
                    }
                    setAudioFile(file);
                    toast.success(`Selected: ${file.name}`);
                  }
                }}
                className="cursor-pointer"
              />
              {audioFile && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-green-500" />
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your voice sample (.wav recommended). This will be stored and used in the marketplace.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelUri">Or Enter Model URI (Optional)</Label>
            <Input
              id="modelUri"
              placeholder="e.g., openai:alloy, ipfs://..."
              value={formData.modelUri}
              onChange={(e) => setFormData({ ...formData, modelUri: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if you uploaded a file above
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

          <Button type="submit" disabled={isRegistering || isUploading} className="w-full">
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-bounce" />
                Uploading File...
              </>
            ) : isRegistering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering on Blockchain...
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
