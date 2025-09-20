# Square Webhook Implementation

## Overview
This implementation provides a complete Square webhook system for the Lyra Beauty application, enabling real-time payment notifications and automated appointment status updates.

## Features

### ✅ Webhook Endpoint (`/webhooks/square`)
- **URL**: `POST /webhooks/square`
- **Purpose**: Receives payment notifications from Square
- **Security**: HMAC-SHA256 signature verification
- **Content Type**: `application/json` (raw body for signature verification)

### ✅ Supported Webhook Events
1. **`payment.created`** - New payment received
2. **`payment.updated`** - Payment status changed  
3. **`invoice.payment_made`** - Invoice payment completed
4. **`invoice.published`** - Invoice sent to customer
5. **`invoice.payment_request.sent`** - Payment reminder sent

### ✅ Security Implementation
- **Signature Verification**: Uses HMAC-SHA256 with Square's webhook signature key
- **Environment-Based**: Enforced in production, optional in development
- **Header Validation**: Checks `X-Square-HmacSha256-Signature` header
- **Raw Body Processing**: Prevents request tampering

### ✅ Database Integration
- **Payment Tracking**: Records all payment events with Square payment IDs
- **Appointment Updates**: Automatically confirms appointments on payment completion
- **Event Logging**: Maintains audit trail of all webhook events

## Configuration

### Environment Variables
```bash
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key_here
SQUARE_ENVIRONMENT=sandbox  # or 'production'
NODE_ENV=development        # or 'production'
```

### Square Developer Dashboard Setup
1. Navigate to your Square application in the Developer Dashboard
2. Go to **Webhooks** section
3. Add webhook endpoint: `https://yourdomain.com/webhooks/square`
4. Subscribe to events: `payment.created`, `payment.updated`, `invoice.payment_made`
5. Copy the **Signature Key** to your environment variables

## Testing

### Health Check
```bash
curl -X GET http://localhost:3000/webhooks/health
# Returns: {"status":"OK","service":"webhooks","timestamp":"..."}
```

### Development Test Endpoint
```bash
curl -X POST http://localhost:3000/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

### Webhook Simulation
```bash
# Test payment webhook
curl -X POST http://localhost:3000/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.created",
    "event_id": "test-123",
    "created_at": "2025-01-01T12:00:00Z",
    "data": {
      "object": {
        "payment": {
          "id": "payment-123",
          "amount_money": {"amount": 7000, "currency": "USD"},
          "status": "COMPLETED"
        }
      }
    }
  }'
```

## Integration with Existing System

### Payment Processing Flow
1. Customer makes down payment via Square Web SDK
2. Square sends `payment.created` webhook
3. Webhook handler records payment in database
4. Appointment status updated to 'confirmed'
5. Invoice generated for remaining payment (if applicable)

### Appointment Status Updates
- **Payment Created**: Records payment, keeps appointment 'pending'
- **Payment Completed**: Updates appointment to 'confirmed'
- **Invoice Paid**: Marks remaining payment as received

## Error Handling

### Webhook Failures
- Invalid signature → `401 Unauthorized`
- Malformed JSON → `400 Bad Request`
- Database errors → `500 Internal Server Error`
- All errors logged with context

### Retry Mechanism
- Square automatically retries failed webhooks
- Webhook handler is idempotent (safe to process same event multiple times)
- Database operations use `INSERT OR REPLACE` for payment records

## Security Best Practices

### Production Deployment
- ✅ **HTTPS Required**: Square requires HTTPS for webhook endpoints
- ✅ **Signature Verification**: Always enabled in production
- ✅ **Input Validation**: All webhook data validated before processing
- ✅ **Error Logging**: Detailed logs for security monitoring

### Development vs Production
- **Development**: Signature verification optional for easier testing
- **Production**: Signature verification mandatory
- **Environment Detection**: Based on `NODE_ENV` and `SQUARE_ENVIRONMENT`

## Monitoring and Troubleshooting

### Logs to Monitor
```javascript
// Successful webhook processing
"Square webhook event received: {type, eventId, createdAt}"
"Payment {paymentId} recorded in database"

// Error scenarios  
"Square webhook signature verification failed"
"Error processing Square webhook: {error}"
```

### Common Issues
1. **Signature Verification Failing**
   - Check `SQUARE_WEBHOOK_SIGNATURE_KEY` is correct
   - Ensure webhook URL matches exactly in Square Dashboard
   
2. **Database Connection Errors**
   - Verify database is initialized
   - Check SQLite file permissions

3. **Missing Environment Variables**
   - Confirm all Square credentials are set
   - Validate webhook signature key is configured

## Testing Results

![Webhook Health Check](https://github.com/user-attachments/assets/920da84c-2f46-41b0-a58c-bdf72026be38)

### Automated Test Coverage
- ✅ Health endpoint functionality
- ✅ Signature verification algorithm  
- ✅ Event processing pipeline
- ✅ Database integration
- ✅ Error handling scenarios
- ✅ Multiple webhook event types

This implementation provides a robust, secure, and scalable webhook system that integrates seamlessly with the existing Lyra Beauty payment processing infrastructure.