# Quick Setup Checklist for Lyra Beauty

## ✅ Setup Tasks

### 1. Google OAuth Setup
- [ ] Go to https://console.cloud.google.com/
- [ ] Create/select project "Lyra Beauty App"
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized origins: http://localhost:3000
- [ ] Add redirect URI: http://localhost:3000/auth/google/callback
- [ ] Copy Client ID and Client Secret to .env file

### 2. Square API Setup  
- [ ] Go to https://developer.squareup.com/
- [ ] Access your application dashboard
- [ ] Go to Sandbox tab
- [ ] Copy Application ID to .env file
- [ ] Copy Access Token to .env file
- [ ] Copy Location ID to .env file
- [ ] Create webhook subscription (optional for basic testing)
- [ ] Copy Webhook Signature Key to .env file

### 3. Update .env File
Replace these placeholders in your .env file:
```
SQUARE_ACCESS_TOKEN=YOUR_SANDBOX_ACCESS_TOKEN_HERE
SQUARE_APPLICATION_ID=YOUR_SANDBOX_APPLICATION_ID_HERE  
SQUARE_LOCATION_ID=YOUR_SANDBOX_LOCATION_ID_HERE
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_SANDBOX_WEBHOOK_SIGNATURE_KEY_HERE
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

### 4. Test the Application
```bash
npm start
```
Then visit: http://localhost:3000

## 🔗 Quick Links
- **Google Cloud Console**: https://console.cloud.google.com/
- **Square Developer Portal**: https://developer.squareup.com/
- **Square API Explorer**: https://developer.squareup.com/explorer/square

## 📋 Test Card Numbers (Sandbox Only)
- **Visa**: 4111 1111 1111 1111
- **Mastercard**: 5555 5555 5555 4444  
- **Expiry**: Any future date
- **CVV**: Any 3-digit number

## 🚀 Once Setup is Complete
1. Start the app: `npm start`
2. Visit: http://localhost:3000
3. Test Google OAuth login
4. Test booking flow with Square payments
5. Check webhook functionality (if configured)