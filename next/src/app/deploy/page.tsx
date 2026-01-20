"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, Code, ExternalLink, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

const contractAddresses = {
  voiceRegistry: "0x1234567890abcdef1234567890abcdef12345678",
  paymentProcessor: "0xabcdef1234567890abcdef1234567890abcdef12",
};

const sampleCode = `// Sample integration code
import { VoiceVaultSDK } from '@voicevault/sdk';

const sdk = new VoiceVaultSDK({
  network: 'testnet',
  contractAddress: '${contractAddresses.voiceRegistry}'
});

// Register a voice
await sdk.registerVoice({
  name: 'My Voice',
  modelUri: 'shelby://...',
  pricePerUse: 0.05
});

// Generate TTS
const audio = await sdk.generateTTS({
  voiceId: 'voice-id',
  text: 'Hello world!'
});`;

function DeployPage() {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus('deploying');
    
    try {
      // Simulate deployment
      await new Promise(resolve => setTimeout(resolve, 3000));
      setDeploymentStatus('success');
      toast.success("Smart contracts deployed successfully!");
    } catch (error) {
      setDeploymentStatus('error');
      toast.error("Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-2xl mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Deploy <span className="gradient-text">Smart Contracts</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Deploy VoiceVault smart contracts to Aptos blockchain and integrate with your applications.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Deployment Panel */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Contract Deployment
                </CardTitle>
                <CardDescription>
                  Deploy VoiceVault contracts to Aptos testnet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="network">Network</Label>
                  <Input
                    id="network"
                    value="Aptos Testnet"
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="gas-budget">Gas Budget (APT)</Label>
                  <Input
                    id="gas-budget"
                    type="number"
                    defaultValue="0.1"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="deployment-config">Deployment Configuration</Label>
                  <Textarea
                    id="deployment-config"
                    rows={4}
                    defaultValue={JSON.stringify({
                      platformFee: 250, // 2.5%
                      royaltyFee: 1000, // 10%
                      maxVoicesPerAccount: 100
                    }, null, 2)}
                  />
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="w-full"
                  variant={deploymentStatus === 'success' ? 'default' : 'default'}
                >
                  {isDeploying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deploying...
                    </>
                  ) : deploymentStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Deployed Successfully
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy Contracts
                    </>
                  )}
                </Button>

                {deploymentStatus === 'success' && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                      Smart contracts deployed successfully! Check the contract addresses below.
                    </AlertDescription>
                  </Alert>
                )}

                {deploymentStatus === 'error' && (
                  <Alert className="border-red-500/50 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-500">
                      Deployment failed. Please check your wallet connection and try again.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Contract Information */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Contract Addresses
                </CardTitle>
                <CardDescription>
                  Deployed contract addresses on Aptos testnet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Voice Registry Contract</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={contractAddresses.voiceRegistry}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(contractAddresses.voiceRegistry)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Payment Processor Contract</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={contractAddresses.paymentProcessor}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(contractAddresses.paymentProcessor)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Aptos Explorer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Guide */}
          <Card className="glass-card mt-8">
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>
                Sample code to integrate VoiceVault in your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{sampleCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(sampleCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="font-semibold">Next Steps:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Install the VoiceVault SDK: <code className="bg-muted px-1 rounded">npm install @voicevault/sdk</code></li>
                  <li>• Configure your application with the contract addresses above</li>
                  <li>• Test voice registration and TTS generation</li>
                  <li>• Deploy to mainnet when ready for production</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Deploy() {
  return (
    <ProtectedRoute>
      <DeployPage />
    </ProtectedRoute>
  );
}