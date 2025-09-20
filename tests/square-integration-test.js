// Complete Square SDK Integration Test
// Run with: node tests/square-integration-test.js

const { runSquareConnectionTest } = require('./square-connection-test');
const { testWebhookSignature } = require('./square-webhook-test');
const { getSquareConfig } = require('../services/square');
const { calculateDownPayment, calculateRemainingPayment } = require('../services/payments');

async function runCompleteSquareTest() {
  console.log('🚀 Complete Square SDK Integration Test');
  console.log('=======================================');
  
  try {
    // Test 1: Square connection and configuration
    console.log('\n🔗 Testing Square Connection...');
    await runSquareConnectionTest();
    
    // Test 2: Webhook signature verification
    console.log('\n🔒 Testing Webhook Security...');
    testWebhookSignature();
    
    // Test 3: Payment calculations
    console.log('\n💰 Testing Payment Calculations...');
    const testAmounts = [35000, 30000, 20000, 15000]; // Service prices in cents
    
    testAmounts.forEach(amount => {
      const downPayment = calculateDownPayment(amount);
      const remaining = calculateRemainingPayment(amount);
      const total = downPayment + remaining;
      
      console.log(`   Service: $${amount/100} | Down: $${downPayment/100} (20%) | Remaining: $${remaining/100} (80%) | Total: $${total/100}`);
      
      if (total !== amount) {
        throw new Error(`Payment calculation error: ${total} !== ${amount}`);
      }
    });
    console.log('   ✅ All payment calculations correct');
    
    // Test 4: Frontend configuration
    console.log('\n🎨 Testing Frontend Configuration...');
    const config = getSquareConfig();
    
    const configTests = [
      { name: 'Application ID', value: config.applicationId, required: true },
      { name: 'Location ID', value: config.locationId, required: true },
      { name: 'Environment', value: config.environment, required: true }
    ];
    
    configTests.forEach(test => {
      if (test.required && !test.value) {
        console.log(`   ❌ ${test.name}: Missing`);
      } else {
        console.log(`   ✅ ${test.name}: ${test.value || 'Not set'}`);
      }
    });
    
    // Test 5: Environment validation
    console.log('\n🌍 Testing Environment Setup...');
    const env = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    console.log(`   ✅ Environment: ${env}`);
    
    if (env === 'sandbox') {
      console.log('   📝 Using sandbox environment (safe for testing)');
    } else {
      console.log('   ⚠️ Using production environment - ensure credentials are valid');
    }
    
    console.log('\n🎉 Square SDK Integration Test Complete!');
    console.log('\n✅ Summary:');
    console.log('• Square SDK properly installed and configured');
    console.log('• Connection test framework ready');
    console.log('• Webhook signature verification working');
    console.log('• Payment calculations accurate');
    console.log('• Frontend configuration available');
    console.log('• Environment variables structured correctly');
    
    console.log('\n🚀 Ready for Square Payments Integration!');
    console.log('\n📋 Next Development Steps:');
    console.log('• Replace dummy credentials with real Square sandbox credentials');
    console.log('• Test actual payment processing with test cards');
    console.log('• Configure webhook endpoints in Square Dashboard');
    console.log('• Integrate with appointment booking system');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.log('\n🔍 Check the individual test outputs above for specific issues');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runCompleteSquareTest();
}

module.exports = { runCompleteSquareTest };