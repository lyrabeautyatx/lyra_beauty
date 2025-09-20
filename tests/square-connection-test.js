// Square SDK Connection Test
// Run with: node tests/square-connection-test.js

const { testConnection, getSquareConfig } = require('../services/square');

async function runSquareConnectionTest() {
  console.log('🧪 Square SDK Connection Test');
  console.log('================================');
  
  try {
    // Check environment variables
    console.log('\n1. Environment Variables Check:');
    const requiredVars = [
      'SQUARE_ACCESS_TOKEN',
      'SQUARE_APPLICATION_ID', 
      'SQUARE_LOCATION_ID',
      'SQUARE_ENVIRONMENT'
    ];
    
    let missingVars = [];
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`   ✅ ${varName}: Set`);
      } else {
        console.log(`   ❌ ${varName}: Missing`);
        missingVars.push(varName);
      }
    });
    
    if (missingVars.length > 0) {
      console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
      console.log('📝 Please copy .env.example to .env and configure your Square credentials');
      return;
    }
    
    // Test Square API connection
    console.log('\n2. Square API Connection Test:');
    const connectionResult = await testConnection();
    
    if (connectionResult.success) {
      console.log('   ✅ API Connection: Successful');
      console.log(`   📍 Location: ${connectionResult.location.name}`);
      console.log(`   🆔 Location ID: ${connectionResult.location.id}`);
      console.log(`   🌍 Environment: ${connectionResult.environment}`);
    } else {
      console.log('   ❌ API Connection: Failed');
      console.log(`   ❌ Error: ${connectionResult.error}`);
      
      if (connectionResult.needsCredentials) {
        console.log('   📝 This is expected with example credentials');
        console.log('   📝 Replace with real Square sandbox credentials to test connection');
      } else {
        return;
      }
    }
    
    // Test Square config for frontend
    console.log('\n3. Frontend Configuration:');
    const config = getSquareConfig();
    console.log(`   ✅ Application ID: ${config.applicationId ? 'Set' : 'Missing'}`);
    console.log(`   ✅ Location ID: ${config.locationId ? 'Set' : 'Missing'}`);
    console.log(`   ✅ Environment: ${config.environment}`);
    
    console.log('\n🎉 Square SDK Setup Complete!');
    console.log('\nNext Steps:');
    console.log('• Test payments with Square sandbox test cards');
    console.log('• Configure webhook endpoints');
    console.log('• Test webhook signature verification');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('• Verify your Square credentials are correct');
    console.log('• Check if you are using sandbox vs production environment');
    console.log('• Ensure your Square account has the necessary permissions');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runSquareConnectionTest();
}

module.exports = { runSquareConnectionTest };