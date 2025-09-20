# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project and OAuth Credentials

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### 1.2 Create a New Project (or use existing)
1. Click on the project dropdown at the top
2. Click "New Project"
3. Name: "Lyra Beauty App"
4. Click "Create"

### 1.3 Enable Google+ API
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### 1.4 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure OAuth consent screen:
   - User Type: External (for testing)
   - App name: "Lyra Beauty"
   - User support email: your email
   - Developer contact: your email
   - Add scope: ../auth/userinfo.email, ../auth/userinfo.profile
   - Add test users: your email

4. Create OAuth Client ID:
   - Application type: "Web application"
   - Name: "Lyra Beauty Web App"
   - Authorized JavaScript origins:
     - http://localhost:3000
     - https://lyrabeautyatx.com (for production)
   - Authorized redirect URIs:
     - http://localhost:3000/auth/google/callback
     - https://lyrabeautyatx.com/auth/google/callback (for production)

### 1.5 Copy Your Credentials
After creating, you'll get:
- **Client ID**: Copy this (looks like: 123456789-abcdefg.apps.googleusercontent.com)
- **Client Secret**: Copy this (looks like: GOCSPX-1234567890abcdefghijk)

## Step 2: Update Your .env File
Replace the placeholder values in your .env file with the actual credentials from above.