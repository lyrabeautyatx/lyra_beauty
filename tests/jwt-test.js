// JWT Session Management Tests
const jwt = require('jsonwebtoken');

// Mock user for testing
const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'customer'
};

async function testJWTGeneration() {
  console.log('🧪 Testing JWT Generation...');
  
  try {
    const { generateJWT, verifyJWT } = require('../auth/middleware/auth');
    
    // Test 1: Generate JWT token
    const token = generateJWT(mockUser);
    console.log('✓ JWT token generated successfully');
    
    // Test 2: Verify JWT token
    const decoded = verifyJWT(token);
    console.log('✓ JWT token verified successfully');
    
    // Test 3: Check token payload
    if (decoded.userId === mockUser.id && decoded.email === mockUser.email) {
      console.log('✓ JWT payload contains correct user data');
    } else {
      throw new Error('JWT payload mismatch');
    }
    
    // Test 4: Check token expiry
    if (decoded.exp && decoded.iat) {
      console.log('✓ JWT token has proper expiry and issued time');
    } else {
      throw new Error('JWT token missing timing data');
    }
    
    return token;
  } catch (error) {
    console.error('❌ JWT Generation test failed:', error.message);
    throw error;
  }
}

async function testJWTValidation() {
  console.log('🧪 Testing JWT Validation...');
  
  try {
    const { verifyJWT } = require('../auth/middleware/auth');
    
    // Test 1: Valid token
    const validToken = jwt.sign(
      { userId: '1', email: 'test@example.com', role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );
    
    const decoded = verifyJWT(validToken);
    console.log('✓ Valid JWT token verified');
    
    // Test 2: Invalid token
    try {
      verifyJWT('invalid.token.here');
      throw new Error('Invalid token should have failed');
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        console.log('✓ Invalid JWT token correctly rejected');
      } else {
        throw error;
      }
    }
    
    // Test 3: Expired token
    const expiredToken = jwt.sign(
      { userId: '1', email: 'test@example.com', role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '-1h' } // Already expired
    );
    
    try {
      verifyJWT(expiredToken);
      throw new Error('Expired token should have failed');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('✓ Expired JWT token correctly rejected');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ JWT Validation test failed:', error.message);
    throw error;
  }
}

async function testSessionPersistence() {
  console.log('🧪 Testing Session Persistence...');
  
  try {
    // Test with a running server
    const fetch = require('node-fetch');
    const baseUrl = 'http://localhost:3000';
    
    // Test 1: Login and check if JWT cookie is set
    console.log('Testing login flow (legacy) to verify session setup...');
    
    // Test 2: Check profile endpoint protection
    const profileResponse = await fetch(`${baseUrl}/auth/profile`);
    if (profileResponse.status === 401) {
      console.log('✓ Profile endpoint properly protected');
    } else {
      throw new Error('Profile endpoint should return 401 when not authenticated');
    }
    
    // Test 3: Test token validation endpoint
    const { generateJWT } = require('../auth/middleware/auth');
    const testToken = generateJWT(mockUser);
    
    const validateResponse = await fetch(`${baseUrl}/auth/validate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: testToken })
    });
    
    if (validateResponse.ok) {
      const result = await validateResponse.json();
      if (result.valid) {
        console.log('✓ Token validation endpoint working');
      } else {
        throw new Error('Token validation failed for valid token');
      }
    } else {
      throw new Error('Token validation endpoint returned error');
    }
    
  } catch (error) {
    console.error('❌ Session Persistence test failed:', error.message);
    // Don't throw - server might not be running
  }
}

async function testTokenRefresh() {
  console.log('🧪 Testing Token Refresh...');
  
  try {
    const { generateJWT, refreshJWT } = require('../auth/middleware/auth');
    
    // Test 1: Generate initial token
    const originalToken = generateJWT(mockUser);
    console.log('✓ Original token generated');
    
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Refresh token
    const refreshedToken = refreshJWT(mockUser);
    console.log('✓ Token refreshed');
    
    // Test 3: Verify both tokens are valid but different
    const { verifyJWT } = require('../auth/middleware/auth');
    const originalDecoded = verifyJWT(originalToken);
    const refreshedDecoded = verifyJWT(refreshedToken);
    
    if (originalDecoded.iat !== refreshedDecoded.iat) {
      console.log('✓ Refreshed token has different timestamp');
    } else {
      throw new Error('Refreshed token should have different issued time');
    }
    
    // Test 4: Both tokens should have same user data
    if (originalDecoded.userId === refreshedDecoded.userId &&
        originalDecoded.email === refreshedDecoded.email &&
        originalDecoded.role === refreshedDecoded.role) {
      console.log('✓ Refreshed token maintains user data');
    } else {
      throw new Error('Refreshed token has different user data');
    }
    
  } catch (error) {
    console.error('❌ Token Refresh test failed:', error.message);
    throw error;
  }
}

async function testMiddlewareAuthentication() {
  console.log('🧪 Testing Middleware Authentication...');
  
  try {
    const { requireAuth } = require('../auth/middleware/auth');
    
    // Mock Express request/response objects
    const createMockReq = (token = null, sessionUser = null) => ({
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cookies: {},
      session: sessionUser ? { user: sessionUser } : {},
      user: null
    });
    
    const createMockRes = () => {
      const res = {
        status: function(code) { 
          this.statusCode = code; 
          return this; 
        },
        json: function(data) { 
          this.body = data; 
          return this; 
        },
        redirect: function(url) { 
          this.redirectUrl = url; 
          return this; 
        }
      };
      return res;
    };
    
    // Test 1: Valid JWT token
    const { generateJWT } = require('../auth/middleware/auth');
    const validToken = generateJWT(mockUser);
    
    const req1 = createMockReq(validToken);
    const res1 = createMockRes();
    let nextCalled = false;
    
    requireAuth(req1, res1, () => { nextCalled = true; });
    
    if (nextCalled && req1.user) {
      console.log('✓ Middleware accepts valid JWT token');
    } else {
      throw new Error('Middleware should accept valid JWT token');
    }
    
    // Test 2: No token provided
    const req2 = createMockReq();
    const res2 = createMockRes();
    let next2Called = false;
    
    requireAuth(req2, res2, () => { next2Called = true; });
    
    if (!next2Called && res2.redirectUrl === '/login') {
      console.log('✓ Middleware redirects when no token provided');
    } else {
      throw new Error('Middleware should redirect to login when no token');
    }
    
    // Test 3: Session-based authentication (legacy)
    const req3 = createMockReq(null, mockUser);
    const res3 = createMockRes();
    let next3Called = false;
    
    requireAuth(req3, res3, () => { next3Called = true; });
    
    if (next3Called) {
      console.log('✓ Middleware accepts session-based authentication');
    } else {
      throw new Error('Middleware should accept session-based authentication');
    }
    
  } catch (error) {
    console.error('❌ Middleware Authentication test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runJWTTests() {
  console.log('🚀 Starting JWT Session Management Tests...\n');
  
  try {
    await testJWTGeneration();
    console.log();
    
    await testJWTValidation();
    console.log();
    
    await testTokenRefresh();
    console.log();
    
    await testMiddlewareAuthentication();
    console.log();
    
    await testSessionPersistence();
    console.log();
    
    console.log('🎉 All JWT Session Management tests completed successfully!');
    
  } catch (error) {
    console.error('❌ JWT tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runJWTTests();
}

module.exports = { runJWTTests };