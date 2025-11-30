# VoiceVault 🎙️

> AI Voice Training & NFT Marketplace on Aptos Blockchain

VoiceVault is a decentralized platform for creating, owning, and monetizing AI voice models. Upload your voice, train custom AI models, and trade voice NFTs on the Aptos blockchain.

## 🚀 Quick Start

**New to VoiceVault?** Start here:
1. 📋 [STARTUP_CHECKLIST.md](./docs/STARTUP_CHECKLIST.md) - Get up and running in 5 minutes
2. 🧪 [MOCK_TESTING_GUIDE.md](./docs/MOCK_TESTING_GUIDE.md) - **Test with mock voices (recommended first!)**
3. 🧪 [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) - Full testing procedures
4. 📚 [INTEGRATION_GUIDE.md](./docs/INTEGRATION_GUIDE.md) - Understand the architecture
5. ⚡ [QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) - Common operations reference

## 📊 Project Status

✅ **Smart Contracts**: Deployed on Aptos Testnet  
✅ **Frontend**: Fully integrated with blockchain  
✅ **Wallet**: Aptos wallet adapter configured  
✅ **AI/ML**: OpenAI TTS + Gradio voice cloning  
⚠️ **Production**: Needs IPFS integration & event indexing

See [CURRENT_STATUS.md](./docs/CURRENT_STATUS.md) for detailed status and roadmap.

## 🧪 Testing with Mock Data

The marketplace includes **6 mock voices** for testing the payment flow:
- ✅ No need to register voices first
- ✅ Test real blockchain transactions
- ✅ Verify payment splits work correctly
- ✅ Practice the full user journey

**Just connect your wallet and go to the Marketplace!** Mock voices appear automatically.

See [MOCK_TESTING_GUIDE.md](./docs/MOCK_TESTING_GUIDE.md) for details.

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
- npm or bun
- Aptos wallet (Petra recommended)
- Python 3.8+ (for backend)

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

### Backend Setup

```bash
# Install Python dependencies
pip install fastapi uvicorn python-multipart openai TTS

# Run the backend server
python main.py
```

Backend will be available at `http://localhost:8000`

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
├── APTOS_WALLET_INTEGRATION.md
├── BACKEND_INTEGRATION.md
├── IMPLEMENTATION_SUMMARY.md
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
- **Supported Wallets**: Petra, Martian, Pontem

### Backend
- **Framework**: FastAPI (Python)
- **TTS Engine**: Coqui TTS
- **Voice Cloning**: Custom models
- **Storage**: Local filesystem (can be upgraded to IPFS)

## 📖 Documentation

- **[Aptos Wallet Integration](./APTOS_WALLET_INTEGRATION.md)** - Complete guide to wallet integration
- **[Backend Integration](./BACKEND_INTEGRATION.md)** - API documentation and setup
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical implementation details

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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Aptos Labs** for the amazing blockchain infrastructure
- **shadcn** for the beautiful UI components
- **Coqui TTS** for the text-to-speech engine
- **OpenAI** for inspiration

## 📞 Support

For support, email support@voicevault.io or join our Discord server.

---

**Built with ❤️ for the Aptos ecosystem**
