// Square Webhook Signature Test
// Run with: node tests/square-webhook-test.js

const { verifyWebhookSignature } = require('../services/square');
const crypto = require('crypto');

function testWebhookSignature() {
  console.log('🧪 Square Webhook Signature Test');
  console.log('===================================');
  
  try {
    // Test data
    const testBody = JSON.stringify({
      type: 'payment.created',
      data: {
        object: {
          payment: {
            id: 'test-payment-id',
            amount_money: { amount: 1000, currency: 'USD' }
          }
        }
      }
    });
    
    const testSignatureKey = 'test-signature-key-123';
    
    // Generate expected signature
    const hmac = crypto.createHmac('sha256', testSignatureKey);
    hmac.update(testBody);
    const expectedSignature = hmac.digest('base64');
    
    console.log('\n1. Testing with valid signature:');
    
    // Temporarily set the signature key for testing
    const originalKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = testSignatureKey;
    
    const isValid = verifyWebhookSignature(testBody, expectedSignature);
    console.log(`   ✅ Valid signature verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n2. Testing with invalid signature:');
    const isInvalid = verifyWebhookSignature(testBody, 'invalid-signature');
    console.log(`   ✅ Invalid signature rejection: ${!isInvalid ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n3. Testing without signature key:');
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const noKeyResult = verifyWebhookSignature(testBody, expectedSignature);
    console.log(`   ✅ No key fallback (dev mode): ${noKeyResult ? 'PASSED' : 'FAILED'}`);
    
    // Restore original key
    if (originalKey) {
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = originalKey;
    }
    
    console.log('\n🎉 Webhook signature verification tests completed!');
    console.log('\n📝 To test webhooks in production:');
    console.log('• Set SQUARE_WEBHOOK_SIGNATURE_KEY in .env');
    console.log('• Configure webhook endpoint in Square Dashboard');
    console.log('• Test with actual Square webhook events');
    
  } catch (error) {
    console.error('\n❌ Webhook test failed:', error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWebhookSignature();
}

module.exports = { testWebhookSignature };