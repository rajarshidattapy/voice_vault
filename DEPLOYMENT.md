# 🚀 Deployment Guide for VoiceVault

This guide covers deploying both the frontend (React/Vite) and backend (Node.js/Express) components of VoiceVault.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository set up
- Accounts for hosting services (Vercel, Railway, etc.)
- API keys:
  - `ELEVENLABS_API_KEY` (for ElevenLabs TTS)
  - `VITE_WALLETCONNECT_PROJECT_ID` (for RainbowKit wallet connection)

## 🔐 Environment Variables

### Frontend (.env)
```env
# Backend API URL (update after deploying backend)
VITE_PROXY_URL=https://your-backend-url.railway.app
# or
VITE_API_URL=https://your-backend-url.railway.app

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: OpenAI API Key (if using OpenAI TTS)
VITE_OPENAI_API_KEY=your_openai_key_here
```

### Backend (.env)
```env
# ElevenLabs API Key
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Server Port (usually set by hosting provider)
PORT=3000
```

---

## 🌐 Option 1: Deploy Frontend to Vercel (Recommended)

Vercel is perfect for React/Vite apps with automatic deployments.

### Steps:

1. **Install Vercel CLI** (optional, can use web UI):
   ```bash
   npm i -g vercel
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   Or connect your GitHub repo to Vercel dashboard.

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all `VITE_*` variables from above

5. **Update Build Settings** (if needed):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

---

## 🖥️ Option 2: Deploy Backend to Railway

Railway is great for Node.js backends with automatic deployments.

### Steps:

1. **Create Railway Account**: https://railway.app

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or upload manually)

3. **Configure Service**:
   - Root Directory: `backend`
   - Start Command: `node server.js`
   - Build Command: (leave empty, no build needed)

4. **Set Environment Variables**:
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key
   - `PORT`: Railway sets this automatically

5. **Deploy**:
   - Railway will auto-deploy on git push
   - Copy the generated URL (e.g., `https://your-app.railway.app`)

6. **Update Frontend**:
   - Update `VITE_PROXY_URL` in frontend `.env` to your Railway URL
   - Redeploy frontend

---

## 🐳 Option 3: Docker Deployment (Full Stack)

Deploy both frontend and backend together using Docker.

### Create Dockerfile for Backend

Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]
```

### Create Dockerfile for Frontend

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
      - PORT=3000
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_PROXY_URL=http://backend:3000
    depends_on:
      - backend
    restart: unless-stopped
```

### Deploy with Docker:

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🚂 Option 4: Deploy Backend to Render

Render is another great option for Node.js backends.

### Steps:

1. **Create Render Account**: https://render.com

2. **Create New Web Service**:
   - Connect your GitHub repo
   - Root Directory: `backend`
   - Build Command: (leave empty)
   - Start Command: `node server.js`

3. **Set Environment Variables**:
   - `ELEVENLABS_API_KEY`
   - `PORT` (auto-set by Render)

4. **Deploy**:
   - Render will auto-deploy
   - Copy the URL and update frontend `VITE_PROXY_URL`

---

## 📦 Option 5: Deploy Frontend to Netlify

Netlify is another excellent option for static sites.

### Steps:

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. **Set Environment Variables** in Netlify Dashboard:
   - Site Settings → Environment Variables
   - Add all `VITE_*` variables

---

## 🔄 Option 6: Deploy Both to Fly.io

Fly.io can host both frontend and backend.

### Steps:

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create fly.toml for Backend** (`backend/fly.toml`):
   ```toml
   app = "voicevault-backend"
   primary_region = "iad"

   [build]

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0

   [[env]]
     PORT = "3000"
   ```

3. **Deploy Backend**:
   ```bash
   cd backend
   fly launch
   fly secrets set ELEVENLABS_API_KEY=your_key
   fly deploy
   ```

4. **Create fly.toml for Frontend**:
   ```toml
   app = "voicevault-frontend"
   primary_region = "iad"

   [build]
     builder = "nixpacks"

   [http_service]
     internal_port = 80
     force_https = true

   [[env]]
     VITE_PROXY_URL = "https://voicevault-backend.fly.dev"
   ```

5. **Deploy Frontend**:
   ```bash
   fly launch
   fly secrets set VITE_WALLETCONNECT_PROJECT_ID=your_id
   fly deploy
   ```

---

## ✅ Post-Deployment Checklist

- [ ] Backend is accessible and returning responses
- [ ] Frontend can connect to backend (check browser console)
- [ ] Environment variables are set correctly
- [ ] CORS is configured on backend (should be enabled)
- [ ] Wallet connection works (RainbowKit)
- [ ] ElevenLabs API calls work
- [ ] HTTPS is enabled (required for wallet connections)

---

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Check `VITE_PROXY_URL` is correct
- Verify backend is running and accessible
- Check CORS settings on backend
- Check browser console for errors

### Wallet connection fails
- Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set
- Check that site is served over HTTPS
- Verify WalletConnect project is configured correctly

### ElevenLabs API errors
- Verify `ELEVENLABS_API_KEY` is set correctly
- Check API key has sufficient credits
- Review backend logs for detailed errors

### Build fails
- Ensure Node.js 18+ is used
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run lint`

---

## 📝 Recommended Setup (Production)

**Frontend**: Vercel (automatic deployments, CDN, HTTPS)
**Backend**: Railway or Render (easy Node.js hosting, auto-scaling)

This combination provides:
- ✅ Fast global CDN for frontend
- ✅ Reliable backend hosting
- ✅ Automatic HTTPS
- ✅ Easy environment variable management
- ✅ Automatic deployments from Git

---

## 🔗 Quick Links

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Fly.io Documentation](https://fly.io/docs)
- [Docker Documentation](https://docs.docker.com)

---

**Need help?** Check the logs in your hosting provider's dashboard or open an issue on GitHub.

