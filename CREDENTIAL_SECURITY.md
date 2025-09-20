# Credential Management Strategy

## 🚫 NEVER Commit These Files to Git
- ✅ `.env` files with real credentials
- ✅ `client_secret_*.json` files
- ✅ Any file containing API keys, secrets, or tokens

## 📋 Multi-Environment Strategy

### 1. Local Development
**Use `.env` file** (already gitignored)
```bash
# .env (local only - never commit)
GOOGLE_CLIENT_ID=81434500494-boki5c9giv4nj7c8jes37dhob940m93i.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
SQUARE_ACCESS_TOKEN=your_sandbox_token
# ... other secrets
```

### 2. GitHub Actions/CI (Testing)
**Use GitHub Repository Secrets**
- Go to: Repository → Settings → Secrets and variables → Actions
- Add secrets for automated testing

### 3. Production Server (AWS EC2)
**Use Environment Variables** (multiple options):

#### Option A: PM2 Ecosystem File (Recommended)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'lyra-beauty',
    script: 'server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
      // ... other env vars
    }
  }]
};
```

#### Option B: AWS Systems Manager Parameter Store
Store secrets in AWS Parameter Store and fetch them at startup.

#### Option C: Docker Secrets (if using Docker)
Use Docker secrets management.

## 🔄 How Production Server Gets Credentials

### Method 1: Environment Variables (Simple)
1. SSH into your EC2 instance
2. Set environment variables:
```bash
export GOOGLE_CLIENT_ID="81434500494-boki5c9giv4nj7c8jes37dhob940m93i.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="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"
# Add to ~/.bashrc or ~/.profile to persist
```

### Method 2: Secure .env on Server (Medium Security)
1. Create `.env` file directly on production server
2. Set proper permissions: `chmod 600 .env`
3. Never include in deployment/git

### Method 3: AWS Parameter Store (High Security)
1. Store secrets in AWS Systems Manager
2. App fetches secrets at startup using AWS SDK
3. Uses IAM roles for secure access

## 🔧 Implementation for Your Project

Since you're using PM2 and AWS EC2, here's the recommended approach: