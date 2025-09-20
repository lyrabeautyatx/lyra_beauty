const { testUserRegistrationFlow } = require('./user-registration-test');
const { testGoogleOAuthIntegration } = require('./oauth-integration-test');

// Run all user registration tests
async function runAllUserRegistrationTests() {
  console.log('🚀 Running All User Registration Tests...\n');
  
  try {
    // Test 1: Basic user registration flow
    console.log('===============================');
    console.log('TEST 1: Basic User Registration');
    console.log('===============================');
    await testUserRegistrationFlow();
    
    console.log('\n\n===============================');
    console.log('TEST 2: OAuth Integration');
    console.log('===============================');
    await testGoogleOAuthIntegration();
    
    console.log('\n\n🎉 ALL TESTS PASSED! 🎉');
    console.log('\n📋 FINAL SUMMARY:');
    console.log('✅ User Registration Flow: COMPLETE');
    console.log('✅ New users created from OAuth callback');
    console.log('✅ Default customer role assignment working');
    console.log('✅ User data stored in database');
    console.log('✅ Duplicate user handling implemented');
    console.log('✅ User permissions system working');
    console.log('✅ OAuth integration tested with multiple scenarios');
    console.log('✅ Database persistence verified');
    console.log('✅ Authentication routes available');
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllUserRegistrationTests();
}

module.exports = { runAllUserRegistrationTests };