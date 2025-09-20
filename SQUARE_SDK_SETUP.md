# Square SDK Setup and Integration Guide

## 🎯 Overview

This guide covers the complete Square SDK setup for the Lyra Beauty platform, including payment processing, webhook handling, and connection testing.

## ✅ Completed Setup

### 1. Square SDK Installation
- ✅ Square SDK v43.0.2 installed via npm
- ✅ Configured for both sandbox and production environments

### 2. Core Services Created

#### `services/square.js` - Square Client Service
- Square client initialization with proper environment handling
- Connection testing functionality
- Webhook signature verification
- Frontend configuration provider

#### `services/payments.js` - Payment Processing Service
- Down payment processing (20% of total)
- Full payment processing
- Remaining payment invoice generation
- Payment calculation utilities

#### `routes/webhooks.js` - Webhook Routes
- Square webhook endpoint with signature verification
- Payment event handling (created, updated, invoice payments)
- Error handling and logging

### 3. Testing Framework

#### `tests/square-connection-test.js`
- Environment variable validation
- Square API connection testing
- Frontend configuration verification

#### `tests/square-webhook-test.js`
- Webhook signature verification testing
- Security validation

#### `tests/square-integration-test.js`
- Complete integration testing
- Payment calculation validation
- Configuration verification

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Square API Configuration
SQUARE_ACCESS_TOKEN=your_sandbox_access_token
SQUARE_APPLICATION_ID=your_sandbox_application_id
SQUARE_LOCATION_ID=your_sandbox_location_id
SQUARE_WEBHOOK_SIGNATURE_KEY=your_sandbox_webhook_signature_key
SQUARE_ENVIRONMENT=sandbox  # or 'production'
```

### Getting Square Credentials

1. **Sign up at Square Developer Dashboard**: https://developer.squareup.com/apps
2. **Create a new application**
3. **Get sandbox credentials**:
   - Access Token
   - Application ID
   - Location ID
   - Webhook Signature Key

## 🧪 Testing Your Setup

### 1. Run Connection Test
```bash
node tests/square-connection-test.js
```

### 2. Run Webhook Test
```bash
node tests/square-webhook-test.js
```

### 3. Run Complete Integration Test
```bash
node tests/square-integration-test.js
```

## 💳 Payment Flow Implementation

### Down Payment Processing (20%)
```javascript
const { processDownPayment } = require('./services/payments');

// Process 20% down payment
const result = await processDownPayment(booking, sourceId, totalAmount);
if (result.success) {
  // Payment successful - save appointment
  console.log('Payment ID:', result.paymentId);
}
```

### Remaining Payment Invoice (80%)
```javascript
const { createRemainingPaymentInvoice } = require('./services/payments');

// Create invoice for remaining 80%
const invoice = await createRemainingPaymentInvoice(appointmentData, customerEmail);
if (invoice.success) {
  console.log('Invoice created:', invoice.invoiceId);
}
```

## 🔒 Webhook Security

### Signature Verification
All webhooks are automatically verified using the Square webhook signature:

```javascript
const { verifyWebhookSignature } = require('./services/square');

// Automatic verification in webhook routes
const isValid = verifyWebhookSignature(requestBody, signature);
```

### Webhook Events Handled
- `payment.created` - New payment processed
- `payment.updated` - Payment status changed
- `invoice.payment_made` - Invoice payment received

## 📊 Payment Calculations

### Business Rules
- **Down Payment**: 20% of service price (non-refundable)
- **Remaining Payment**: 80% of service price (due at appointment)
- **Refund Policy**: If full payment made, refund 80% and keep 20% fee

### Service Pricing
- Microblading: $350 → Down: $70, Remaining: $280
- Microshading: $300 → Down: $60, Remaining: $240
- Lip Glow: $200 → Down: $40, Remaining: $160
- Brow Mapping: $150 → Down: $30, Remaining: $120

## 🌍 Environment Switching

### Sandbox (Development)
```env
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=EAAAEOy... (sandbox token)
```

### Production (Live Payments)
```env
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=EAAAEPf... (production token)
```

## 🔧 Frontend Integration

### Getting Square Configuration
```javascript
const { getSquareConfig } = require('./services/square');

// Get config for Square Web Payments SDK
const config = getSquareConfig();
// Returns: { applicationId, locationId, environment }
```

### Square Web Payments SDK Usage
```html
<script src="https://sandbox.web.squarecdn.com/v1/square.js"></script>
<script>
  const payments = Square.payments(config.applicationId, config.locationId);
</script>
```

## 🔍 Troubleshooting

### Common Issues

1. **"fetch failed" error**: Invalid credentials (expected with dummy values)
2. **"Cannot read properties of undefined"**: Check Square SDK import statements
3. **Webhook signature errors**: Verify SQUARE_WEBHOOK_SIGNATURE_KEY is set

### Testing with Real Credentials

1. Replace dummy values in `.env` with real Square sandbox credentials
2. Run `node tests/square-connection-test.js` to verify connection
3. Test payments with Square sandbox test cards:
   - Visa: `4111 1111 1111 1111`
   - Mastercard: `5105 1051 0510 5100`
   - CVV: Any 3 digits
   - Expiry: Any future date

## 🚀 Next Steps

1. **Replace dummy credentials** with real Square sandbox credentials
2. **Test payment processing** with Square sandbox test cards
3. **Configure webhook endpoints** in Square Dashboard
4. **Integrate with appointment booking system**
5. **Add error handling** for payment failures
6. **Implement refund processing**
7. **Add payment status tracking**

## 📚 Additional Resources

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square Webhooks Guide](https://developer.squareup.com/docs/webhooks-overview)
- [Square Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Square Sandbox Testing](https://developer.squareup.com/docs/testing/sandbox)

---

**Square SDK Setup Complete! ✅**