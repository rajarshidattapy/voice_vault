import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { CTASection } from "@/components/landing/CTASection";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VoiceVault - Own Your Voice, Earn Forever | AI Voice Cloning Platform",
  description: "Create custom AI voice models, mint on-chain ownership on Aptos blockchain, and earn every time someone uses your voice for TTS generation.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}