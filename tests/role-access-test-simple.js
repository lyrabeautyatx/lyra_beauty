// Role-Based Access Control Middleware Test - Simple Version
const { 
  requireAuth, 
  requireRole, 
  requireAdmin, 
  requireCustomer, 
  requirePartner,
  blockPartnerBooking,
  requireAnyRole,
  checkPermission 
} = require('../auth/middleware/auth');
const userService = require('../services/user');

// Test user objects
const testUsers = {
  customer: { id: '1', email: 'customer@test.com', role: 'customer' },
  partner: { id: '2', email: 'partner@test.com', role: 'partner' },
  admin: { id: '3', email: 'admin@test.com', role: 'admin' }
};

// Helper to create test request/response objects
function createTestObjects(user = null) {
  let nextCalled = false;
  
  const req = {
    user,
    session: { user: user },
    headers: {},
    cookies: {},
    accepts: (type) => type === 'json'
  };
  
  const res = {
    statusCode: 200,
    body: null,
    redirectUrl: null,
    
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.body = data; return this; },
    send: function(data) { this.body = data; return this; },
    redirect: function(url) { this.redirectUrl = url; return this; }
  };
  
  const next = function() { nextCalled = true; };
  next.wasCalled = () => nextCalled;
  
  return { req, res, next };
}

async function testRequireAuth() {
  console.log('\n🔐 Testing requireAuth middleware...');
  
  // Test 1: No user should redirect to login
  const { req: req1, res: res1, next: next1 } = createTestObjects();
  req1.user = null;
  req1.session.user = null;
  
  requireAuth(req1, res1, next1);
  
  if (res1.redirectUrl === '/login') {
    console.log('✓ Unauthenticated user redirected to login');
  } else {
    throw new Error('Failed: Unauthenticated user not redirected to login');
  }
  
  // Test 2: Valid user should proceed
  const { req: req2, res: res2, next: next2 } = createTestObjects(testUsers.customer);
  
  requireAuth(req2, res2, next2);
  
  if (next2.wasCalled()) {
    console.log('✓ Authenticated user allowed to proceed');
  } else {
    throw new Error('Failed: Authenticated user not allowed to proceed');
  }
}

async function testRoleMiddleware() {
  console.log('\n👥 Testing role-specific middleware...');
  
  // Test requireCustomer with customer user
  const { req: req1, res: res1, next: next1 } = createTestObjects(testUsers.customer);
  requireCustomer(req1, res1, next1);
  
  if (next1.wasCalled()) {
    console.log('✓ Customer user allowed through requireCustomer');
  } else {
    throw new Error('Failed: Customer user blocked by requireCustomer');
  }
  
  // Test requireCustomer with partner user (should be blocked)
  const { req: req2, res: res2, next: next2 } = createTestObjects(testUsers.partner);
  requireCustomer(req2, res2, next2);
  
  if (res2.statusCode === 403) {
    console.log('✓ Partner user blocked by requireCustomer');
  } else {
    throw new Error('Failed: Partner user not blocked by requireCustomer');
  }
  
  // Test requirePartner with partner user
  const { req: req3, res: res3, next: next3 } = createTestObjects(testUsers.partner);
  requirePartner(req3, res3, next3);
  
  if (next3.wasCalled()) {
    console.log('✓ Partner user allowed through requirePartner');
  } else {
    throw new Error('Failed: Partner user blocked by requirePartner');
  }
  
  // Test admin access
  const { req: req4, res: res4, next: next4 } = createTestObjects(testUsers.admin);
  requireCustomer(req4, res4, next4);
  
  if (next4.wasCalled()) {
    console.log('✓ Admin user allowed through requireCustomer');
  } else {
    throw new Error('Failed: Admin user blocked by requireCustomer');
  }
}

async function testBusinessRules() {
  console.log('\n💼 Testing business rule enforcement...');
  
  // Test blockPartnerBooking - Partners should be blocked
  const { req: req1, res: res1, next: next1 } = createTestObjects(testUsers.partner);
  blockPartnerBooking(req1, res1, next1);
  
  if (res1.statusCode === 403 && res1.body && res1.body.error && res1.body.error.includes('Partners cannot book')) {
    console.log('✓ Partner blocked from booking appointments');
  } else {
    throw new Error('Failed: Partner not properly blocked from booking');
  }
  
  // Customer should pass
  const { req: req2, res: res2, next: next2 } = createTestObjects(testUsers.customer);
  blockPartnerBooking(req2, res2, next2);
  
  if (next2.wasCalled()) {
    console.log('✓ Customer allowed to access booking');
  } else {
    throw new Error('Failed: Customer blocked from booking');
  }
  
  // Admin should pass
  const { req: req3, res: res3, next: next3 } = createTestObjects(testUsers.admin);
  blockPartnerBooking(req3, res3, next3);
  
  if (next3.wasCalled()) {
    console.log('✓ Admin allowed to access booking');
  } else {
    throw new Error('Failed: Admin blocked from booking');
  }
}

