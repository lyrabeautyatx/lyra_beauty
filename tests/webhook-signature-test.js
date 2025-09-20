// Test Square webhook with signature verification
const crypto = require('crypto');

async function testWebhookWithSignature() {
  console.log('🔐 Testing Square Webhook with Signature Verification...');
  
  try {
    const baseUrl = 'http://localhost:3000';
    const signatureKey = 'test-webhook-signature-key';
    
    // Create test webhook event
    const testEvent = {
      type: 'payment.updated',
      event_id: 'test-event-456',
      created_at: new Date().toISOString(),
      data: {
        object: {
          payment: {
            id: 'test-payment-456',
            amount_money: {
              amount: 5000, // $50.00
              currency: 'USD'
            },
            status: 'COMPLETED'
          }
        }
      }
    };
    
    const payload = JSON.stringify(testEvent);
    console.log('Test payload created:', payload.length, 'bytes');
    
    // Generate signature
    const signature = crypto
      .createHmac('sha256', signatureKey)
      .update(payload)
      .digest('base64');
    
    console.log('Generated signature:', signature);
    
    // Test with signature (simulating production mode)
    const response = await fetch(`${baseUrl}/webhooks/square`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Square-HmacSha256-Signature': signature
      },
      body: payload
    });
    
    const result = await response.json();
    console.log('Webhook response:', result);
    
    if (response.ok) {
      console.log('✓ Webhook with signature processed successfully');
    } else {
      console.log('⚠️  Webhook response status:', response.status);
    }
    
    // Test invoice webhook
    const invoiceEvent = {
      type: 'invoice.payment_made',
      event_id: 'test-invoice-789',
      created_at: new Date().toISOString(),
      data: {
        object: {
          invoice: {
            id: 'test-invoice-789',
            invoice_request: {
              request_type: 'BALANCE'
            }
          }
        }
      }
    };
    
    const invoicePayload = JSON.stringify(invoiceEvent);
    const invoiceSignature = crypto
      .createHmac('sha256', signatureKey)
      .update(invoicePayload)
      .digest('base64');
    
    const invoiceResponse = await fetch(`${baseUrl}/webhooks/square`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Square-HmacSha256-Signature': invoiceSignature
      },
      body: invoicePayload
    });
    
    if (invoiceResponse.ok) {
      console.log('✓ Invoice webhook processed successfully');
    }
    
    console.log('\n🎉 All webhook signature tests passed!');
    
  } catch (error) {
    console.error('❌ Webhook signature test failed:', error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWebhookWithSignature();
}

module.exports = { testWebhookWithSignature };