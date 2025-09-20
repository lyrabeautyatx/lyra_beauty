const { getDatabase } = require('../database');
const userService = require('../services/user');

// Test user registration flow
async function testUserRegistrationFlow() {
  console.log('🧪 Testing User Registration Flow...');
  
  try {
    // Initialize database
    const db = getDatabase();
    await db.connect();
    
    // Test Google OAuth profile
    const mockGoogleProfile = {
      id: 'google_test_123',
      emails: [{ value: 'test@example.com' }],
      name: {
        givenName: 'Test',
        familyName: 'User'
      }
    };
    
    console.log('✓ Database connected and ready');
    
    // Test 1: Create new user from OAuth
    console.log('\n📝 Test 1: Creating new user from OAuth...');
    const newUser = await userService.findOrCreateUser(mockGoogleProfile);
    
    if (newUser && newUser.id) {
      console.log('✓ New user created successfully');
      console.log(`  - ID: ${newUser.id}`);
      console.log(`  - Email: ${newUser.email}`);
      console.log(`  - Name: ${newUser.display_name}`);
      console.log(`  - Role: ${newUser.role}`);
      console.log(`  - Google ID: ${newUser.google_id}`);
    } else {
      throw new Error('Failed to create new user');
    }
    
    // Test 2: Verify default role assignment
    console.log('\n🔐 Test 2: Verifying default role assignment...');
    if (newUser.role === 'customer') {
      console.log('✓ Default role "customer" assigned correctly');
    } else {
      throw new Error(`Expected role "customer", got "${newUser.role}"`);
    }
    
    // Test 3: Verify user data stored in database
    console.log('\n💾 Test 3: Verifying user data stored in database...');
    const storedUser = await userService.getUserByGoogleId(mockGoogleProfile.id);
    
    if (storedUser && storedUser.google_id === mockGoogleProfile.id) {
      console.log('✓ User data stored and retrievable from database');
      console.log(`  - Stored email: ${storedUser.email}`);
      console.log(`  - Stored name: ${storedUser.display_name}`);
    } else {
      throw new Error('User data not properly stored in database');
    }
    
    // Test 4: Verify duplicate user handling
    console.log('\n👥 Test 4: Testing duplicate user handling...');
    const duplicateUser = await userService.findOrCreateUser(mockGoogleProfile);
    
    if (duplicateUser.id === newUser.id) {
      console.log('✓ Duplicate user handling works - returned existing user');
      console.log(`  - Same user ID: ${duplicateUser.id}`);
    } else {
      throw new Error('Duplicate user handling failed - created new user instead of returning existing');
    }
    
    // Test 5: Verify user permissions
    console.log('\n🔒 Test 5: Testing user permissions...');
    const permissions = userService.getUserPermissions(newUser);
    
    if (permissions && permissions.canBook !== undefined) {
      console.log('✓ User permissions system working');
      console.log(`  - Can book: ${permissions.canBook}`);
      console.log(`  - Can partner: ${permissions.canPartner}`);
      console.log(`  - Is admin: ${permissions.isAdmin}`);
    } else {
      console.log('⚠️  User permissions system not fully implemented yet');
    }
    
    console.log('\n🎉 User Registration Flow tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ New users created from OAuth callback');
    console.log('✅ Default customer role assignment working');
    console.log('✅ User data stored in database');
    console.log('✅ Duplicate user handling implemented');
    
    // Clean up - close database
    await db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testUserRegistrationFlow();
}

module.exports = { testUserRegistrationFlow };