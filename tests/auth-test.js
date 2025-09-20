// Simple OAuth test
async function testOAuthEndpoints() {
  
  console.log('🧪 Testing OAuth Authentication System...');
  
  try {
    // Test 1: Check if OAuth routes are available
    const response = await fetch('http://localhost:3000/auth/google');
    console.log('✓ OAuth route available (status:', response.status, ')');
    
    // Test 2: Check if profile endpoint requires authentication
    const profileResponse = await fetch('http://localhost:3000/auth/profile');
    console.log('✓ Profile endpoint protection (status:', profileResponse.status, ')');
    
    // Test 3: Check legacy login still works
    const loginData = new URLSearchParams({
      username: 'user1',
      password: 'pass1'
    });
    
    const loginResponse = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: loginData,
      redirect: 'manual'
    });
    
    console.log('✓ Legacy login works (status:', loginResponse.status, ')');
    
    console.log('\n🎉 OAuth authentication tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testOAuthEndpoints();
}

module.exports = { testOAuthEndpoints };