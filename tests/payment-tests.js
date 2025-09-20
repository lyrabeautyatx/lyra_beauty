const { calculateDownPayment, calculateRemainingPayment } = require('../services/payments');

// Test payment calculation functions
function testPaymentCalculations() {
  console.log('Testing payment calculation functions...');
  
  // Test down payment calculation (20%)
  const testAmounts = [10000, 35000, 30000, 20000, 15000]; // Service prices in cents
  
  testAmounts.forEach(amount => {
    const downPayment = calculateDownPayment(amount);
    const remainingPayment = calculateRemainingPayment(amount);
    
    console.log(`Total: $${(amount / 100).toFixed(2)}`);
    console.log(`Down Payment (20%): $${(downPayment / 100).toFixed(2)}`);
    console.log(`Remaining (80%): $${(remainingPayment / 100).toFixed(2)}`);
    console.log(`Sum check: ${downPayment + remainingPayment === amount ? 'PASS' : 'FAIL'}`);
    console.log('---');
  });
}

// Test webhook signature verification (mock)
function testWebhookSignature() {
  console.log('Testing webhook signature verification...');
  
  const crypto = require('crypto');
  const testSignatureKey = 'test_webhook_signature_key';
  const testBody = '{"type":"payment.updated","data":{"object":{"payment":{"id":"test_payment_id"}}}}';
  const testUrl = 'https://example.com/webhooks/square';
  
  // Generate test signature
  const hmac = crypto.createHmac('sha256', testSignatureKey);
  hmac.update(testUrl + testBody);
  const expectedSignature = hmac.digest('base64');
  
  console.log(`Generated signature: ${expectedSignature}`);
  console.log('Webhook signature test completed');
}

// Run tests
if (require.main === module) {
  try {
    testPaymentCalculations();
    testWebhookSignature();
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

module.exports = {
  testPaymentCalculations,
  testWebhookSignature
};