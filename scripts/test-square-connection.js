#!/usr/bin/env node

/**
 * Square Connection Test Script
 * Tests the Square API connection with current credentials
 */

require('dotenv').config();

async function testSquareConnection() {
  console.log('🔸 Square API Connection Test');
  console.log('===============================');
  
  // Check if Square credentials are available
  const requiredCreds = [
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_APPLICATION_ID',
    'SQUARE_LOCATION_ID',
    'SQUARE_ENVIRONMENT'
  ];
  
  const missing = requiredCreds.filter(cred => !process.env[cred]);
  if (missing.length > 0) {
    console.log('❌ Missing Square credentials:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Square credentials found');
  console.log(`📍 Environment: ${process.env.SQUARE_ENVIRONMENT}`);
  console.log(`📍 Location ID: ${process.env.SQUARE_LOCATION_ID}`);
  
  try {
    // Import Square SDK
    const { Client, Environment } = require('squareup');
    
    // Initialize Square client
    const squareClient = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox
    });
    
    console.log('🔗 Testing Square API connection...');
    
    // Test locations API
    const locationsApi = squareClient.locationsApi;
    const response = await locationsApi.listLocations();
    
    if (response.result.locations && response.result.locations.length > 0) {
      console.log('✅ Square API connection successful!');
      console.log(`📍 Found ${response.result.locations.length} location(s):`);
      
      response.result.locations.forEach(location => {
        console.log(`   - ${location.name} (${location.id})`);
        console.log(`     Status: ${location.status}`);
        console.log(`     Country: ${location.country}`);
      });
      
      // Check if our configured location ID exists
      const configuredLocation = response.result.locations.find(
        loc => loc.id === process.env.SQUARE_LOCATION_ID
      );
      
      if (configuredLocation) {
        console.log('✅ Configured location ID is valid');
      } else {
        console.log('⚠️  Configured location ID not found in available locations');
      }
      
    } else {
      console.log('⚠️  No locations found');
    }
    
    console.log('\n🎉 Square integration is ready for testing!');
    console.log('💳 Test card numbers:');
    console.log('   - Visa: 4111 1111 1111 1111');
    console.log('   - Mastercard: 5555 5555 5555 4444');
    console.log('   - Any future expiry, any CVV');
    
  } catch (error) {
    console.log('❌ Square API connection failed:', error.message);
    
    if (error.statusCode === 401) {
      console.log('🔐 Authentication failed - check your access token');
    } else if (error.statusCode === 403) {
      console.log('🚫 Permission denied - check your application permissions');
    }
    
    process.exit(1);
  }
}

// Run the test
testSquareConnection().catch(console.error);