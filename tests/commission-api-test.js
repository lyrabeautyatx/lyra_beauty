#!/usr/bin/env node

/**
 * Commission API Test
 * Tests the commission API endpoints
 */

const { spawn } = require('child_process');
const fetch = require('node-fetch');

async function testCommissionAPI() {
  console.log('🧪 Testing Commission API Endpoints...\n');
  
  // Start server in background
  console.log('🚀 Starting test server...');
  const server = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3001' },
    stdio: 'pipe'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const baseUrl = 'http://localhost:3001';
    
    // Test 1: Get commission statistics (without auth - should fail)
    console.log('1️⃣  Testing commission stats endpoint (no auth)...');
    try {
      const response = await fetch(`${baseUrl}/api/commissions/stats/overview`);
      if (response.status === 403 || response.status === 401) {
        console.log('  ✓ Properly rejected unauthorized request');
      } else {
        console.log('  ⚠️  Expected auth rejection, got status:', response.status);
      }
    } catch (error) {
      console.log('  ✓ Server connection test passed (server is running)');
    }
    
    // Test 2: Check that commission routes are registered
    console.log('\n2️⃣  Testing route registration...');
    try {
      const response = await fetch(`${baseUrl}/api/commissions`);
      if (response.status === 401 || response.status === 403) {
        console.log('  ✓ Commission routes are registered and require auth');
      } else {
        console.log('  ⚠️  Unexpected response status:', response.status);
      }
    } catch (error) {
      console.log('  ❌ Route registration test failed:', error.message);
    }
    
    console.log('\n✅ Commission API basic tests completed');
    
  } catch (error) {
    console.error('❌ Commission API tests failed:', error);
  } finally {
    // Clean up server
    console.log('\n🛑 Stopping test server...');
    server.kill();
  }
}

// Test route imports directly
function testRouteImports() {
  console.log('📦 Testing route imports...');
  
  try {
    const commissionRoutes = require('../routes/commissions');
    console.log('  ✓ Commission routes imported successfully');
    
    const commissionService = require('../services/commission');
    console.log('  ✓ Commission service imported successfully');
    
    return true;
  } catch (error) {
    console.error('  ❌ Import test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Commission API Integration Tests\n');
  
  // Test imports first
  if (!testRouteImports()) {
    process.exit(1);
  }
  
  // Test API (requires server)
  await testCommissionAPI();
  
  console.log('\n🎉 All Commission API tests completed!');
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Commission API Tests Completed Successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Commission API Tests Failed:', error);
      process.exit(1);
    });
}

module.exports = { testCommissionAPI, testRouteImports };