# VoiceVault 🎙️

> AI Voice Training & NFT Marketplace on Aptos Blockchain

VoiceVault is a decentralized platform for creating, owning, and monetizing AI voice models. Upload your voice, train custom AI models, and trade voice NFTs on the Aptos blockchain.

## 🛠️ Problem Statement

AI-voice cloning tools (like ElevenLabs) allow people to create synthetic voices, but control, ownership, and monetization of those voices remain centralized and opaque. Literal voice identity can be copied, reused, or misused without transparent permission or proper compensation.

Creators/users who train/own a unique voice currently have no easy way to:
- Register their voice as a unique identity
- Prove ownership
- Monetize usage in a transparent, trust-less way

Consumers who want to license a voice have no transparent, decentralized marketplace: rights, payments, and usage-tracking are opaque.

## ✨ Features

### 🎤 Voice Studio
- **Text-to-Speech (TTS)**: Convert text to natural-sounding speech using AI voices
- **Voice Cloning**: Upload audio samples to create custom AI voice models
- **Voice Marketplace**: Browse and purchase AI voices from other creators
- **Real-time Preview**: Test voices before purchasing

### ⛓️ Blockchain Integration
- **Aptos Wallet Support**: Connect with Petra, Martian, Pontem, and more
- **Voice NFTs**: Mint and own your voice models as NFTs
- **Smart Payments**: Pay creators directly with APT tokens
- **Transparent Earnings**: Track usage and earnings on-chain

### 📊 Creator Dashboard
- **Usage Analytics**: Track how many times your voice is used
- **Earnings Overview**: Monitor your revenue in real-time
- **Voice Management**: Manage pricing and availability
- **Performance Metrics**: View response times and quality scores

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 
- Aptos wallet

### Frontend Setup

```bash
# Clone the repository
git clone <repository-url>
cd VoiceVault

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app.

Backend will be available at `http://localhost:3001`

## 📁 Project Structure

```
VoiceVault/
├── src/
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── landing/        # Landing page sections
│   │   ├── layout/         # Layout components (Navbar, Footer)
│   │   ├── marketplace/    # Marketplace components
│   │   ├── ui/             # shadcn/ui components
│   │   └── wallet/         # Wallet components
│   ├── contexts/           # React contexts
│   │   └── WalletContext.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── use-wallet.ts
│   │   └── use-toast.ts
│   ├── lib/                # Utilities
│   │   ├── aptos.ts        # Aptos SDK utilities
│   │   ├── api.ts          # API client
│   │   └── utils.ts        # General utilities
│   ├── pages/              # Page components
│   │   ├── Index.tsx       # Landing page
│   │   ├── Marketplace.tsx # Voice marketplace
│   │   ├── Dashboard.tsx   # Creator dashboard
│   │   └── Upload.tsx      # Voice studio (TTS & Cloning)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
└── package.json
```

## 🔧 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context + Hooks
- **Routing**: React Router v6
- **Notifications**: Sonner
- **Charts**: Recharts

### Blockchain
- **Network**: Aptos
- **Wallet Adapter**: @aptos-labs/wallet-adapter-react
- **SDK**: @aptos-labs/ts-sdk
- **Supported Wallets**: Petra

### Backend
- **Framework**: Node.js
- **TTS Engine**: Open AI
- **Voice Cloning**: Custom models
- **Storage**: Local filesystem (can be upgraded to IPFS)

## 🎨 Key Pages

### Landing Page
- Hero section with animated waves
- Feature highlights
- How it works explanation
- Call-to-action for creators

### Voice Studio (Upload)
Two main features accessible via tabs:

1. **Text-to-Speech**
   - Select speaker voice
   - Enter text
   - Generate audio
   - Play and download

2. **Voice Cloning**
   - Upload audio sample
   - Automatic processing
   - Receive voice ID
   - Use in TTS

### Marketplace
- Browse available voices
- Filter by category
- Preview voices
- Purchase with APT

### Dashboard
- Earnings overview
- Usage statistics
- Voice model management
- Transaction history

## 🔐 Environment Variables

Create a `.env` file:

```env
# API Configuration
VITE_API_URL=http://localhost:8000

# Aptos Network
VITE_APTOS_NETWORK=testnet
```

## 🌐 API Endpoints

### POST /tts
Generate speech from text
```
Request: FormData { text: string, speaker: string }
Response: Audio file (MP3)
```

### POST /clone
Clone a voice from audio sample
```
Request: FormData { file: File }
Response: { message: string, id: string }
```

## 🎯 Roadmap

- [x] Landing page design
- [x] Aptos wallet integration
- [x] TTS generation
- [x] Voice cloning upload
- [x] Basic marketplace UI
- [x] Creator dashboard
- [ ] Smart contract development
- [ ] NFT minting functionality
- [ ] Payment integration
- [ ] Voice preview system
- [ ] IPFS storage integration
- [ ] Multi-language support
- [ ] Mobile app (React Native)


**Built with ❤️ by Vidip, Sahil, Rajarshi and Gautam for the Aptos ecosystem**
