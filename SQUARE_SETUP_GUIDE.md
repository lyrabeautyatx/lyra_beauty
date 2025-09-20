# Square API Setup Guide

## Step 1: Access Square Developer Dashboard

### 1.1 Go to Square Developer Portal
- Visit: https://developer.squareup.com/
- Sign in with your Square account

### 1.2 Access Your Application
1. Go to "My Applications" or "Apps"
2. If you don't have an app, click "Create Application"
   - App Name: "Lyra Beauty Booking"
   - Description: "Beauty services booking and payment system"
3. Click on your application to access the dashboard

## Step 2: Get Sandbox Credentials

### 2.1 Navigate to Sandbox Tab
- In your application dashboard, click on "Sandbox" tab
- This gives you test credentials that won't charge real money

### 2.2 Copy These Values:

#### Application ID
- Found in: Sandbox → Credentials
- Looks like: `sandbox-sq0idb-1234567890abcdef`
- **Copy this value**

#### Access Token
- Found in: Sandbox → Credentials  
- Looks like: `EAAAEOXXXXXXXXXXxxxxxxxxxxxxxxx`
- **Copy this value**

#### Location ID
- Found in: Sandbox → Locations
- Usually looks like: `L123456789012345678`
- **Copy this value**

#### Webhook Signature Key
1. Go to: Sandbox → Webhooks
2. Click "Create Subscription" or "Add Endpoint"
3. Endpoint URL: `http://localhost:3000/webhooks/square` (for local testing)
4. Select events:
   - payment.created
   - payment.updated  
   - invoice.payment_made
   - invoice.published
5. After creating, copy the **Signature Key**
6. Looks like: `wbhk_xxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Test Your Setup

### 3.1 Verify Credentials Work
- Use Square's API Explorer: https://developer.squareup.com/explorer/square
- Test with your sandbox access token

### 3.2 Test Payment Flow
- Use test card numbers:
  - Visa: 4111 1111 1111 1111
  - Mastercard: 5555 5555 5555 4444
  - Any future expiry date
  - Any CVV

## Step 4: Webhook Testing (Optional for Local)
- For local testing, you can use ngrok to expose localhost:
  ```bash
  npm install -g ngrok
  ngrok http 3000
  ```
- Use the ngrok URL for webhook endpoint instead of localhost

## Important Notes:
- **Sandbox Mode**: These credentials only work with test data
- **No Real Charges**: Sandbox never processes real payments
- **Production**: When ready, switch to Production tab for live credentials