async function testRequireAnyRole() {
  console.log('\n🎭 Testing requireAnyRole middleware...');
  
  // Test single role requirement
  const middleware1 = requireAnyRole('customer');
  const { req: req1, res: res1, next: next1 } = createTestObjects(testUsers.customer);
  
  middleware1(req1, res1, next1);
  
  if (next1.wasCalled()) {
    console.log('✓ Customer passes single role requirement');
  } else {
    throw new Error('Failed: Customer failed single role requirement');
  }
  
  // Test multiple role requirement
  const middleware2 = requireAnyRole(['customer', 'partner']);
  const { req: req2, res: res2, next: next2 } = createTestObjects(testUsers.partner);
  
  middleware2(req2, res2, next2);
  
  if (next2.wasCalled()) {
    console.log('✓ Partner passes multiple role requirement');
  } else {
    throw new Error('Failed: Partner failed multiple role requirement');
  }
  
  // Test admin access
  const middleware3 = requireAnyRole('customer');
  const { req: req3, res: res3, next: next3 } = createTestObjects(testUsers.admin);
  
  middleware3(req3, res3, next3);
  
  if (next3.wasCalled()) {
    console.log('✓ Admin passes any role requirement');
  } else {
    throw new Error('Failed: Admin failed role requirement');
  }
}

async function testCheckPermission() {
  console.log('\n🔑 Testing checkPermission middleware...');
  
  // Mock getUserPermissions for testing
  const originalGetUserPermissions = userService.getUserPermissions;
  userService.getUserPermissions = function(user) {
    if (!user) return null;
    
    const rolePermissions = {
      customer: ['book_appointments', 'view_own_appointments', 'pay_for_services'],
      partner: ['view_referral_dashboard', 'see_commission_earnings'],
      admin: ['full_system_access', 'user_management', 'book_appointments', 'view_referral_dashboard']
    };
    
    return {
      actions: rolePermissions[user.role] || []
    };
  };
  
  try {
    // Test customer permissions
    const middleware1 = checkPermission('book_appointments');
    const { req: req1, res: res1, next: next1 } = createTestObjects(testUsers.customer);
    
    middleware1(req1, res1, next1);
    
    if (next1.wasCalled()) {
      console.log('✓ Customer has book_appointments permission');
    } else {
      throw new Error('Failed: Customer lacks book_appointments permission');
    }
    
    // Test partner permissions
    const middleware2 = checkPermission('view_referral_dashboard');
    const { req: req2, res: res2, next: next2 } = createTestObjects(testUsers.partner);
    
    middleware2(req2, res2, next2);
    
    if (next2.wasCalled()) {
      console.log('✓ Partner has view_referral_dashboard permission');
    } else {
      throw new Error('Failed: Partner lacks view_referral_dashboard permission');
    }
    
    // Test permission denial
    const middleware3 = checkPermission('book_appointments');
    const { req: req3, res: res3, next: next3 } = createTestObjects(testUsers.partner);
    
    middleware3(req3, res3, next3);
    
    if (res3.statusCode === 403 && res3.body && res3.body.error === 'Permission denied') {
      console.log('✓ Partner correctly denied book_appointments permission');
    } else {
      throw new Error('Failed: Partner not properly denied permission');
    }
    
  } finally {
    // Restore original function
    userService.getUserPermissions = originalGetUserPermissions;
  }
}

// Main test runner
async function runRoleBasedAccessTests() {
  console.log('🧪 Testing Role-Based Access Control Middleware...');
  
  try {
    await testRequireAuth();
    await testRoleMiddleware();
    await testBusinessRules();
    await testRequireAnyRole();
    await testCheckPermission();
    
    console.log('\n🎉 All Role-Based Access Control tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Authentication middleware working');
    console.log('✅ Role-specific middleware enforcing access');
    console.log('✅ Business rules properly implemented');
    console.log('✅ Permission checking system functional');
    console.log('✅ Admin users have proper elevated access');
    console.log('✅ Unauthorized access properly blocked');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runRoleBasedAccessTests();
}

module.exports = { runRoleBasedAccessTests };